-- Esquema completo de la app. Ejecutar en Supabase: SQL Editor > New query > pegar > Run.
-- Además hay que desplegar la función supabase/functions/clientes (ver README).

-- ===== Tablas =====
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null constraint categorias_nombre_largo check (char_length(btrim(nombre)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null default '' check (char_length(codigo) <= 20), -- código del catálogo del proveedor; no es único (el catálogo repite algunos)
  nombre text not null constraint productos_nombre_largo check (char_length(btrim(nombre)) between 1 and 200),
  descripcion text not null default '' constraint productos_descripcion_largo check (char_length(descripcion) <= 500),
  precio numeric(12,2) not null default 0 check (precio >= 0),
  image_url text,
  categoria_id uuid references categorias(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Un perfil por cuenta. El usuario es un ID numérico (5 a 15 dígitos) que asigna el sistema al registrarse;
-- la contraseña la guarda Supabase Auth cifrada (bcrypt). El celular es solo un dato de contacto.
-- El correo es obligatorio al registrarse y se verifica con un código; sirve para recuperar la contraseña y el usuario.
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique check (usuario ~ '^[0-9]{5,15}$'),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 80),
  direccion text not null default '' check (char_length(direccion) <= 200),
  telefono text not null default '' check (char_length(telefono) <= 20),
  email text check (email is null or (char_length(email) <= 254 and email = lower(email))),
  email_verificado boolean not null default false,
  debe_cambiar_clave boolean not null default false, -- el admin restableció la clave: hay que elegir una nueva
  rol text not null default 'cliente' check (rol in ('cliente','admin')),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','bloqueado')),
  created_at timestamptz not null default now(),
  -- un cliente solo puede ser aprobado si verificó su correo (el admin queda exento)
  constraint perfiles_aprobado_requiere_correo check (rol = 'admin' or estado <> 'aprobado' or email_verificado)
);
create unique index if not exists perfiles_email_key on perfiles(email) where email is not null;

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente','enviado','entregado')),
  notas text not null default '' constraint pedidos_notas_largo check (char_length(notas) <= 500),
  cliente_id uuid default auth.uid() references perfiles(id) on delete set null,
  correo_enviado_at timestamptz -- cuándo la función pedido-correo envió el Excel (null = todavía no)
);
alter table pedidos add column if not exists correo_enviado_at timestamptz;

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  codigo text not null default '',
  nombre text not null,
  precio numeric(12,2) not null,
  cantidad integer not null check (cantidad > 0) constraint pedido_items_cantidad_max check (cantidad <= 9999)
);

create index if not exists productos_categoria_idx on productos(categoria_id);
create index if not exists productos_codigo_idx on productos(codigo);
create index if not exists pedidos_cliente_idx on pedidos(cliente_id);
create index if not exists pedido_items_pedido_idx on pedido_items(pedido_id);
create index if not exists pedido_items_producto_idx on pedido_items(producto_id);

-- ===== Funciones auxiliares (esquema privado, no expuesto por la API) =====
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'admin' and estado = 'aprobado'
  )
$$;

create or replace function private.es_aprobado() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and estado = 'aprobado'
  )
$$;

revoke all on function private.es_admin() from public;
revoke all on function private.es_aprobado() from public;
grant execute on function private.es_admin() to authenticated;
grant execute on function private.es_aprobado() to authenticated;

-- El nombre, el precio y el código de cada ítem los fija el servidor desde el producto: el cliente no puede alterarlos.
create or replace function private.fijar_item() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.producto_id is null then raise exception 'Falta el producto del artículo'; end if;
  select nombre, precio, codigo into p from public.productos where id = new.producto_id;
  if not found then raise exception 'El producto ya no existe'; end if;
  new.nombre := p.nombre;
  new.precio := p.precio;
  new.codigo := p.codigo;
  return new;
end $$;

drop trigger if exists pedido_items_fijar on pedido_items;
create trigger pedido_items_fijar before insert on pedido_items
  for each row execute function private.fijar_item();

