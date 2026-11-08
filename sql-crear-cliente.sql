-- Crear un salon nuevo desde el SuperAdmin (movil o PC), sin C:\ClientesAutomation.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
--
-- QUE HACE crear_cliente()
-- Todo en UNA transaccion (si algo falla no queda un salon a medias):
--   1. negocios        -> el salon, SIN configurar (configurado = false): al entrar,
--                         su dueña ve el asistente y elige sus propios servicios.
--                         No se crean "Servicio de prueba" ni "Profesional Principal".
--   2. configuracion   -> una fila con los valores por defecto.
--   3. categorias_servicios -> las 7 categorias base (Manicura, Pedicura, ...).
--   4. suscripciones   -> la crea solo el trigger on_negocio_created.
--   5. solicitudes_alta -> si viene de una solicitud de la web, la marca como creada.
-- La contraseña se guarda como hash bcrypt de coste 12 ($2a$12$), igual que los
-- demas salones, y la funcion NUNCA la devuelve.
--
-- DIFERENCIAS CON EL SCRIPT DE LA PC (medidas el 07-11-2026)
--   * Si el correo o el slug ya existen, el script ACTUALIZABA ese salon (nombre,
--     telefono y contraseña) sin avisar. Aqui se rechaza y se devuelve el salon
--     existente para que se vea de quien es.
--   * Guarda codigo_pais (el script solo quitaba prefijos y la base ponia 53).
--   * ntfy_topic se deja al valor por defecto de la base (negocio_ + 8 al azar):
--     el script lo igualaba al slug y ntfy.sh es publico.
--
-- QUIEN PUEDE LLAMARLA: solo la cuenta del SuperAdmin (rol authenticated y email
-- rservasroma@gmail.com, comprobado dentro), igual que reiniciar_negocio().
-- A "anon" no se le concede a proposito: es la clave que viaja publica.
-- Deshacer: sql-crear-cliente-DESHACER.sql.

create or replace function public.crear_cliente(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_password text,
  p_codigo_pais text default '53',
  p_slug text default null,
  p_solicitud_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_codigo text := regexp_replace(coalesce(p_codigo_pais, ''), '\D', '', 'g');
  v_tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_largo_nacional int;
  v_slug text;
  v_base text;
  v_n int := 1;
  v_id uuid := gen_random_uuid();
  v_existente record;
  v_categorias jsonb := '[
    {"nombre":"Manicura","slug":"manicura","icono":"💅","orden":1},
    {"nombre":"Pedicura","slug":"pedicura","icono":"🦶","orden":2},
    {"nombre":"Faciales","slug":"faciales","icono":"✨","orden":3},
    {"nombre":"Barbería","slug":"barberia","icono":"💈","orden":4},
    {"nombre":"Cejas","slug":"cejas","icono":"👁️","orden":5},
    {"nombre":"Combos","slug":"combos","icono":"🎁","orden":6},
    {"nombre":"Otros","slug":"otros","icono":"⭐","orden":99}
  ]'::jsonb;
