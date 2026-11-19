-- Migración para una base que ya existe (schema.sql es el esquema completo para una base nueva).
-- Pegar en Supabase: SQL Editor > New query > Run. Se puede ejecutar más de una vez.
--
-- Un cliente podía enviar created_at y correo_enviado_at en un INSERT directo a la API (falsificar la fecha del pedido
-- o marcar el correo como ya enviado). Ahora el trigger que ya existe los fija siempre en el servidor.

create or replace function private.fijar_pedido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.codigo_cliente := (select codigo_cliente from public.perfiles where id = new.cliente_id);
  new.created_at := now();
  new.correo_enviado_at := null;
  return new;
end $$;