-- Crea un pedido con sus artículos en una sola transacción (si algo falla no queda un pedido vacío).
-- Corre con los permisos de quien llama, así que aplican las políticas RLS y el trigger que fija nombre y precio.
create or replace function public.crear_pedido(p_notas text, p_items jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene artículos';
  end if;
  if jsonb_array_length(p_items) > 300 then
    raise exception 'El pedido tiene demasiados artículos';
  end if;

  insert into public.pedidos (notas) values (left(coalesce(p_notas, ''), 500)) returning id into v_id;

  insert into public.pedido_items (pedido_id, producto_id, nombre, precio, cantidad)
  select v_id, (i ->> 'producto_id')::uuid, '', 0, (i ->> 'cantidad')::integer
  from jsonb_array_elements(p_items) as i;

  return v_id;
end
$$;
revoke execute on function public.crear_pedido(text, jsonb) from public, anon;
grant execute on function public.crear_pedido(text, jsonb) to authenticated;

-- ===== Seguridad (RLS) =====
alter table categorias enable row level security;
alter table productos enable row level security;
alter table perfiles enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

-- perfiles: cada uno ve el suyo; el admin ve y modifica todos. Las altas las hace la función "clientes".
create policy "perfiles: ver" on perfiles for select to authenticated
  using (id = (select auth.uid()) or (select private.es_admin()));
create policy "perfiles: admin modifica" on perfiles for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- catálogo: lo ve quien está aprobado; solo el admin lo modifica
create policy "categorias: ver" on categorias for select to authenticated using ((select private.es_aprobado()));
create policy "categorias: crear" on categorias for insert to authenticated with check ((select private.es_admin()));
create policy "categorias: editar" on categorias for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "categorias: borrar" on categorias for delete to authenticated using ((select private.es_admin()));

create policy "productos: ver" on productos for select to authenticated using ((select private.es_aprobado()));
create policy "productos: crear" on productos for insert to authenticated with check ((select private.es_admin()));
create policy "productos: editar" on productos for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "productos: borrar" on productos for delete to authenticated using ((select private.es_admin()));

-- pedidos: cada cliente ve y crea solo los suyos; el admin gestiona todos
create policy "pedidos: ver" on pedidos for select to authenticated
  using ((cliente_id = (select auth.uid()) and (select private.es_aprobado())) or (select private.es_admin()));
create policy "pedidos: crear" on pedidos for insert to authenticated
  with check (cliente_id = (select auth.uid()) and estado = 'pendiente' and (select private.es_aprobado()));
create policy "pedidos: admin edita" on pedidos for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "pedidos: admin borra" on pedidos for delete to authenticated
  using ((select private.es_admin()));

create policy "items: ver" on pedido_items for select to authenticated
  using (exists (select 1 from pedidos p where p.id = pedido_items.pedido_id));
create policy "items: crear" on pedido_items for insert to authenticated
  with check (exists (select 1 from pedidos p where p.id = pedido_items.pedido_id and p.estado = 'pendiente'));
create policy "items: admin edita" on pedido_items for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "items: admin borra" on pedido_items for delete to authenticated
  using ((select private.es_admin()));

-- ===== Fotos de productos =====
-- Bucket público: las fotos se ven por URL. Solo el admin sube o borra.
-- Máximo 2 MB por foto y solo JPG, PNG o WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('productos', 'productos', true, 2097152, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "fotos: admin sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (select private.es_admin()));
create policy "fotos: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (select private.es_admin()));

-- ===== Correos: códigos de verificación y límites de envío =====
-- Registro de cada correo enviado (códigos y avisos). De los códigos solo se guarda su hash. Sirve para validar los
-- códigos (vencen a los 15 minutos, 5 intentos) y para limitar los envíos por correo, por conexión y por día.
-- Sin políticas RLS: únicamente la función "clientes" (service role) accede a esta tabla.
create table if not exists envios_correo (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  perfil_id uuid references perfiles(id) on delete set null,
  tipo text not null check (tipo in ('registro', 'recuperacion', 'usuario', 'aviso')),
  codigo_hash text,
  salt text,
  intentos integer not null default 0,
  expira timestamptz,
  usado boolean not null default false,
  enviado boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists envios_correo_email_idx on envios_correo(email, created_at desc);
create index if not exists envios_correo_ip_idx on envios_correo(ip_hash, created_at desc);
create index if not exists envios_correo_fecha_idx on envios_correo(created_at);
alter table envios_correo enable row level security;
revoke all on envios_correo from anon, authenticated;

-- Suma un intento al código y devuelve el total (atómico: varios intentos en paralelo se cuentan todos).
create or replace function public.codigo_intento(p uuid) returns integer
language sql security definer set search_path = '' as $$
  update public.envios_correo set intentos = intentos + 1 where id = p returning intentos
$$;
revoke execute on function public.codigo_intento(uuid) from public, anon, authenticated;
grant execute on function public.codigo_intento(uuid) to service_role;

-- ===== Permisos de tabla (defensa en profundidad, además de RLS) =====
-- El rol anon no necesita tocar ninguna tabla: la app solo lee y escribe con sesión iniciada (authenticated) y la
-- función clientes usa la clave de servicio. Los usuarios con sesión tampoco necesitan TRUNCATE (ignora RLS),
-- disparadores ni referencias.
revoke all on categorias, productos, perfiles, pedidos, pedido_items from anon;
revoke truncate, trigger, references on categorias, productos, perfiles, pedidos, pedido_items from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
-- La función de disparo solo la ejecuta el motor.
revoke execute on function private.fijar_item() from public, anon, authenticated;

-- ===== Primer administrador =====
-- 1) Crea tu cuenta desde la app (pantalla «Crear cuenta») y verifica tu correo con el código que te llega.
-- 2) La app te muestra tu usuario (ID de 6 dígitos). Ejecuta esto con ese ID para convertirte en admin:
--    update perfiles set rol = 'admin', estado = 'aprobado' where usuario = 'TU_ID';
