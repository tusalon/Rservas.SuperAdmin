-- Deshace sql-proteger-negocios.sql (quita el trigger). No toca datos.
-- La politica vieja de tu@email.com no se vuelve a crear: no servia para nada.
drop trigger if exists negocios_proteger_campos on public.negocios;
drop function if exists public.negocios_proteger_campos();
