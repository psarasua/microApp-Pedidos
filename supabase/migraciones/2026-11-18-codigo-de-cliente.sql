-- Migración para una base que ya existe (schema.sql es el esquema completo para una base nueva).
-- Pegar en Supabase: SQL Editor > New query > Run. Se puede ejecutar más de una vez.
--
-- 1) Código y nombre de cliente en perfiles: solo los asigna el admin y sin ellos no se puede pedir.
-- 2) Cada pedido guarda el código de cliente del momento (lo copia un trigger; el navegador no lo decide).

alter table public.perfiles add column if not exists codigo_cliente text check (codigo_cliente ~ '^[0-9]{1,10}$');
alter table public.perfiles add column if not exists nombre_cliente text check (char_length(btrim(nombre_cliente)) between 2 and 80);
create unique index if not exists perfiles_codigo_cliente_key on public.perfiles(codigo_cliente) where codigo_cliente is not null;

alter table public.pedidos add column if not exists codigo_cliente text;

create or replace function private.puede_pedir() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and estado = 'aprobado'
      and codigo_cliente is not null and btrim(coalesce(nombre_cliente, '')) <> ''
  )
$$;
revoke all on function private.puede_pedir() from public;
grant execute on function private.puede_pedir() to authenticated;

create or replace function private.fijar_pedido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.codigo_cliente := (select codigo_cliente from public.perfiles where id = new.cliente_id);
  return new;
end $$;
revoke execute on function private.fijar_pedido() from public, anon, authenticated;
drop trigger if exists pedidos_fijar_codigo on public.pedidos;
create trigger pedidos_fijar_codigo before insert on public.pedidos
  for each row execute function private.fijar_pedido();

-- Crear pedidos exige cuenta aprobada Y código y nombre de cliente.
drop policy if exists "pedidos: crear" on public.pedidos;
create policy "pedidos: crear" on public.pedidos for insert to authenticated
  with check (cliente_id = (select auth.uid()) and estado = 'pendiente' and (select private.puede_pedir()));
