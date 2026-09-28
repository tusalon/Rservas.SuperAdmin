-- Revisar quien puede escribir en las tablas que toca el SuperAdmin.
-- SOLO LECTURA: no cambia nada. Ejecutar en el SQL Editor y mirar el resultado.
--
-- POR QUE (27-09-2026)
-- El panel escribe directo en negocios (password_hash, archivado,
-- romahub_estado), suscripciones y soporte_tickets. Los salones usan la clave
-- publica (rol anon). Si anon tiene UPDATE sobre negocios sin una politica que
-- lo limite, cualquiera con esa clave podria cambiar la contrasena de
-- cualquier salon. Desde el codigo del panel no se puede saber: hay que verlo
-- en la base.
--
-- QUE BUSCAR EN EL RESULTADO
--   * Filas con rol anon y UPDATE/DELETE en negocios o suscripciones: riesgo.
--   * rls_activo = false en cualquiera de las tres tablas: riesgo.
--   * Politicas con qual = 'true' para anon en UPDATE/DELETE: riesgo.

-- 1) RLS activado o no
select c.relname as tabla, c.relrowsecurity as rls_activo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('negocios', 'suscripciones', 'soporte_tickets')
order by 1;

-- 2) Permisos de escritura por rol
select table_name as tabla, grantee as rol, string_agg(privilege_type, ', ' order by privilege_type) as permisos
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('negocios', 'suscripciones', 'soporte_tickets')
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
group by 1, 2
order by 1, 2;

-- 3) Politicas de escritura
select tablename as tabla, policyname as politica, cmd as accion, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('negocios', 'suscripciones', 'soporte_tickets')
  and cmd in ('UPDATE', 'DELETE', 'INSERT', 'ALL')
order by 1, 3, 2;
