-- Archivar negocios en vez de borrarlos.
--
-- POR QUE
-- 178 de los 379 negocios llevan mas de 2 meses sin actividad y ensucian la
-- lista de SuperAdmin. Borrarlos es irreversible y ninguno lleva mas de 6 meses
-- parado: son altas recientes que se atascaron, no basura vieja. Archivar los
-- saca de la vista igual, pero si una duena vuelve no ha perdido nada.
--
-- Este script hace DOS cosas y ninguna destruye datos:
--   1. anade la columna 'archivado' a negocios
--   2. archiva los 73 del grupo A (sin reservas, sin clientas, sin suscripcion
--      activa, medido el 15/08/2026)
--
-- Se puede correr entero en el SQL Editor. Es idempotente.
--
-- IMPORTANTE: los 73 no estan en blanco. 72 tienen su salon montado (15
-- profesionales, 69 servicios, 497 categorias, 71 configuraciones). Por eso se
-- archivan y no se borran: estan a una llamada de arrancar.

alter table public.negocios
  add column if not exists archivado boolean not null default false,
  add column if not exists archivado_at timestamptz;

-- SuperAdmin pide la lista entera y filtra en el navegador, asi que el indice
-- solo ayuda a las consultas que filtren por archivado. Es barato, va parcial.
create index if not exists negocios_archivado_idx
  on public.negocios (archivado) where archivado = true;

update public.negocios
   set archivado = true, archivado_at = now()
 where archivado = false
   and id in (
  'fad06107-8602-4e3a-937a-57bfc21f4d5e','21111ab4-96ee-4f5e-a5de-c7f9cb32c328','23327177-5972-47fd-a1e0-185f3c8d8ac0',
  'b9f9f52e-9bce-43f9-a96c-2c4d1c3f50d5','1a60f8b1-89a0-449e-8cb9-1a5142a21ce1','315c1143-7878-44a1-ad0d-faf9e1f07d47',
  '4c44e3e7-9780-4481-94f4-e36f1ef13d55','d5f84838-cac2-4367-8789-69eeba899b81','f63ba471-fb31-4249-9611-1fe7b8f0ad22',
  '2ef86a1c-9e11-4149-997b-ee494e5bcf37','43efba73-f396-4a48-a832-368ad4a7bb20','4c8c5d8b-5b56-4d33-b977-78cc44a55ed4',
  'b0cfb660-8c54-42a0-af16-8b691b699a57','445877af-391b-4d6a-a695-5f7d30efc754','8a62870f-f423-43e8-89ae-53d4fff01500',
  'd52923b4-1fcd-4718-9775-cf386f4ba010','02863d44-1b2d-438a-b67f-67b432f30101','b48b7d14-7528-466a-b43f-dc007d6eb53e',
  '6ec8be7e-a6cf-4a18-b507-c35354a03bb2','749713b7-ab3a-4a4e-ba2f-519eb88c784e','8661ded0-ca19-4118-9a72-54ff7ac40bf9',
  'a82021db-d6ef-4ede-a20c-1dc8a73b26c2','e1752496-629b-4182-bef3-4296d29c33a9','f14be175-040c-40bf-908e-c0512bec05da',
  '12c03e91-8d1e-4cae-9226-766e9fe5d7de','c12f20e9-f91b-404d-9cf2-e4662b08967c','ed9cfb62-a980-44f3-8c89-704b6c2ba394',
  '0e18034a-d8b0-49db-916f-97420a11832d','13e8e12a-373a-45be-a3f8-6616571f7c75','1a270cb0-67b1-4650-809d-c10a1488f549',
  'a50702b0-375d-495a-83bc-ae5213521c75','b4b8fbe4-e2fb-45de-be38-88ce902de1e7','bffd7434-6f5d-457f-847d-62b3cc7bdf21',
  'd2b98290-0c88-4110-8f13-eb861ecf4edd','15b03eb1-02e0-4b00-9603-741ca27596f4','a1d6fb63-ea36-4267-a336-970a40772d1a',
  'ff48bd0b-f107-4dbd-8713-d72d28cf73a7','43879ef0-bc8d-4cef-a7a2-b2b9af0b3194','dac5d8b4-614f-41ee-b009-9c4ca6900df4',
  '51df4392-849d-4e62-b8c1-22e427f97830','daab1102-58db-436d-94dd-df6dc5fd85cc','be854fd2-f94b-4fdd-a496-cd15c78ffcf8',
  'f09ef4ea-2b77-4cb4-b47f-38dc9e47e827','658c13b8-6df1-482e-b1a4-038d527e9b71','d407a49b-0c31-4a5a-a68a-a61b84b4d83d',
  '5489fc57-4244-4bae-aa33-ec62797d2dd7','223cb8a1-d944-492b-b5df-7b19609d3c5d','4bc5cb02-dd92-4d7f-acf9-aa240fea8f93',
  '56cf5508-2796-4f57-a245-2884a38b71e3','dae815c3-79c1-4923-b7f3-c674aa1769e5','b576de68-5799-4313-b2f2-f44c0e01a8d4',
  'f910de44-c213-44fe-8d41-86579555a791','ea5f3104-5eb9-46f9-8e41-f28e58f9a2c6','af1b2575-c2dd-4c48-8bff-1333caf029d5',
  '062da19d-34b5-4866-90ad-84a61b064a6d','5308171f-f0bb-4026-8b8f-6ec913e75f68','fcaac6ef-7681-4730-9050-2febfdffb231',
  'fd2ba444-9e03-452c-a468-673441ba4c2d','9000abe0-5a91-424b-b4f4-3035fc822f45','e6c3c63b-43ec-4454-9082-a2bdf2193c1f',
  '7a9e6883-5ac9-4a03-9d4c-c8919beb1b5f','8ed48a19-045e-4105-8ae5-53a701bec4fd','a21f89f2-ee38-45e3-82a7-bf5413e8611d',
  'c40bd181-02c5-43a5-8387-b84efff99e1f','b47530e8-3b95-4adb-9bad-21d4244c32fd','3df4916d-3b65-40a8-8e62-bd340e804234',
  'dba0312d-1070-4dfe-8115-ccadbc1f9872','10338a36-2fa8-4818-a41d-71cf3d12fd7c','9ead31e9-f7c7-40ba-8ce5-c4598fe188a7',
  '30f8b218-eee1-40fb-a761-c9e9fe0abbcd','4e18089d-12b1-439a-b921-198b887321c1','8f76c5af-ece5-49c2-977f-7887142b9dcc',
  '0a5794cc-1f53-43ac-b363-8a796a4032d1'
);

-- COMPROBAR
--   select count(*) from public.negocios where archivado;          -- deberia dar 73
--   select nombre, telefono, archivado_at from public.negocios
--    where archivado order by nombre;
--
-- DESARCHIVAR uno (o todos, quitando el where):
--   update public.negocios set archivado = false, archivado_at = null
--    where id = 'el-id-que-sea';
