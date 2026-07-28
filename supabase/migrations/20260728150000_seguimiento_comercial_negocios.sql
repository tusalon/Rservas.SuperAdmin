-- Seguimiento comercial privado del SuperAdmin de RservasRoma.
-- No almacena información de clientas ni detalles de sus citas.

create table if not exists public.seguimiento_comercial_negocios (
    negocio_id uuid primary key references public.negocios(id) on delete cascade,
    estado text not null default 'sin_contactar' check (estado in (
        'sin_contactar',
        'contactado',
        'respondio',
        'diagnostico',
        'activacion_agendada',
        'activado',
        'oferta_enviada',
        'pago_confirmado',
        'no_responde',
        'no_interesado'
    )),
    prioridad_manual text check (prioridad_manual is null or prioridad_manual in ('P0', 'P1', 'P2', 'P3', 'P4')),
    ultimo_contacto date,
    proximo_seguimiento date,
    responsable text,
    objecion text,
    resultado text not null default 'sin_cambio' check (resultado in (
        'sin_cambio',
        'configuracion_completa',
        'primera_reserva',
        'reactivado',
        'recurrente',
        'perdido'
    )),
    notas text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists seguimiento_comercial_estado_idx
    on public.seguimiento_comercial_negocios (estado);

create index if not exists seguimiento_comercial_proximo_idx
    on public.seguimiento_comercial_negocios (proximo_seguimiento)
    where proximo_seguimiento is not null;

alter table public.seguimiento_comercial_negocios enable row level security;

drop policy if exists "SuperAdmin puede leer seguimiento comercial" on public.seguimiento_comercial_negocios;
create policy "SuperAdmin puede leer seguimiento comercial"
    on public.seguimiento_comercial_negocios
    for select
    to authenticated
    using ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com');

drop policy if exists "SuperAdmin puede crear seguimiento comercial" on public.seguimiento_comercial_negocios;
create policy "SuperAdmin puede crear seguimiento comercial"
    on public.seguimiento_comercial_negocios
    for insert
    to authenticated
    with check ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com');

drop policy if exists "SuperAdmin puede actualizar seguimiento comercial" on public.seguimiento_comercial_negocios;
create policy "SuperAdmin puede actualizar seguimiento comercial"
    on public.seguimiento_comercial_negocios
    for update
    to authenticated
    using ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com')
    with check ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com');

drop policy if exists "SuperAdmin puede borrar seguimiento comercial" on public.seguimiento_comercial_negocios;
create policy "SuperAdmin puede borrar seguimiento comercial"
    on public.seguimiento_comercial_negocios
    for delete
    to authenticated
    using ((auth.jwt() ->> 'email') = 'rservasroma@gmail.com');

revoke all on table public.seguimiento_comercial_negocios from anon;
grant select, insert, update, delete on table public.seguimiento_comercial_negocios to authenticated;

create or replace function public.actualizar_seguimiento_comercial_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists seguimiento_comercial_updated_at on public.seguimiento_comercial_negocios;
create trigger seguimiento_comercial_updated_at
    before update on public.seguimiento_comercial_negocios
    for each row execute function public.actualizar_seguimiento_comercial_updated_at();

comment on table public.seguimiento_comercial_negocios is
    'CRM privado del SuperAdmin para activación, reactivación y conversión de negocios RservasRoma.';
