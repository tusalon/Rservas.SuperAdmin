-- Fase 4 del SuperAdmin: historial de contactos, marcas sincronizadas,
-- referidos y datos para las alertas. Ejecutar una vez en el SQL Editor.
-- Deshacer: sql-crecimiento-comercial-DESHACER.sql
--
-- POR QUE (28-09-2026)
--   * El clic en WhatsApp solo quedaba en el navegador (localStorage): no
--     habia historial y en el movil no se veia lo hecho en el PC.
--   * "Marcados" y "Ocultos" tambien vivian solo en ese navegador.
--   * Para avisar cuando un salon baja su actividad hace falta comparar su
--     semana con sus semanas anteriores, y para saber quien usa Finanzas hay
--     que mirar sus cobros. Eso se anade a admin_actividad_negocios.
--
-- Nada de esto guarda datos de clientas.

-- 1) Campos nuevos en el seguimiento de cada salon
alter table public.seguimiento_comercial_negocios
    add column if not exists marcado boolean not null default false,
    add column if not exists oculto boolean not null default false,
    add column if not exists referido_por text,
    add column if not exists testimonio boolean not null default false,
    add column if not exists ultima_plantilla text;

-- 2) Historial: una fila por cada vez que se le escribe a un salon
create table if not exists public.contactos_comerciales (
    id bigint generated always as identity primary key,
    negocio_id uuid not null references public.negocios(id) on delete cascade,
    canal text not null default 'whatsapp' check (canal in ('whatsapp', 'notificacion', 'llamada', 'otro')),
    plantilla text,
    nota text,
    created_at timestamptz not null default now()
);

create index if not exists contactos_comerciales_negocio_idx
    on public.contactos_comerciales (negocio_id, created_at desc);

alter table public.contactos_comerciales enable row level security;

drop policy if exists "SuperAdmin lee contactos" on public.contactos_comerciales;
create policy "SuperAdmin lee contactos"
    on public.contactos_comerciales for select to authenticated
    using ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com');

drop policy if exists "SuperAdmin crea contactos" on public.contactos_comerciales;
create policy "SuperAdmin crea contactos"
    on public.contactos_comerciales for insert to authenticated
    with check ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com');

drop policy if exists "SuperAdmin borra contactos" on public.contactos_comerciales;
create policy "SuperAdmin borra contactos"
    on public.contactos_comerciales for delete to authenticated
    using ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com');

revoke all on table public.contactos_comerciales from anon;
grant select, insert, delete on table public.contactos_comerciales to authenticated;

-- 3) admin_actividad_negocios con tres columnas mas. Cambia lo que devuelve,
-- asi que hay que borrarla y crearla otra vez (el panel aguanta sin ella los
-- segundos que tarda: vuelve a la carga de antes).
drop function if exists public.admin_actividad_negocios();

create function public.admin_actividad_negocios()
returns table (
  negocio_id uuid, configurado boolean, updated_at timestamptz, provincia text, municipio text,
  es_tienda_externa boolean, reservas_total integer, reservas_ultima_creada timestamptz,
  reservas_hoy integer, reservas_7d integer, reservas_28 integer, reservas_30 integer, reservas_90 integer,
  ultima_cita date, proxima_cita date, citas_futuras integer,
  profesionales integer, profesionales_ultima timestamptz,
  servicios integer, servicios_ultima timestamptz, servicios_sin_profesional integer,
  horarios integer, horarios_con_dias integer, horarios_ultima timestamptz,
  -- nuevas
  reservas_creadas_7d integer,
  finanzas_cobros_30 integer,
  finanzas_ultimo_cobro date
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
      count(*) filter (where r.fecha between p.hoy - 6 and p.hoy)::int as d7,
      count(*) filter (where r.created_at >= now() - interval '28 days')::int as d28,
      count(*) filter (where r.created_at >= now() - interval '30 days')::int as d30,
      count(*) filter (where r.created_at >= now() - interval '90 days')::int as d90,
      -- Sacadas en los ultimos 7 dias: se compara con las 3 semanas anteriores
      -- (d28 - creadas_7d) para ver si el salon bajo de golpe.
      count(*) filter (where r.created_at >= now() - interval '7 days')::int as creadas_7d,
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
      count(*) filter (where case when jsonb_typeof(to_jsonb(h.dias)) = 'array'
                                  then jsonb_array_length(to_jsonb(h.dias)) > 0
                                  else true end)::int as total,
      count(*) filter (where case when jsonb_typeof(to_jsonb(h.dias)) = 'array'
                                  then jsonb_array_length(to_jsonb(h.dias)) > 0
                                  else false end)::int as con_dias,
      max(h.created_at)::timestamptz as ultima
    from public.horarios_profesionales h
    group by h.negocio_id
  ),
  fin as (
    -- Solo se cuenta si hay cobros y de cuando es el ultimo: nunca importes.
    select f.negocio_id,
           count(*) filter (where f.date >= (select hoy from p) - 30)::int as cobros_30,
           max(f.date) as ultimo
    from public.roma_finanzas_ingresos f
    group by f.negocio_id
  )
  select
    n.id, n.configurado, n.updated_at::timestamptz, n.provincia::text, n.municipio::text,
    coalesce(n.es_tienda_externa, false),
    coalesce(res.total, 0), res.ultima_creada, coalesce(res.hoy, 0), coalesce(res.d7, 0),
    coalesce(res.d28, 0), coalesce(res.d30, 0), coalesce(res.d90, 0),
    res.ultima, res.proxima, coalesce(res.futuras, 0),
    coalesce(pro.total, 0), pro.ultima,
    coalesce(ser.total, 0), ser.ultima, coalesce(ser.sin_prof, 0),
    coalesce(hor.total, 0), coalesce(hor.con_dias, 0), hor.ultima,
    coalesce(res.creadas_7d, 0),
    coalesce(fin.cobros_30, 0),
    fin.ultimo
  from public.negocios n
  left join res on res.negocio_id = n.id
  left join pro on pro.negocio_id = n.id
  left join ser on ser.negocio_id = n.id
  left join hor on hor.negocio_id = n.id
  left join fin on fin.negocio_id = n.id
  where lower(coalesce(auth.jwt() ->> 'email', '')) = 'rservasroma@gmail.com';
$$;

revoke all on function public.admin_actividad_negocios() from public, anon;
grant execute on function public.admin_actividad_negocios() to authenticated;

-- COMPROBACION (correr aparte; no cambia nada):
--
-- begin;
-- set local "request.jwt.claims" = '{"email":"rservasroma@gmail.com","role":"authenticated"}';
-- select count(*) as negocios,
--        sum(reservas_creadas_7d) as sacadas_7_dias,
--        count(*) filter (where finanzas_cobros_30 > 0) as usan_finanzas
-- from public.admin_actividad_negocios();
-- rollback;