begin
  -- Solo la cuenta del SuperAdmin. "authenticated" no basta (ver reiniciar_negocio).
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'rservasroma@gmail.com' then
    raise exception 'Solo el SuperAdmin puede crear salones' using errcode = '42501';
  end if;

  -- ---- Validaciones: se devuelven como motivo para que la pantalla las explique.
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 80 then
    return jsonb_build_object('ok', false, 'motivo', 'nombre_invalido');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'email_invalido');
  end if;
  if char_length(coalesce(p_password, '')) < 6 or char_length(p_password) > 72 then
    -- 72 es el limite de bcrypt: mas alla, los caracteres sobrantes se ignoran.
    return jsonb_build_object('ok', false, 'motivo', 'password_invalida');
  end if;
  if v_codigo = '' or char_length(v_codigo) > 4 then
    return jsonb_build_object('ok', false, 'motivo', 'codigo_pais_invalido');
  end if;

  -- Telefono: se guarda sin el prefijo del pais (asi estan los 489 salones).
  -- Solo se quita cuando el largo confirma que el prefijo viene incluido.
  v_largo_nacional := case v_codigo when '53' then 8 when '1' then 10 when '34' then 9 when '52' then 10 else null end;
  if v_largo_nacional is not null
     and v_tel like v_codigo || '%'
     and char_length(v_tel) = char_length(v_codigo) + v_largo_nacional then
    v_tel := substr(v_tel, char_length(v_codigo) + 1);
  end if;
  if char_length(v_tel) < 7 or char_length(v_tel) > 15 then
    return jsonb_build_object('ok', false, 'motivo', 'telefono_invalido');
  end if;

  -- ---- Correo repetido: NO se actualiza el salon existente; se devuelve para verlo.
  select id, nombre, slug, telefono, fecha_registro into v_existente
  from public.negocios where lower(email) = v_email limit 1;
  if found then
    return jsonb_build_object('ok', false, 'motivo', 'email_existe',
      'existente', jsonb_build_object('id', v_existente.id, 'nombre', v_existente.nombre,
        'slug', v_existente.slug, 'telefono', v_existente.telefono, 'fecha_registro', v_existente.fecha_registro));
  end if;

  -- ---- Slug: el pedido tal cual (si choca, error) o uno sacado del nombre (-2, -3...).
  if nullif(btrim(coalesce(p_slug, '')), '') is not null then
    v_slug := lower(btrim(p_slug));
    if v_slug !~ '^[a-z0-9][a-z0-9_-]{1,39}$' then
      return jsonb_build_object('ok', false, 'motivo', 'slug_invalido');
    end if;
    if exists (select 1 from public.negocios where lower(slug) = v_slug) then
      return jsonb_build_object('ok', false, 'motivo', 'slug_existe');
    end if;
  else
    v_base := lower(translate(v_nombre, 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'));
    v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
    v_base := btrim(left(btrim(v_base, '-'), 36), '-');
    if char_length(v_base) < 2 then v_base := 'salon'; end if;
    v_slug := v_base;
    while exists (select 1 from public.negocios where lower(slug) = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;
  end if;

  -- ---- El salon. configurado = false activa el asistente de configuracion.
  insert into public.negocios (
    id, nombre, telefono, email, slug, plan, password_hash, configurado, codigo_pais,
    requiere_anticipo, tipo_anticipo, tiempo_vencimiento
  ) values (
    v_id, v_nombre, v_tel, v_email, v_slug, 'emprendedor',
    extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
    false, v_codigo, false, 'fijo', 2
  );

  insert into public.configuracion (negocio_id, duracion_turnos, max_antelacion_dias)
  values (v_id, 60, 30);

  insert into public.categorias_servicios (negocio_id, nombre, slug, icono, orden, activo)
  select v_id, c ->> 'nombre', c ->> 'slug', c ->> 'icono', (c ->> 'orden')::int, true
  from jsonb_array_elements(v_categorias) c;

  -- ---- Si venia de una solicitud de la web, queda atendida en la misma transaccion.
  if p_solicitud_id is not null then
    update public.solicitudes_alta
       set estado = 'creado', slug_creado = v_slug, atendida_at = now()
     where id = p_solicitud_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'negocio_id', v_id,
    'slug', v_slug,
    'nombre', v_nombre,
    'email', v_email,
    'telefono', v_tel,
    'codigo_pais', v_codigo,
    'enlace_clientas', 'https://tusalon.github.io/rservasroma/?s=' || v_slug,
    'enlace_panel', 'https://tusalon.github.io/rservasroma/admin.html?s=' || v_slug
  );
exception
  -- Dos altas a la vez con el mismo correo o slug: gana una, la otra recibe el motivo.
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'duplicado_simultaneo');
end;
$$;

revoke all on function public.crear_cliente(text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.crear_cliente(text, text, text, text, text, text, uuid) to authenticated;

comment on function public.crear_cliente(text, text, text, text, text, text, uuid) is
'Crea un salon nuevo sin configurar (asistente), con su configuracion y categorias base, y marca la solicitud como creada. Rechaza correo o slug repetido. Solo la cuenta rservasroma@gmail.com.';


-- ---------------------------------------------------------------------------
-- Solicitudes que llegan por el formulario de la web (tabla solicitudes_alta).
-- La tabla esta cerrada para la clave publica (guarda telefonos y correos de
-- interesadas); solo service_role la lee. El SuperAdmin entra como authenticated,
-- asi que necesita estas dos puertas, con la misma comprobacion de correo.
-- ---------------------------------------------------------------------------
create or replace function public.solicitudes_alta_pendientes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'rservasroma@gmail.com' then
    raise exception 'Solo el SuperAdmin puede ver las solicitudes' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id, 'nombre_salon', nombre_salon, 'whatsapp', whatsapp, 'email', email,
      'plataforma', plataforma, 'nota', nota, 'origen', origen, 'created_at', created_at)
      order by created_at desc)
    from public.solicitudes_alta where estado = 'pendiente'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.solicitud_alta_descartar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'rservasroma@gmail.com' then
    raise exception 'Solo el SuperAdmin puede descartar solicitudes' using errcode = '42501';
  end if;
  update public.solicitudes_alta set estado = 'descartado', atendida_at = now()
   where id = p_id and estado = 'pendiente';
end;
$$;

revoke all on function public.solicitudes_alta_pendientes() from public, anon;
revoke all on function public.solicitud_alta_descartar(uuid) from public, anon;
grant execute on function public.solicitudes_alta_pendientes() to authenticated;
grant execute on function public.solicitud_alta_descartar(uuid) to authenticated;
