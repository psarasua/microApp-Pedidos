-- Ejecutar en Supabase: SQL Editor > New query > pegar > Run

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text not null default '',
  precio numeric(12,2) not null default 0 check (precio >= 0),
  image_url text,
  categoria_id uuid references categorias(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente','enviado','entregado')),
  notas text not null default ''
);

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  nombre text not null,
  precio numeric(12,2) not null,
  cantidad integer not null check (cantidad > 0)
);

create index if not exists productos_categoria_idx on productos(categoria_id);
create index if not exists pedido_items_pedido_idx on pedido_items(pedido_id);
create index if not exists pedido_items_producto_idx on pedido_items(producto_id);

-- Seguridad (RLS). Por ahora cualquiera con la clave "anon" puede leer y escribir:
-- sirve para una app de uso interno. Antes de publicarla abiertamente, agrega
-- autenticación y reemplaza estas políticas por otras que exijan usuario (auth.uid()).
alter table categorias enable row level security;
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

create policy "acceso total categorias" on categorias for all using (true) with check (true);
create policy "acceso total productos" on productos for all using (true) with check (true);
create policy "acceso total pedidos" on pedidos for all using (true) with check (true);
create policy "acceso total pedido_items" on pedido_items for all using (true) with check (true);

-- Fotos de productos
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
  on conflict (id) do nothing;

-- El bucket es público: las fotos se ven por URL sin política de lectura (así no se puede listar todo el bucket).
create policy "fotos subir" on storage.objects for insert with check (bucket_id = 'productos');
create policy "fotos borrar" on storage.objects for delete using (bucket_id = 'productos');
