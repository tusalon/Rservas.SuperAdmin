-- La prueba gratis de un negocio nuevo pasa de 30 a 15 dias (lo que dice la web).
-- Solo afecta a negocios que se creen a partir de ahora; las pruebas ya abiertas no cambian.
create or replace function public.handle_new_negocio()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.suscripciones (negocio_id, plan, estado, fecha_inicio, fecha_renovacion, notas)
  values (new.id, 'gratuito', 'trial', now(), now() + interval '15 days', 'Registro inicial - período de prueba');
  return new;
end;
$function$;
