-- Reinicio de un negocio desde el SuperAdmin.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
--
-- POR QUE ESTA FUNCION
-- El boton "Reiniciar cuenta" borraba tabla por tabla desde el navegador. Con
-- las tablas de RomaFinanzas eso fallaba siempre con "permission denied for
-- table roma_finanzas_ingresos": esas tablas guardan los ingresos y gastos de
-- cada salon y estan cerradas a proposito — ni la clave publica ni las cuentas
-- normales pueden leerlas ni borrarlas.
--
-- Abrirlas para que el boton funcione habria sido el arreglo facil y el
-- equivocado: cualquiera con la clave publica (que viaja dentro de todas las
-- apps publicadas) podria leer o borrar la contabilidad de cualquier salon.
--
-- En vez de eso, esta funcion es la UNICA puerta: sabe hacer una sola cosa —
-- "vaciar este negocio" — y corre con permisos del dueno de la base
-- (security definer), asi que las tablas siguen cerradas para todo lo demas.
-- Solo pueden llamarla las cuentas que inician sesion en el SuperAdmin
-- (rol authenticated). Los salones NO usan Supabase Auth — entran con su
-- contrasena contra negocios.password_hash — asi que quedan fuera.
--
-- Cubre los dos botones del panel, que hacian el mismo recorrido de tablas:
--   p_borrar_negocio = false -> "Reiniciar cuenta": vacia los datos pero deja
--     el salon y su contrasena. Al entrar vera el asistente inicial.
--   p_borrar_negocio = true  -> "Borrar Supabase": ademas elimina la ficha del
--     negocio. Se hace al final, cuando ya no queda nada que pudiera quedar
--     huerfano.

create or replace function public.reiniciar_negocio(
  p_negocio_id uuid,
  p_borrar_negocio boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tabla text;
  borradas integer;
  resumen jsonb := '{}'::jsonb;
  -- El orden importa poco porque todo se filtra por negocio_id, pero se
  -- mantiene el mismo del panel para que el resumen se lea igual que antes.
  tablas text[] := array[
    'reservas',
    'clientes_autorizados',
    'clientes_bloqueados',
    'lista_espera',
    'push_subscriptions',
    'horarios_profesionales',
    'profesionales',
    'servicios',
    'categorias_servicios',
    'dias_cerrados',
    'configuracion',
    'suscripciones',
    'roma_finanzas_ingresos',
    'roma_finanzas_gastos',
    'roma_finanzas_materials',
    'roma_finanzas_services',
    'roma_finanzas_fichas_costo',
    'roma_finanzas_config'
  ];
begin
  if p_negocio_id is null then
    raise exception 'Falta el negocio a reiniciar';
  end if;

  foreach tabla in array tablas loop
    -- Una tabla que todavia no existe en este proyecto, o que existe pero sin
    -- columna negocio_id, no debe tumbar el reinicio entero: se salta y se
    -- anota como omitida. El panel ya toleraba esos dos casos ("does not
    -- exist" / columna inexistente) y conviene no perder esa tolerancia: los
    -- proyectos de prueba no siempre tienen todas las tablas.
    if to_regclass('public.' || tabla) is null then
      resumen := resumen || jsonb_build_object(tabla, 'omitida: no existe');
      continue;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = tabla
        and column_name = 'negocio_id'
    ) then
      resumen := resumen || jsonb_build_object(tabla, 'omitida: sin negocio_id');
      continue;
    end if;

    execute format('delete from public.%I where negocio_id = $1', tabla)
      using p_negocio_id;
    get diagnostics borradas = row_count;
    resumen := resumen || jsonb_build_object(tabla, borradas);
  end loop;

  if p_borrar_negocio then
    delete from public.negocios where id = p_negocio_id;
    get diagnostics borradas = row_count;
    resumen := resumen || jsonb_build_object('negocios', borradas);
  else
    -- Que vuelva a ver el asistente de configuracion inicial.
    update public.negocios set configurado = false where id = p_negocio_id;
  end if;

  return resumen;
end;
$$;

-- Nadie mas que el SuperAdmin. Sin esto, "authenticated" no podria llamarla;
-- y a "anon" no se le concede a proposito: es la clave que viaja publica.
revoke all on function public.reiniciar_negocio(uuid, boolean) from public, anon;
grant execute on function public.reiniciar_negocio(uuid, boolean) to authenticated;

comment on function public.reiniciar_negocio(uuid, boolean) is
'Vacia los datos de un negocio (incluido RomaFinanzas) y, si se pide, borra tambien su ficha. Unica via para tocar las tablas de finanzas desde el SuperAdmin; solo la pueden llamar cuentas autenticadas.';
