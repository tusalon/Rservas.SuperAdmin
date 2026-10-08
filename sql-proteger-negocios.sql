-- Proteger los campos delicados de negocios.
-- Probado en produccion el 28-09-2026. Deshacer: sql-proteger-negocios-DESHACER.sql
--
-- POR QUE
-- sql-revisar-permisos-panel.sql mostro que negocios tiene politicas de UPDATE
-- e INSERT con "true" para todos, incluida la clave publica (anon), que viaja
-- dentro de todas las apps. Con ella cualquiera podia:
--   * cambiar el password_hash de cualquier salon y entrar a su panel;
--   * aprobar su propia tienda en RomaHub (romahub_estado = 'aprobada');
--   * archivar o desarchivar salones, o convertirlos en tienda externa.
-- Las apps de los salones actualizan su ficha con esa misma clave (nombre,
-- colores...), asi que quitar la politica las romperia. En vez de eso, este
-- trigger deja pasar todo MENOS esos campos, que solo cambian el SuperAdmin,
-- el service_role (automatizacion y funciones) y el SQL Editor.
--
-- Ni RservasRoma ni el SuperAdmin escriben esos campos con la clave publica
-- (revisado el 28-09-2026). La duena de una tienda si pasa su tienda de
-- 'borrador' a 'en_revision': eso se sigue permitiendo.
--
-- CUMPLEAÑOS (07-10-2026): esta misma funcion tambien protege las columnas de
-- cumpleanos que crea rservasroma/sql-cumpleanos.sql: cumple_descuento_anio
-- solo lo escribe el SuperAdmin y el cumpleanos de la duena queda fijo una vez
-- puesto. Si las columnas no existen, esas reglas no hacen nada. NO borres
-- estas reglas al actualizar este archivo: el trigger es uno solo.
--
-- LO QUE NO CUBRE (necesita que los salones entren con Supabase Auth):
--   * nombre, telefono y demas datos publicos se pueden cambiar con anon;
--   * password_hash se puede LEER con anon (admin-login.html compara en el
--     navegador);
--   * con anon se puede insertar un "salon" (no tienda) que salga en RomaHub.

create or replace function public.negocios_proteger_campos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_nuevo jsonb := to_jsonb(new);
  v_viejo jsonb;
  v_col text;
begin
  -- Sin JWT (SQL Editor), service_role o la cuenta del SuperAdmin: sin limites.
  if v_claims is null
     or v_claims ->> 'role' = 'service_role'
     or lower(coalesce(v_claims ->> 'email', '')) = 'rservasroma@gmail.com' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Una tienda nueva nunca nace publicada: pasa por la revision del panel.
    if v_nuevo ->> 'es_tienda_externa' = 'true'
       and coalesce(v_nuevo ->> 'romahub_estado', '') not in ('borrador', 'en_revision') then
      new := jsonb_populate_record(new, jsonb_build_object('romahub_estado', 'borrador'));
    end if;
    -- Nadie se auto-concede el descuento de cumpleanos al crear el negocio.
    -- (Con jsonb: si la columna aun no existe, simplemente no hace nada.)
    new := jsonb_populate_record(new, jsonb_build_object('cumple_descuento_anio', null));
    return new;
  end if;

  -- Se compara como jsonb para no fallar si alguna columna aun no existe.
  v_viejo := to_jsonb(old);
  foreach v_col in array array['password_hash', 'es_tienda_externa', 'archivado', 'archivado_at', 'cumple_descuento_anio'] loop
    if v_nuevo -> v_col is distinct from v_viejo -> v_col then
      raise exception 'No se puede cambiar % de un negocio desde la app', v_col
        using errcode = '42501';
    end if;
  end loop;

  -- El cumpleanos de la duena se puede poner una vez; despues solo el SuperAdmin.
  if v_viejo ->> 'cumple_admin_mes' is not null
     and (v_nuevo -> 'cumple_admin_mes' is distinct from v_viejo -> 'cumple_admin_mes'
          or v_nuevo -> 'cumple_admin_dia' is distinct from v_viejo -> 'cumple_admin_dia') then
    raise exception 'El cumpleanos ya esta guardado: pide a soporte que lo cambie'
      using errcode = '42501';
  end if;

  if v_nuevo -> 'romahub_estado' is distinct from v_viejo -> 'romahub_estado'
     and coalesce(v_nuevo ->> 'romahub_estado', '') not in ('borrador', 'en_revision') then
    raise exception 'Solo el SuperAdmin aprueba o rechaza tiendas de RomaHub'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists negocios_proteger_campos on public.negocios;
create trigger negocios_proteger_campos
  before insert or update on public.negocios
  for each row execute function public.negocios_proteger_campos();

-- Politica vieja de plantilla: daba TODO sobre suscripciones a quien se
-- registrara como tu@email.com. El SuperAdmin ya tiene sus propias politicas.
drop policy if exists "Super admin ve todas las suscripciones" on public.suscripciones;

-- COMPROBACION (correr aparte): simula la clave publica cambiando una
-- contrasena. Tiene que terminar en ERROR "No se puede cambiar password_hash
-- de un negocio desde la app": ese error ES el resultado bueno. Se deshace
-- con el rollback, no cambia nada. Resultado el 28-09-2026: el error esperado.
--
-- begin;
-- set local role anon;
-- set local "request.jwt.claims" = '{"role":"anon"}';
-- update public.negocios
-- set password_hash = coalesce(password_hash, '') || 'x'
-- where id = (select id from public.negocios limit 1);
-- rollback;
