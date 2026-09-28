-- Actividad de todos los negocios en UNA consulta, para el SuperAdmin.
-- Ejecutar una vez en el SQL Editor. Deshacer:
--   drop function if exists public.admin_actividad_negocios();
--
-- POR QUE (28-09-2026)
-- Al abrir, el panel bajaba la tabla reservas ENTERA (miles de filas, cortada
-- sin avisar a las 25.000), mas servicios, horarios, profesionales y
-- asignaciones completos, y algunas de esas cosas dos veces. Con internet de
-- Cuba eso son megas cada vez. Esta funcion hace las cuentas dentro de la base
-- y devuelve una fila por negocio (~400 filas).
--
-- Mientras no exista, el panel sigue usando la carga de antes.
--
-- "Hoy" es el dia de La Habana. Una cita cancelada no cuenta como ultima ni
-- proxima cita (mismo criterio que commercial-tracking.js).

create or replace function public.admin_actividad_negocios()
returns table (
  negocio_id uuid,
  configurado boolean,
  updated_at timestamptz,
  provincia text,
  municipio text,
  es_tienda_externa boolean,
  reservas_total integer,
  reservas_ultima_creada timestamptz,
  reservas_hoy integer,
  reservas_7d integer,
  reservas_28 integer,
  reservas_30 integer,
  reservas_90 integer,
  ultima_cita date,
  proxima_cita date,
  citas_futuras integer,
  profesionales integer,
  profesionales_ultima timestamptz,
  servicios integer,
  servicios_ultima timestamptz,
  servicios_sin_profesional integer,
  horarios integer,
  horarios_con_dias integer,
  horarios_ultima timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select (now() at time zone 'America/Havana')::date as hoy
  ),
  res as (
    select
      r.negocio_id,
      count(*)::int as total,
      max(r.created_at)::timestamptz as ultima_creada,
      count(*) filter (where r.created_at >= (p.hoy::timestamp at time zone 'America/Havana'))::int as hoy,
      -- Igual que antes en el panel: citas con fecha en los ultimos 7 dias.
      count(*) filter (where r.fecha between p.hoy - 6 and p.hoy)::int as d7,
      count(*) filter (where r.created_at >= now() - interval '28 days')::int as d28,
      count(*) filter (where r.created_at >= now() - interval '30 days')::int as d30,
      count(*) filter (where r.created_at >= now() - interval '90 days')::int as d90,
      max(r.fecha) filter (where r.fecha < p.hoy and not r.cancelada) as ultima,
      min(r.fecha) filter (where r.fecha >= p.hoy and not r.cancelada) as proxima,
      count(*) filter (where r.fecha >= p.hoy and not r.cancelada)::int as futuras
    from (
      select x.negocio_id, x.created_at, x.fecha,
             lower(trim(coalesce(x.estado::text, ''))) in ('cancelada', 'cancelado', 'cancelled') as cancelada
      from public.reservas x
    ) r
    cross join p
    group by r.negocio_id
  ),
  pro as (
    select x.negocio_id, count(*)::int as total, max(x.created_at)::timestamptz as ultima
    from public.profesionales x
    where x.activo = true
    group by x.negocio_id
  ),
  ser as (
    select
      s.negocio_id,
      count(*)::int as total,
      max(s.created_at)::timestamptz as ultima,
      -- Servicios que ningun profesional puede dar: la clienta los ve pero no
      -- puede reservarlos.
      count(*) filter (where not exists (
        select 1 from public.servicios_profesionales sp
        where sp.servicio_id = s.id and sp.negocio_id = s.negocio_id
      ))::int as sin_prof
    from public.servicios s
    where s.activo = true
    group by s.negocio_id
  ),
  hor as (
    select
      h.negocio_id,
      -- commercial-tracking.js cuenta un horario sin "dias" como horario...
      count(*) filter (where case when jsonb_typeof(to_jsonb(h.dias)) = 'array'
                                  then jsonb_array_length(to_jsonb(h.dias)) > 0
                                  else true end)::int as total,
      -- ...y "Salones que necesitan ayuda" solo el que tiene algun dia.
      count(*) filter (where case when jsonb_typeof(to_jsonb(h.dias)) = 'array'
                                  then jsonb_array_length(to_jsonb(h.dias)) > 0
                                  else false end)::int as con_dias,
      max(h.created_at)::timestamptz as ultima
    from public.horarios_profesionales h
    group by h.negocio_id
  )
  select
    n.id,
    n.configurado,
    n.updated_at::timestamptz,
    n.provincia::text,
    n.municipio::text,
    coalesce(n.es_tienda_externa, false),
    coalesce(res.total, 0),
    res.ultima_creada,
    coalesce(res.hoy, 0),
    coalesce(res.d7, 0),
    coalesce(res.d28, 0),
    coalesce(res.d30, 0),
    coalesce(res.d90, 0),
    res.ultima,
    res.proxima,
    coalesce(res.futuras, 0),
    coalesce(pro.total, 0),
    pro.ultima,
    coalesce(ser.total, 0),
    ser.ultima,
    coalesce(ser.sin_prof, 0),
    coalesce(hor.total, 0),
    coalesce(hor.con_dias, 0),
    hor.ultima
  from public.negocios n
  left join res on res.negocio_id = n.id
  left join pro on pro.negocio_id = n.id
  left join ser on ser.negocio_id = n.id
  left join hor on hor.negocio_id = n.id
  -- Solo la cuenta del SuperAdmin; cualquier otra recibe cero filas.
  where lower(coalesce(auth.jwt() ->> 'email', '')) = 'rservasroma@gmail.com';
$$;

revoke all on function public.admin_actividad_negocios() from public, anon;
grant execute on function public.admin_actividad_negocios() to authenticated;

-- COMPROBACION (en el SQL Editor no hay sesion, asi que se simula la del
-- SuperAdmin dentro de una transaccion que no cambia nada). Tiene que salir
-- una fila por negocio; mira que las cifras de un salon que conozcas cuadren.
--
-- begin;
-- set local "request.jwt.claims" = '{"email":"rservasroma@gmail.com","role":"authenticated"}';
-- select count(*) as negocios, sum(reservas_total) as reservas, sum(reservas_hoy) as sacadas_hoy
-- from public.admin_actividad_negocios();
-- rollback;
