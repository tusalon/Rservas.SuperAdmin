-- Deshace sql-crecimiento-comercial.sql.
-- OJO: borra el historial de contactos y las marcas/referidos guardados.
-- Deja admin_actividad_negocios como la de sql-admin-actividad-negocios.sql:
-- despues de esto, vuelve a correr ese archivo.
drop table if exists public.contactos_comerciales;
alter table public.seguimiento_comercial_negocios
    drop column if exists marcado,
    drop column if exists oculto,
    drop column if exists referido_por,
    drop column if exists testimonio,
    drop column if exists ultima_plantilla;
drop function if exists public.admin_actividad_negocios();
