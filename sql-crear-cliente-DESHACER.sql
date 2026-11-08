-- Deshace sql-crear-cliente.sql: quita las tres funciones.
-- No toca ningun salon ya creado con ellas.
drop function if exists public.crear_cliente(text, text, text, text, text, text, uuid);
drop function if exists public.solicitudes_alta_pendientes();
drop function if exists public.solicitud_alta_descartar(uuid);
