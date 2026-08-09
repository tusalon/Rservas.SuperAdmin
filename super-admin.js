// super-admin.js
// ==================== CONFIGURACIÓN ====================
const PRECIO_MENSUAL = 1000;
const DIAS_POR_DEFECTO = 15;
// Debe coincidir con FECHA_CORTE de rservasroma/utils/suscripcion.js: el panel
// de la duena ignora todo vencimiento anterior a esta fecha (habia 250 salones
// con fechas viejas de prueba). Aqui se usa el mismo criterio para que la lista
// de cobros muestre exactamente a quien el sistema esta bloqueando de verdad.
const FECHA_CORTE_COBRO = '2026-07-19';
const WHATSAPP_MENSAJE = "Hola, escribimos desde el soporte de Rservas.Roma para saber en qué podemos ayudarle";
const NTFY_TOPIC_GLOBAL = "rservas-vencimientos";
const ADMIN_EMAIL = "rservasroma@gmail.com";
const CLIENTES_ROOT_LOCAL = "C:\\Users\\RODO\\Documents\\ClientesRservas";
const AUTOMATION_DIR_LOCAL = "C:\\Users\\RODO\\Documents\\New project";
const SUPERADMIN_DIR_LOCAL = "C:\\Users\\RODO\\Documents\\Rservas.SuperAdmin";
const APP_BASE_VERSION = "20260531-rservas-base-v1";
const APP_VERSION_FILE = "rservas-version.json";
const NEGOCIOS_RECTIFICADOS = {
    "742405d7-292e-424a-bd63-f6e6b09fd7d5": {
        carpeta_local: "ketycasalon",
        slug_local: "ketycasalon",
        ntfy_topic: "ketycas-salon",
        sitio_web: "https://tusalon.github.io/ketycasalon/"
    }
};
const CARPETAS_CLIENTES_POR_NEGOCIO_ID = {
    "01a651e5-97de-4048-b788-5751fd0bd1f5": "hairsalonkeyla",
    "02619a05-e945-408d-8672-6f8bdc5df74e": "laksmispa",
    "02863d44-1b2d-438a-b67f-67b432f30101": "metanoia",
    "031e4d65-1cb3-4adb-87aa-3e8a38b3b7ab": "adis",
    "03d57dc1-1668-4ed9-a64f-05d175b83348": "nailsyade",
    "056ad30f-22cd-4702-a821-009b73edd386": "sheilitabeauty",
    "062da19d-34b5-4866-90ad-84a61b064a6d": "Adhara Glow Studio",
    "06b28ef3-0812-42e1-9ffc-9d93d5290f85": "leyanna-studio",
    "07cc818e-1781-45b5-9f5a-25e53b1adb95": "lisseffect",
    "08638828-1a42-4c60-a6d4-4f2b2b841646": "srtagarcialashacademy",
    "08977bca-a25c-4876-834a-86b87cae49fd": "glossnails",
    "093d3a88-1606-4f04-a82a-c6b1acba83ff": "anynails",
    "0a129e7a-faf0-4ec3-a8c6-aee1a551d694": "laurallanesnails",
    "0a418537-30d4-4939-863a-bf61c414185a": "Dunia-Nails",
    "0b129884-a4eb-4dff-ad34-0befe9a330f1": "day90artnails",
    "0e18034a-d8b0-49db-916f-97420a11832d": "jaynails",
    "0e63f543-ddb4-4911-aa02-e85062adf063": "roblesnailshomestudio",
    "10ba1f00-1e17-4009-a459-2fff39bfb8fb": "nails-gretel",
    "113a6f79-5f6b-4c33-a730-a5bb2fc4739c": "perlas-preciosas",
    "12c03e91-8d1e-4cae-9226-766e9fe5d7de": "yolynails",
    "13516bb0-6ba6-4ffc-a5c6-10d3be396651": "fonsy-nails",
    "13e8e12a-373a-45be-a3f8-6616571f7c75": "gabynailsbeauty",
    "14970faa-55f7-41f8-9873-7d54fc21c304": "salonbeautynails",
    "15b03eb1-02e0-4b00-9603-741ca27596f4": "nailsbylia",
    "15c95996-61a2-405d-a421-4dcc02addaf1": "sunbyoda",
    "16ced5d1-e822-44be-b501-fc22d1694ee7": "grace-nails",
    "17100213-e978-40df-a510-ad5eaa084f7f": "beautifull",
    "18178cc2-4134-4684-9ec7-10f00f136191": "adrinails",
    "18be5204-1780-4ce4-b8cc-e1e536805386": "aliettynails",
    "1a270cb0-67b1-4650-809d-c10a1488f549": "olymposalon",
    "1a60f8b1-89a0-449e-8cb9-1a5142a21ce1": "dulce-studionails",
    "1bc9ba32-b83b-45fb-8ed2-87378a1c6d11": "drosesalonbycelin",
    "1be9acfe-ce50-4fd6-a92f-b92bec2174d4": "ingrid-nails",
    "1c7ec52a-30ea-4694-b9dd-fd34fb20684f": "novabeautystudio",
    "1cce86f4-8877-43ad-9bae-ac4ef6635c93": "jessinails",
    "1d66b0a1-040e-49e6-9e1e-b69a605d6c18": "tulipsalon",
    "1d9830ff-b832-48fd-88ba-1e88938df722": "ohanasalondebelleza",
    "1dc5adc6-ed9e-4931-833f-4f71645c9ef3": "lagbarberia",
    "20c29c00-190b-4d01-8c4d-e8be6b18a809": "dbella",
    "21111ab4-96ee-4f5e-a5de-c7f9cb32c328": "morenanails",
    "21e351f7-2909-49fe-93f4-60cdff553922": "letynails",
    "223cb8a1-d944-492b-b5df-7b19609d3c5d": "yinenails",
    "23327177-5972-47fd-a1e0-185f3c8d8ac0": "bela-nails",
    "26ed2ca2-014d-4d5a-90e5-a492332c49f6": "angelstudiobyjennyrodriguez",
    "27605e73-5950-40d8-bac6-34302ee2c28f": "cynthianailsart",
    "294a6d36-b32d-4a53-9178-b63bda09ac73": "naturalglambysheilasanguily",
    "2e5958ca-c51d-4ec3-9325-f374a33d860a": "alyssalon",
    "2ef86a1c-9e11-4149-997b-ee494e5bcf37": "keniastudio-nails",
    "2f33bd61-b04e-42dc-aa13-8d19338ae042": "milas-studio",
    "2f57f838-b72f-4330-9513-a8acbe8edcce": "nailsglamme",
    "30f8b218-eee1-40fb-a761-c9e9fe0abbcd": "sheenastudio",
    "315c1143-7878-44a1-ad0d-faf9e1f07d47": "fantasy-salon",
    "3170b38c-c8f1-4113-a84d-a01bf3b4610c": "leydi_nailsstudio",
    "319f04ba-35ac-40bb-a9d5-48ef0a4776cd": "dayinails",
    "329c7f13-c197-4e37-b05e-b4b671a2c3f7": "danynails",
    "3430e035-7fe0-4212-97dd-1f44b545b758": "deilisnailsart",
    "34bde163-c75c-4d16-8491-7635ef04aa85": "anitasnailstudio",
    "34c9a9ef-d052-4cd3-b8d3-fbff0abffb23": "ailiananailsstudio",
    "3585aca0-8ebc-46c1-b3ed-3445e249cef7": "yanisnails",
    "36a2551b-d4d6-4c54-9ac0-bea1122132dc": "pinkgreendaya",
    "3b9f10c9-8d4a-4db3-936d-943e0374c1bd": "lianails",
    "3df4916d-3b65-40a8-8e62-bd340e804234": "yysalon",
    "3f62f3be-e0a9-4e6e-af19-0085d1ed6326": "yiyinails",
    "4044469d-c34a-497b-98fc-a11106cd8666": "yeney-nails",
    "43879ef0-bc8d-4cef-a7a2-b2b9af0b3194": "yasminnails",
    "43efba73-f396-4a48-a832-368ad4a7bb20": "chinysalon",
    "445877af-391b-4d6a-a695-5f7d30efc754": "nailsainuy",
    "46456722-dc3f-47ed-9e13-1f075e67d49f": "claranails",
    "46854495-29a6-4890-93dd-1aa2fdcbe4d6": "yaminailsbeauty",
    "46ce6c3e-3c02-4232-a96c-6d0c5a92b12e": "yayinailssalonyspa",
    "4719b7f7-0003-4fa1-8c91-8e6782d380e8": "bella-mile",
    "4726e80f-1a75-488d-8fdb-e806487f8cc4": "melnails",
    "47666c9b-afa1-4286-a727-0e30f86611af": "acrykanails",
    "4814147d-8a3b-4021-a542-4a3edc13e8cc": "aylinnails",
    "4a112780-e732-42c8-ae03-51a92e6faea2": "atuestilonails",
    "4ab02da7-a576-4df3-84c0-7c799b377e0d": "kartnails",
    "4bc5cb02-dd92-4d7f-acf9-aa240fea8f93": "anyi",
    "4c44e3e7-9780-4481-94f4-e36f1ef13d55": "lidynails",
    "4c8c5d8b-5b56-4d33-b977-78cc44a55ed4": "ybeautyhabana",
    "4dd4331a-069c-4bc1-a75e-87267a4e7397": "rservasroma",
    "4e18089d-12b1-439a-b921-198b887321c1": "melanienails",
    "4e65a5de-f9d6-4f19-8a2b-8f96e03e3ab4": "valentinas",
    "4f5c860d-0587-482f-b324-13709b880eef": "cherrynailsbydaniela",
    "503ac168-5fae-46ef-b889-bf962532ddc3": "kirynailssalon",
    "5199b9b8-43a4-42bd-9309-3864817efca1": "nathynails",
    "51df4392-849d-4e62-b8c1-22e427f97830": "sinaynails",
    "52641dc0-619f-45b4-bb23-b167eeedf518": "nailsjens",
    "5308171f-f0bb-4026-8b8f-6ec913e75f68": "lissynails",
    "5489fc57-4244-4bae-aa33-ec62797d2dd7": "geannynails",
    "54a5b3ba-a23f-44a2-a409-4f930765c111": "dnailspassion",
    "55e7df41-6cf7-45d7-9fc3-a17966e3645a": "exoticnailsbyyuli",
    "569fa1d3-6018-42c6-bbb4-133604228c77": "gabynailssalon",
    "56a67bfa-0811-4dd6-88d4-2ba542f7bf2a": "elynails",
    "56cf5508-2796-4f57-a245-2884a38b71e3": "dayisnails",
    "5793c017-4288-4371-b450-b2a357a15b68": "katynails",
    "59b4f82a-8909-4033-a76b-2eefe6e64f07": "sulynails",
    "5a7e4697-59d5-425f-900e-f030199d20df": "lisnailstudio",
    "5b5af44c-7fbc-4a4d-ab06-871f15b55fee": "dayanails",
    "5de334c2-78eb-4b36-8f5a-9e57269dc7d8": "ysberosi",
    "5e6e8049-274b-4d08-ad62-c49885457d39": "sheyla_nails",
    "5e710464-de34-45ae-9197-cd6eeb748ca0": "bennetsalon",
    "5fcb1fce-a33a-4177-bc78-df32b63072c4": "nailsbymale",
    "62ae9f18-1be5-4ef4-a3a0-60d4cfe48ac2": "proyectoprueba",
    "63696de8-00c8-4ce5-97fa-dee57ca4f642": "ailin-nails",
    "658c13b8-6df1-482e-b1a4-038d527e9b71": "yanianails",
    "67b59233-6c09-4b0b-8015-f8078def3d99": "mumisalon",
    "6820bfa3-a0e8-4c4e-b935-62e59f717ecb": "-amynails",
    "68417e75-2b38-492b-a0a8-c6ccafe85ce7": "albysnails",
    "6bcb0d83-2863-46e2-9d18-c11eb06d43a9": "salonfantasiasthaly",
    "6ec8be7e-a6cf-4a18-b507-c35354a03bb2": "studiolisnails",
    "6fe66fd3-3107-4650-a8c8-6b587389a2a3": "luxurynailsspa",
    "71036a1c-5c61-416b-9497-753011d64422": "leibniznails",
    "720093d9-e7a0-43e3-9d5e-9c505966f0ac": "divinetouch",
    "742405d7-292e-424a-bd63-f6e6b09fd7d5": "ketycasalon",
    "749713b7-ab3a-4a4e-ba2f-519eb88c784e": "caminails",
    "76f7ddfa-a397-464b-acba-c716619f8cf0": "theplaceofloresnails",
    "79fb5647-0c68-41d8-be77-9ad931bbdb49": "cailcnailsliliana",
    "7a9e6883-5ac9-4a03-9d4c-c8919beb1b5f": "cheilybynails",
    "7e6fd977-fe1b-4987-a5cc-e5ef47f8ed0d": "milianlash-studio",
    "82fba923-f602-48ab-8e07-db2d260fbc4e": "moniknails",
    "8661ded0-ca19-4118-9a72-54ff7ac40bf9": "mariapilarnails",
    "86f85eae-d233-46db-a2c1-70e59e04c624": "angelnails",
    "87143675-9146-43f1-9e41-09a9d12766b0": "eliglownails",
    "88b6d898-4025-4597-80af-2d294debdd41": "meluksalon",
    "8a4d2cc2-9efa-49c3-9dfd-7c7bdbc04114": "marinelda-nails",
    "8a5981f4-9c0b-4e54-85e8-4c16804d07b7": "dailynailssalon",
    "8a62870f-f423-43e8-89ae-53d4fff01500": "rachynails",
    "8b7ed306-e548-4a12-8d26-f9fb067ba7cd": "karmassalonhabana",
    "8bde5f31-9417-4dcd-9d1d-35007d372c26": "melissanails",
    "8ed48a19-045e-4105-8ae5-53a701bec4fd": "nailsbyyoanet",
    "8fd7007b-12a5-4ed4-88cc-b9c84b75a6e3": "knelanailsart",
    "9000abe0-5a91-424b-b4f4-3035fc822f45": "yelynails",
    "9240a7fc-ee56-455d-9426-faa10d855081": "amy_nails",
    "935cc37b-ee0e-4187-9507-4409880a15c2": "gordis-nails",
    "99756b6d-1c65-4239-a4e9-77855bed94b7": "hanydorta-nailsdesigner",
    "9db1153b-107a-4166-b6ee-5bfc566a1931": "salonmujervirtuosa",
    "9ead31e9-f7c7-40ba-8ce5-c4598fe188a7": "norkykmnails",
    "a1d6fb63-ea36-4267-a336-970a40772d1a": "anisnails",
    "a21f89f2-ee38-45e3-82a7-bf5413e8611d": "milynails",
    "a25dc8be-d58e-41ab-8333-72b93ac5aa04": "yadistudio",
    "a2db5a3a-26da-4526-81b7-5b00914ddf3f": "dydnails",
    "a50702b0-375d-495a-83bc-ae5213521c75": "cutieenails",
    "a628af8e-4d8b-4ec6-928d-765bcc53e6e3": "bymarianailsart",
    "a65943cd-0880-43de-b494-3e11adbf58e5": "vlindernails",
    "a7294f5b-3856-47ab-abbf-93c935cec819": "daylincorona",
    "a82021db-d6ef-4ede-a20c-1dc8a73b26c2": "saloneresbella",
    "ac8cb4e2-49c0-4c4c-89cf-feb1fd716e49": "irinanails",
    "ad0fb034-84d3-4b24-a3af-be95383c023e": "salonmelenin",
    "ad261b16-6b1a-48d0-b0a6-2182551eaf08": "unas_de_claudia",
    "ad43ad74-ce42-4325-ab4a-d4a89673eda5": "mknails",
    "ae04a6b6-7167-4094-85be-a83da0486e85": "bellezadchina",
    "aeb8a595-9487-437f-a4f2-69f3554aaeae": "diamelisnails",
    "af1b2575-c2dd-4c48-8bff-1333caf029d5": "amy-nails",
    "affa3b9a-8a2c-4e82-a251-1cdcaaf2de75": "yulynails",
    "b0c062f7-c015-4987-b7d5-dab90e1de441": "sandra-nails-studio",
    "b0cfb660-8c54-42a0-af16-8b691b699a57": "bellasalon",
    "b1bc1c63-0100-422d-a8cd-e97e6a624864": "elegansnailssalonbyines",
    "b313b8ee-85b6-41c4-957a-674461d076ef": "salonyacademiadoñadivarodríguez",
    "b32294ce-c2fb-454c-b7ab-ecee6f63c290": "nailsbyanesita",
    "b47530e8-3b95-4adb-9bad-21d4244c32fd": "yenynailssalon",
    "b48b7d14-7528-466a-b43f-dc007d6eb53e": "bianailsart",
    "b4b8fbe4-e2fb-45de-be38-88ce902de1e7": "bethnails",
    "b5625ba2-8aa9-48de-acf3-576a9e796b14": "leesnailssalon",
    "b576de68-5799-4313-b2f2-f44c0e01a8d4": "lietynails",
    "b7c59c75-823b-46b8-bfb4-9abbbf504abc": "gabyestudio",
    "b7c8f7e3-cbd5-4072-9246-2ff7a4a5372e": "melynails",
    "b844f563-d3fb-4eed-8996-d77a936c3f70": "divahabananails",
    "b95ed408-c248-43da-8c32-790400abc974": "dcora-nails-studio",
    "b9f9f52e-9bce-43f9-a96c-2c4d1c3f50d5": "gels_adne",
    "bc334a90-7458-45f7-b9c7-5fb219b04741": "kamiborgesnails",
    "be854fd2-f94b-4fdd-a496-cd15c78ffcf8": "ladyanne",
    "bffd7434-6f5d-457f-847d-62b3cc7bdf21": "amynails",
    "c0228be1-4ef7-4dfb-bc71-500b44c93784": "salonstiloestela",
    "c03a5d32-74d2-4f07-b582-c2a01da1ddcb": "salonmechimaria",
    "c12f20e9-f91b-404d-9cf2-e4662b08967c": "paulanails",
    "c37d5688-6218-436c-bd6d-3daef78057fa": "darynails",
    "c3bef8a2-be8d-4b4d-825b-3fe79f0a8db6": "nailsbyheyllen",
    "c40bd181-02c5-43a5-8387-b84efff99e1f": "beautysalon",
    "c48a0307-6dfa-4132-99d0-eeb3211aecab": "danis",
    "cb22a06f-9acf-4430-913a-00373c1d00f3": "boom_nails",
    "cd97b4b7-8c9d-4681-b8db-f01cb2a64b83": "jenisnails",
    "cdd313a0-3d48-4db4-b022-9244a11dbe7d": "rservasromaprueba",
    "ce31fea8-414a-465a-9501-9d940e4e8bf0": "nailsartstudiobyari",
    "cf522698-af33-4208-987c-3f0f5f821a4d": "yailennails",
    "d16cde9f-9c1e-4805-a565-ad52a0aaf209": "salonroxynails",
    "d1947242-f976-4851-9a33-c19fdd74cf95": "yurisnailsart",
    "d1b42883-44be-4a5c-941c-930663c19e09": "yaquilobainanailspro",
    "d1cd9365-ed20-4f98-99a2-959ba6b20d90": "yuly_nails",
    "d1d3d70e-6913-4205-9c33-36ebf0473eb1": "mischicasnails",
    "d2b98290-0c88-4110-8f13-eb861ecf4edd": "yvnaranjonails",
    "d34920a9-1871-4b12-bb6c-117fb811e388": "indrilaynails",
    "d3603d5d-c64a-4151-873c-8b926c556da4": "bellasmanos",
    "d407a49b-0c31-4a5a-a68a-a61b84b4d83d": "adanails",
    "d4984a12-ccb6-432f-a32a-29b8534291bf": "bettynails",
    "d4f7e2b1-3a8c-4b6d-9e5f-1c2d3e4f5a6b": "studioisma.nails",
    "d52923b4-1fcd-4718-9775-cf386f4ba010": "angeykei",
    "d5f84838-cac2-4367-8789-69eeba899b81": "amani",
    "d6b4e828-fe3e-4288-adda-1155f940c871": "alisnails",
    "d81f3ea8-ad78-4cb8-9898-72c482093327": "naillabbymelisaglez",
    "d916399f-e174-418e-ab7d-b44866d411ba": "nelysnails",
    "daab1102-58db-436d-94dd-df6dc5fd85cc": "jadenails",
    "dac5d8b4-614f-41ee-b009-9c4ca6900df4": "maryoritanails",
    "dae57f99-8693-4197-be8e-ee2e74f4a337": "alexnails",
    "dae815c3-79c1-4923-b7f3-c674aa1769e5": "danisbeautysalon",
    "dba0312d-1070-4dfe-8115-ccadbc1f9872": "emynails",
    "deb93323-d84b-40de-89c1-6b989493d69c": "risellsalon",
    "df6e2560-d892-4667-843f-75aa4c91d67b": "lilisnails",
    "e1752496-629b-4182-bef3-4296d29c33a9": "nailszury",
    "e469af73-eddd-4154-8128-386dcdb56945": "jessysnails",
    "e6c3c63b-43ec-4454-9082-a2bdf2193c1f": "melodynailartstudio",
    "e714c3f5-7b68-433e-a77d-7e0d6927a8fd": "rosynails",
    "e7f161f7-bf31-4f81-b7df-df837981921b": "salonvenus",
    "ea5f3104-5eb9-46f9-8e41-f28e58f9a2c6": "jimornails",
    "eaba8ba5-2120-4164-a8be-94f0a560e1b4": "erikitanails",
    "eb0879ce-d72b-47aa-a8a8-8d37dcd7fc20": "elegance-house",
    "ecceaaca-de03-488b-8d58-42a88b08a604": "arynails",
    "ed9cfb62-a980-44f3-8c89-704b6c2ba394": "deyannails",
    "ee78c34d-e9ba-423c-aab7-2b70626b291f": "marelisnails",
    "ef954d16-f163-4f9e-b703-219f6f016bc9": "nailssalonebenezer",
    "efe82c26-7e72-45bf-96bc-2d340a28268a": "karlanails",
    "f0533089-d445-4ebf-b5c5-5abbcf90f4ce": "hhnails",
    "f09ef4ea-2b77-4cb4-b47f-38dc9e47e827": "liannynails",
    "f0dcc3e8-c7ee-4bfb-9396-fadc4be0fed4": "mysweetme",
    "f14be175-040c-40bf-908e-c0512bec05da": "yalinails",
    "f37ef7e8-b697-402a-8c4f-bd05cbd843f9": "nailsbyleiby",
    "f63ba471-fb31-4249-9611-1fe7b8f0ad22": "lizcintado",
    "f6552646-5c80-4482-bf88-392c79c62eaf": "darlynails",
    "f8c6c751-e3c3-48d0-aa9b-57955b0a0679": "yadisnails",
    "f910de44-c213-44fe-8d41-86579555a791": "arlenenailssalon",
    "fac842a6-0663-46b6-8fee-121d6160048a": "brendabeautysalon",
    "fb79cce8-736a-4713-9f7a-4cccd9fc22a6": "thaly-nails-studio",
    "fc6ef923-6e3c-4f22-a369-35af00aafc4b": "lisbleubylili",
    "fcaac6ef-7681-4730-9050-2febfdffb231": "jessiguisaonailsartist",
    "fd2ba444-9e03-452c-a468-673441ba4c2d": "dermar",
    "fd577d92-05cd-443a-ad03-8f9500fa56a0": "arletnails",
    "fe2274ac-aac0-4ded-9e7f-72d8e2ddfd50": "nails-by-karlasalon",
    "ff48bd0b-f107-4dbd-8713-d72d28cf73a7": "daylinnailsdesigner",
};
const CARPETAS_CLIENTES = [
    "-amynails",
    "acrykanails",
    "adanails",
    "Adhara Glow Studio",
    "adis",
    "adrinails",
    "ailiananailsstudio",
    "ailin-nails",
    "albysnails",
    "alexnails",
    "aliettynails",
    "alisnails",
    "alyssalon",
    "amani",
    "amy_nails",
    "amy-nails",
    "amynails",
    "angelnails",
    "angelstudiobyjennyrodriguez",
    "angeykei",
    "anisnails",
    "anitasnailstudio",
    "anyi",
    "anynails",
    "arlenenailssalon",
    "arletnails",
    "arynails",
    "atuestilonails",
    "aylinnails",
    "beautifull",
    "bela-nails",
    "bella-mile",
    "bellasalon",
    "bellasmanos",
    "bellezadchina",
    "bennetsalon",
    "bethnails",
    "bettynails",
    "bianailsart",
    "boom_nails",
    "brendabeautysalon",
    "bymarianailsart",
    "cailcnailsliliana",
    "caminails",
    "cheilybynails",
    "cherrynailsbydaniela",
    "chinysalon",
    "claranails",
    "cutieenails",
    "cynthianailsart",
    "dailynailssalon",
    "danis",
    "danisbeautysalon",
    "darlynails",
    "darynails",
    "day90artnails",
    "dayanails",
    "dayinails",
    "dayisnails",
    "daylincorona",
    "daylinnailsdesigner",
    "dbella",
    "dcora-nails-studio",
    "deilisnailsart",
    "dermar",
    "deyannails",
    "diamelisnails",
    "divahabananails",
    "divinetouch",
    "dnailspassion",
    "drosesalonbycelin",
    "dulce-studionails",
    "Dunia-Nails",
    "dydnails",
    "elegance-house",
    "elegansnailssalonbyines",
    "elynails",
    "emynails",
    "erikitanails",
    "exoticnailsbyyuli",
    "fantasy-salon",
    "fonsy-nails",
    "gabyestudio",
    "gabynailsbeauty",
    "geannynails",
    "gels_adne",
    "glossnails",
    "gordis-nails",
    "gordis-nails-generados",
    "gordis-nails-generados-limpio",
    "grace-nails",
    "hairsalonkeyla",
    "hanydorta-nailsdesigner",
    "hhnails",
    "imalisnails",
    "indrilaynails",
    "ingrid-nails",
    "irinanails",
    "jadenails",
    "jaynails",
    "jenisnails",
    "jessiguisaonailsartist",
    "jessinails",
    "jessysnails",
    "jimornails",
    "kamiborgesnails",
    "karlanails",
    "kartnails",
    "katynails",
    "keniastudio-nails",
    "ketyca_salon",
    "ketyca-salon",
    "ketycasalon",
    "ketycassalon",
    "kirynailssalon",
    "knelanailsart",
    "ladyanne",
    "lagbarberia",
    "laksmispa",
    "laurallanesnails",
    "leesnailssalon",
    "leibniznails",
    "letynails",
    "leyanna-studio",
    "leydi_nailsstudio",
    "lianails",
    "liannynails",
    "lidynails",
    "lietynails",
    "lilisnails",
    "lisbleubylili",
    "lisnailstudio",
    "lisseffect",
    "lissynails",
    "lizcintado",
    "luxurynailsspa",
    "marelisnails",
    "mariapilarnails",
    "marinelda-nails",
    "maryoritanails",
    "melanienails",
    "melissanails",
    "melnails",
    "melodynailartstudio",
    "meluksalon",
    "melynails",
    "metanoia",
    "milas-studio",
    "milianlash-studio",
    "milynails",
    "mischicasnails",
    "mknails",
    "moniknails",
    "morenanails",
    "mumisalon",
    "mysweetme",
    "naillabbymelisaglez",
    "nails-by-karlasalon",
    "nails-gretel",
    "nailsainuy",
    "nailsartstudiobyari",
    "nailsbyanesita",
    "nailsbyheyllen",
    "nailsbyleiby",
    "nailsbylia",
    "nailsbymale",
    "nailsglamme",
    "nailsjens",
    "nailssalonebenezer",
    "nailsyade",
    "nailsyey",
    "nailszury",
    "naturalglambysheilasanguily",
    "nelysnails",
    "norkykmnails",
    "novabeautystudio",
    "ohanasalondebelleza",
    "olymposalon",
    "paulanails",
    "perlas-preciosas",
    "pinkgreendaya",
    "proyectoprueba",
    "rachynails",
    "risellsalon",
    "roblesnailshomestudio",
    "rosynails",
    "rservasroma",
    "rservasromaprueba",
    "salonbeautynails",
    "saloneresbella",
    "salonmechimaria",
    "salonmelenin",
    "salonmujervirtuosa",
    "salonroxynails",
    "salonstiloestela",
    "salonvenus",
    "salonyacademiadoñadivarodríguez",
    "sandra-nails-studio",
    "sheenastudio",
    "sheilitabeauty",
    "sheyla_nails",
    "sheyla-nails",
    "sinaynails",
    "srtagarcialashacademy",
    "studioisma.nails",
    "studiolisnails",
    "sulynails",
    "sunbyoda",
    "thaly-nails-studio",
    "theplaceofloresnails",
    "tulipsalon",
    "unas_de_claudia",
    "valentinas",
    "vlindernails",
    "yadisnails",
    "yadistudio",
    "yailennails",
    "yalinails",
    "yaminailsbeauty",
    "yanianails",
    "yanisnails",
    "yaquilobainanailspro",
    "yasminnails",
    "yayinailssalonyspa",
    "ybeautyhabana",
    "yelynails",
    "yeney-nails",
    "yinenails",
    "yolynails",
    "ysberosi",
    "yuly_nails",
    "yulynails",
    "yurisnailsart",
    "yvnaranjonails",
    "yysalon"
];

let filtroActual = "todos";
let filtroBusqueda = "";
let negociosData = [];
// Estado de configuracion por salon (para "Salones que necesitan ayuda")
let negociosConServicios = new Set();
let negociosConHorarios = new Set();
let serviciosSinProfesionalPorNegocio = {};
let ordenActual = "reservas"; // 'reservas', 'semana' o 'fecha'
let reservasDiarias = 0;
let reservasDiariasData = [];
let reportesTiendaData = [];
let reservasSemanaData = [];
let ultimaCitaPorNegocio = {};
let actividadReservasCargada = false;
let versionRenderToken = 0;
const versionAppCache = {};
const seleccionActualizacion = new Set();
const LOTES_ACTUALIZACION_KEY = 'lotes_actualizacion_rservas';
const CARPETAS_LOCALES_KEY = 'carpetas_locales_clientes';
let pendientesLocal = JSON.parse(localStorage.getItem('pendientes_admin')) || [];
let eliminadosLocal = JSON.parse(localStorage.getItem('eliminados_admin')) || [];
let ultimaVezEscrito = JSON.parse(localStorage.getItem('ultima_vez_escrito')) || {};

// ==================== CARPETAS LOCALES (localStorage) ====================

function cargarCarpetasLocales() {
    try { return JSON.parse(localStorage.getItem(CARPETAS_LOCALES_KEY) || '{}'); }
    catch { return {}; }
}

function guardarCarpetasLocales(mapa) {
    localStorage.setItem(CARPETAS_LOCALES_KEY, JSON.stringify(mapa));
}

function getCarpetaGuardada(negocioId) {
    return cargarCarpetasLocales()[String(negocioId)] || '';
}

function setCarpetaGuardada(negocioId, carpeta) {
    const mapa = cargarCarpetasLocales();
    const id = String(negocioId);
    if (carpeta && carpeta.trim()) {
        mapa[id] = carpeta.trim();
    } else {
        delete mapa[id];
    }
    guardarCarpetasLocales(mapa);
}

function exportarCarpetasLocales() {
    const mapa = cargarCarpetasLocales();
    const json = JSON.stringify(mapa, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carpetas-clientes-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importarCarpetasLocales() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const texto = await file.text();
            const nuevo = JSON.parse(texto);
            if (typeof nuevo !== 'object' || Array.isArray(nuevo)) throw new Error('Formato inválido');
            const actual = cargarCarpetasLocales();
            const merged = { ...actual, ...nuevo };
            guardarCarpetasLocales(merged);
            alert(`✅ Importadas ${Object.keys(nuevo).length} carpetas. Total: ${Object.keys(merged).length}`);
            if (typeof renderGestionCarpetas === 'function') renderGestionCarpetas();
        } catch (err) {
            alert('❌ Error al importar: ' + err.message);
        }
    };
    input.click();
}

// ==================== VERIFICAR ACCESO ====================
async function verificarAcceso() {
    try {
        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error || !user || user.email !== ADMIN_EMAIL) {
            console.log('❌ Acceso denegado, redirigiendo a login...');
            window.location.href = 'login.html';
            return false;
        }
        
        console.log('✅ Acceso verificado:', user.email);
        return true;
    } catch (error) {
        console.error('Error verificando acceso:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// ==================== OBTENER RESERVAS DIARIAS ====================
async function obtenerReservasDiarias() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const hoyISO = hoy.toISOString();
        
        // Ahora filtramos por 'created_at' para contar los que se SACARON hoy
        const { data, error } = await window.supabase
            .from('reservas')
            .select('created_at, negocio_id')
            .gte('created_at', hoyISO);

        if (error) {
            console.warn('Error al obtener reservas diarias:', error);
            return 0;
        }

        reservasDiariasData = data || [];
        return reservasDiariasData.length;
    } catch (error) {
        console.error('Error obteniendo reservas diarias:', error);
        return 0;
    }
}

// Trae una tabla completa. Supabase corta en 1000 filas por consulta, asi que
// se pide por paginas hasta que devuelve menos de una pagina llena.
async function traerTodo(tabla, columnas, aplicarFiltros) {
    const PAGINA = 1000;
    let desde = 0;
    let todo = [];
    for (let i = 0; i < 20; i++) {
        let q = window.supabase.from(tabla).select(columnas).range(desde, desde + PAGINA - 1);
        if (aplicarFiltros) q = aplicarFiltros(q);
        const { data, error } = await q;
        if (error) { console.warn(`Error leyendo ${tabla}:`, error); break; }
        const filas = data || [];
        todo = todo.concat(filas);
        if (filas.length < PAGINA) break;
        desde += PAGINA;
    }
    return { data: todo };
}

// ==================== CARGAR NEGOCIOS ====================
async function cargarNegocios() {
    try {
        console.log('🔄 Cargando negocios...');
        
        const extrasPromise = window.supabase
            .from('negocios')
            .select('id,sitio_web,ntfy_topic,es_tienda_externa');

        // Para "Salones que necesitan ayuda": sin servicios, sin horarios o con
        // servicios que ningun profesional puede dar => no reciben ni una reserva.
        //
        // OJO: Supabase devuelve como maximo 1000 filas por consulta. Hay 2150
        // servicios y 1290 asignaciones, asi que sin paginar faltaban datos y
        // salones bien configurados aparecian como rotos. Se pagina siempre.
        const saludPromise = Promise.all([
            traerTodo('servicios', 'negocio_id,id', q => q.eq('activo', true)),
            traerTodo('horarios_profesionales', 'negocio_id,dias'),
            traerTodo('servicios_profesionales', 'negocio_id,servicio_id')
        ]);

        const { data, error } = await window.supabase
            .from('vista_negocios_admin')
            .select('*')
            .order('fecha_registro', { ascending: false });

        if (error) {
            console.error('Error en consulta:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No se encontraron negocios');
            return [];
        }
        
        // Eliminar duplicados por ID
        let unique = data.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
        );
        
        const { data: datosUrl, error: errorUrl } = await extrasPromise;
        if (errorUrl) {
            console.warn('No se pudieron cargar las URLs de los negocios:', errorUrl);
        } else if (datosUrl) {
            const extrasPorId = Object.fromEntries(datosUrl.map(n => [n.id, n]));
            unique = unique.map(n => ({
                ...n,
                sitio_web: extrasPorId[n.id]?.sitio_web || n.sitio_web || '',
                ntfy_topic: extrasPorId[n.id]?.ntfy_topic || n.ntfy_topic || '',
                es_tienda_externa: extrasPorId[n.id]?.es_tienda_externa === true
            }));
        }

        try {
            const [rServicios, rHorarios, rAsignaciones] = await saludPromise;
            const servicios = rServicios.data || [];
            const horarios = rHorarios.data || [];
            const asignaciones = rAsignaciones.data || [];

            negociosConServicios = new Set(servicios.map(s => s.negocio_id));
            negociosConHorarios = new Set(horarios.filter(h => (h.dias || []).length > 0).map(h => h.negocio_id));

            // Servicios que ningun profesional puede dar: la clienta los ve pero
            // no puede reservarlos (le paso a HeyStudio con 6 de 7).
            const asignadosPorNegocio = {};
            asignaciones.forEach(a => {
                (asignadosPorNegocio[a.negocio_id] = asignadosPorNegocio[a.negocio_id] || new Set()).add(a.servicio_id);
            });
            serviciosSinProfesionalPorNegocio = {};
            servicios.forEach(s => {
                const asignados = asignadosPorNegocio[s.negocio_id];
                if (!asignados || !asignados.has(s.id)) {
                    serviciosSinProfesionalPorNegocio[s.negocio_id] = (serviciosSinProfesionalPorNegocio[s.negocio_id] || 0) + 1;
                }
            });
        } catch (e) {
            console.warn('No se pudo calcular el estado de configuracion de los salones:', e);
        }

        unique = unique.map(aplicarRectificacionNegocio);
        negociosData = unique;
        console.log(`✅ ${unique.length} negocios cargados`);
        return unique;
    } catch (error) {
        console.error('Error cargando negocios:', error);
        mostrarErrorConexion();
        return [];
    }
}

// ==================== OBTENER RESERVAS DIARIAS POR NEGOCIO ====================
function getReservasDiariasPorNegocio(negocioId) {
    if (!negocioId) return 0;
    return reservasDiariasData.filter(r => r.negocio_id === negocioId).length;
}

async function obtenerActividadReservas(negocioIds = []) {
    try {
        actividadReservasCargada = false;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const hace7 = new Date(hoy);
        hace7.setDate(hace7.getDate() - 6);
        const fechaInicioSemana = hace7.toISOString().split('T')[0];
        const fechaHoy = hoy.toISOString().split('T')[0];

        let querySemana = window.supabase
            .from('reservas')
            .select('negocio_id, fecha, hora_inicio, estado')
            .gte('fecha', fechaInicioSemana)
            .lte('fecha', fechaHoy);
        if (negocioIds.length > 0) {
            querySemana = querySemana.in('negocio_id', negocioIds);
        }
        const { data: semana, error: errorSemana } = await querySemana;

        if (errorSemana) {
            console.warn('Error al obtener reservas de la ultima semana:', errorSemana);
        }

        let queryUltimas = window.supabase
            .from('reservas')
            .select('negocio_id, fecha, hora_inicio, estado')
            .lte('fecha', fechaHoy);
        if (negocioIds.length > 0) {
            queryUltimas = queryUltimas.in('negocio_id', negocioIds);
        }
        queryUltimas = queryUltimas
            .order('fecha', { ascending: false })
            .order('hora_inicio', { ascending: false })
            .limit(5000);
        const { data: ultimas, error: errorUltimas } = await queryUltimas;

        if (errorUltimas) {
            console.warn('Error al obtener ultima cita por negocio:', errorUltimas);
        }

        reservasSemanaData = semana || [];
        ultimaCitaPorNegocio = {};

        (ultimas || []).forEach(reserva => {
            if (reserva.negocio_id && !ultimaCitaPorNegocio[reserva.negocio_id]) {
                ultimaCitaPorNegocio[reserva.negocio_id] = reserva;
            }
        });
        actividadReservasCargada = true;
    } catch (error) {
        console.error('Error obteniendo actividad de reservas:', error);
        reservasSemanaData = [];
        ultimaCitaPorNegocio = {};
        actividadReservasCargada = true;
    }
}

function getReservasSemanaPorNegocio(negocioId) {
    if (!negocioId) return 0;
    return reservasSemanaData.filter(r => r.negocio_id === negocioId).length;
}

function formatearUltimaCita(negocioId) {
    if (!actividadReservasCargada) return 'Cargando actividad...';
    const cita = ultimaCitaPorNegocio[negocioId];
    if (!cita?.fecha) return 'Sin citas registradas';

    const fecha = new Date(`${cita.fecha}T00:00:00`);
    const fechaTexto = fecha.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
    const horaTexto = cita.hora_inicio ? ` ${formatTo12Hour(cita.hora_inicio)}` : '';
    return `${fechaTexto}${horaTexto}`;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizarUrlNegocio(negocio) {
    const rawUrl = negocio.url || negocio.url_negocio || negocio.link || negocio.web || negocio.website || negocio.sitio_web || negocio.dominio || '';
    const url = String(rawUrl).trim();

    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getUrlLabel(url) {
    try {
        return new URL(url).hostname.replace(/^www\./i, '') || url;
    } catch (error) {
        return url;
    }
}

function obtenerPrimerCampo(negocio, campos) {
    for (const campo of campos) {
        const valor = negocio?.[campo];
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
            return String(valor).trim();
        }
    }
    return '';
}

function obtenerSlugNegocio(negocio) {
    return obtenerPrimerCampo(negocio, ['slug_local', 'slug', 'carpeta_local', 'carpeta', 'nombre_slug']);
}

function obtenerUrlPublicaNegocio(negocio) {
    const urlDirecta = normalizarUrlNegocio(negocio);
    if (urlDirecta) return urlDirecta.endsWith('/') ? urlDirecta : `${urlDirecta}/`;

    const slug = obtenerSlugNegocio(negocio);
    return slug ? `https://tusalon.github.io/${slug}/` : '';
}

function obtenerUrlAdminNegocio(negocio) {
    const urlPublica = obtenerUrlPublicaNegocio(negocio);
    return urlPublica ? `${urlPublica.replace(/\/$/, '')}/admin.html` : '';
}

function getVersionUrlNegocio(negocio, carpetaCliente) {
    const urlNegocio = normalizarUrlNegocio(negocio);

    if (urlNegocio) {
        try {
            const baseUrl = urlNegocio.endsWith('/') ? urlNegocio : `${urlNegocio}/`;
            return new URL(APP_VERSION_FILE, baseUrl).href;
        } catch (error) {
            console.warn('No se pudo formar URL de version:', error);
        }
    }

    if (!carpetaCliente) return '';
    return `https://tusalon.github.io/${encodeURIComponent(carpetaCliente)}/${APP_VERSION_FILE}`;
}

function getVersionBadgeHtml(estado, detalle = '') {
    const config = {
        cargando: { className: 'bg-gray-100 text-gray-600', text: 'Version: revisando...' },
        actualizada: { className: 'bg-emerald-100 text-emerald-700', text: `Actualizada ${APP_BASE_VERSION}` },
        pendiente: { className: 'bg-orange-100 text-orange-700', text: 'Pendiente de actualizar' },
        sin_version: { className: 'bg-yellow-100 text-yellow-700', text: 'Sin version publicada' },
        sin_carpeta: { className: 'bg-amber-100 text-amber-700', text: 'Sin carpeta para revisar version' },
        error: { className: 'bg-red-100 text-red-700', text: 'No se pudo revisar version' }
    }[estado] || { className: 'bg-gray-100 text-gray-600', text: 'Version desconocida' };

    return `<span class="inline-flex px-2 py-1 rounded-full text-xs font-semibold ${config.className}">${config.text}${detalle ? ` · ${escapeHtml(detalle)}` : ''}</span>`;
}

async function revisarVersionNegocio(negocio, carpetaCliente) {
    if (!carpetaCliente) return { estado: 'sin_carpeta' };

    const versionUrl = getVersionUrlNegocio(negocio, carpetaCliente);
    if (!versionUrl) return { estado: 'sin_version' };

    if (versionAppCache[versionUrl]) return versionAppCache[versionUrl];

    try {
        const response = await fetch(`${versionUrl}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
            const sinVersion = { estado: 'sin_version' };
            versionAppCache[versionUrl] = sinVersion;
            return sinVersion;
        }

        const data = await response.json();
        const version = String(data.version || '').trim();
        const result = version === APP_BASE_VERSION
            ? { estado: 'actualizada', version }
            : { estado: 'pendiente', version: version || 'sin dato' };
        versionAppCache[versionUrl] = result;
        return result;
    } catch (error) {
        console.warn('Error revisando version de app:', versionUrl, error);
        return { estado: 'error' };
    }
}

function actualizarEstadoVersionesNegocios(negocios) {
    const token = ++versionRenderToken;

    negocios.forEach(async negocio => {
        const el = document.getElementById(`version-app-${negocio.id}`);
        if (!el) return;

        const carpetaCliente = buscarCarpetaCliente(negocio);
        const result = await revisarVersionNegocio(negocio, carpetaCliente);
        if (token !== versionRenderToken) return;

        const detalle = result.estado === 'pendiente' && result.version ? `tiene ${result.version}` : '';
        el.innerHTML = getVersionBadgeHtml(result.estado, detalle);
    });
}

function obtenerSlugDesdeUrl(url) {
    if (!url) return '';

    try {
        const parsed = new URL(url);
        const partes = parsed.pathname.split('/').filter(Boolean);
        return partes[0] || '';
    } catch (error) {
        return '';
    }
}

function obtenerHostnameDesdeUrl(url) {
    if (!url) return '';

    try {
        return new URL(url).hostname.replace(/^www\./i, '').split('.')[0] || '';
    } catch (error) {
        return '';
    }
}

function limpiarValorCmd(value) {
    return String(value || '').replace(/"/g, '').trim();
}

function normalizarParaMatch(value) {
    return limpiarValorCmd(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function aplicarRectificacionNegocio(negocio) {
    const rectificacion = NEGOCIOS_RECTIFICADOS[negocio?.id];
    return rectificacion ? { ...negocio, ...rectificacion } : negocio;
}

function agregarCandidatoCarpeta(candidatos, value) {
    const limpio = limpiarValorCmd(value);
    if (!limpio) return;
    if (!candidatos.some(c => c.toLowerCase() === limpio.toLowerCase())) {
        candidatos.push(limpio);
    }
}

function obtenerCandidatosCarpetaNegocio(negocio) {
    const urlNegocio = normalizarUrlNegocio(negocio);
    const candidatos = [];

    agregarCandidatoCarpeta(candidatos, negocio.carpeta_local);
    agregarCandidatoCarpeta(candidatos, negocio.carpeta);
    agregarCandidatoCarpeta(candidatos, negocio.slug_local);
    agregarCandidatoCarpeta(candidatos, negocio.slug);
    agregarCandidatoCarpeta(candidatos, obtenerSlugDesdeUrl(urlNegocio));
    agregarCandidatoCarpeta(candidatos, obtenerHostnameDesdeUrl(urlNegocio));
    agregarCandidatoCarpeta(candidatos, negocio.nombre);
    agregarCandidatoCarpeta(candidatos, negocio.nombre_negocio);
    agregarCandidatoCarpeta(candidatos, negocio.usuario);

    return candidatos;
}

function elegirMejorCarpeta(candidata, coincidencias) {
    const candidataLower = candidata.toLowerCase();
    const exacta = coincidencias.find(c => c.toLowerCase() === candidataLower);
    if (exacta) return exacta;

    return [...coincidencias].sort((a, b) => {
        const score = value => {
            const lower = value.toLowerCase();
            let puntos = 0;
            if (lower.includes('generados')) puntos += 20;
            if (lower.includes('backup')) puntos += 20;
            if (lower.startsWith('-')) puntos += 10;
            puntos += lower.length / 100;
            return puntos;
        };

        return score(a) - score(b);
    })[0] || '';
}

function buscarCarpetaCliente(negocio) {
    // 1. Prioridad máxima: carpeta guardada manualmente en localStorage
    const guardada = getCarpetaGuardada(negocio?.id);
    if (guardada) return guardada;

    // 2. Mapa hardcodeado
    const carpetaPorId = CARPETAS_CLIENTES_POR_NEGOCIO_ID[String(negocio?.id || '').toLowerCase()];
    if (carpetaPorId) return carpetaPorId;

    // 3. Búsqueda por candidatos (slug, url, nombre, etc.)
    const candidatos = obtenerCandidatosCarpetaNegocio(negocio);
    for (const candidata of candidatos) {
        const candidataNormalizada = normalizarParaMatch(candidata);
        if (!candidataNormalizada) continue;
        const coincidencias = CARPETAS_CLIENTES.filter(carpeta => normalizarParaMatch(carpeta) === candidataNormalizada);
        if (coincidencias.length > 0) return elegirMejorCarpeta(candidata, coincidencias);
    }

    return '';
}

function getNegociosSinCarpeta() {
    return negociosData.filter(negocio => !buscarCarpetaCliente(negocio));
}

function obtenerCarpetaSugerida(negocio) {
    const carpetaEncontrada = buscarCarpetaCliente(negocio);
    if (carpetaEncontrada) return carpetaEncontrada;

    return obtenerCandidatosCarpetaNegocio(negocio)[0] || '';
}

function crearComandoActualizarNegocio(carpetaLocal) {
    const carpeta = limpiarValorCmd(carpetaLocal);
    const target = `${CLIENTES_ROOT_LOCAL}\\${carpeta}`;

    return [
        `cd /d "${AUTOMATION_DIR_LOCAL}"`,
        `node update-client-from-exotic.js --target "${target}" --apply`,
        `cd /d "${SUPERADMIN_DIR_LOCAL}"`,
        `node tools\\mark-client-version.js --target "${target}" --apply`,
        `cd /d "${target}"`,
        'git status',
        'git add .',
        'git commit -m "Actualizar logica de reservas"',
        'git push'
    ].join('\r\n');
}

function crearComandoActualizarNegocioConApk(carpetaLocal) {
    const carpeta = limpiarValorCmd(carpetaLocal);
    const target = `${CLIENTES_ROOT_LOCAL}\\${carpeta}`;

    return [
        `cd /d "${SUPERADMIN_DIR_LOCAL}"`,
        `update-client-and-apk.bat --target "${target}" --apply`
    ].join('\r\n');
}

function crearBloqueActualizarTarget(target, carpetaLocal, indice = 0) {
    const etiqueta = `next_${indice}_${normalizarParaMatch(carpetaLocal) || 'cliente'}`;
    return [
        `echo.`,
        `echo ========================================`,
        `echo Actualizando ${limpiarValorCmd(carpetaLocal)}`,
        `echo ========================================`,
        `if not exist "${target}" (`,
        `  echo ERROR: No existe ${target}`,
        `  goto :${etiqueta}`,
        `)`,
        `cd /d "${AUTOMATION_DIR_LOCAL}"`,
        `node update-client-from-exotic.js --target "${target}" --apply`,
        `cd /d "${SUPERADMIN_DIR_LOCAL}"`,
        `node tools\\mark-client-version.js --target "${target}" --apply`,
        `cd /d "${target}"`,
        `if exist android git restore -- android`,
        `if exist supabase\\.temp git restore -- supabase/.temp`,
        `git status --short`,
        `git add -A -- . ":(exclude).backup-full-sync-*" ":(exclude)*.backup-sync-*" ":(exclude)supabase/.temp" ":(exclude)supabase/.temp/**" ":(exclude)android" ":(exclude)android/**"`,
        `git diff --cached --quiet || git commit -m "Actualizar logica de reservas"`,
        `git push`,
        `:${etiqueta}`
    ].join('\r\n');
}

function crearBloqueActualizarTargetConApk(target, carpetaLocal, indice = 0) {
    const etiqueta = `next_apk_${indice}_${normalizarParaMatch(carpetaLocal) || 'cliente'}`;
    return [
        `echo.`,
        `echo ========================================`,
        `echo Actualizando app y APK de ${limpiarValorCmd(carpetaLocal)}`,
        `echo ========================================`,
        `if not exist "${target}" (`,
        `  echo ERROR: No existe ${target}`,
        `  goto :${etiqueta}`,
        `)`,
        `cd /d "${SUPERADMIN_DIR_LOCAL}"`,
        `call update-client-and-apk.bat --target "${target}" --apply`,
        `:${etiqueta}`
    ].join('\r\n');
}

function crearComandoActualizarNegociosMasivo(negocios, conApk = false) {
    const omitidos = [];
    const bloques = [];

    negocios.forEach((negocio, index) => {
        const carpeta = buscarCarpetaCliente(negocio);
        if (!carpeta) {
            omitidos.push(negocio.nombre || negocio.id || 'Sin nombre');
            return;
        }

        const carpetaLimpia = limpiarValorCmd(carpeta);
        const target = `${CLIENTES_ROOT_LOCAL}\\${carpetaLimpia}`;
        bloques.push(conApk
            ? crearBloqueActualizarTargetConApk(target, carpetaLimpia, index + 1)
            : crearBloqueActualizarTarget(target, carpetaLimpia, index + 1)
        );
    });

    const encabezado = [
        '@echo off',
        'setlocal',
        `echo Actualizacion masiva RservasRoma`,
        `echo Negocios incluidos: ${bloques.length}`,
        `echo Fecha: ${new Date().toLocaleString()}`,
        ''
    ].join('\r\n');

    const cierre = [
        '',
        'echo.',
        'echo Listo. Revisa arriba si algun negocio mostro error.',
        'pause'
    ].join('\r\n');

    return {
        comando: `${encabezado}${bloques.join('\r\n\r\n')}${cierre}`,
        incluidos: bloques.length,
        omitidos
    };
}

async function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copiado = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copiado;
}

async function prepararActualizacionNegocio(negocio) {
    // Si ya hay carpeta guardada, la usa directamente sin prompt
    let carpeta = buscarCarpetaCliente(negocio);
    if (!carpeta) {
        const sugerida = obtenerCarpetaSugerida(negocio);
        carpeta = prompt(`Carpeta local del negocio "${negocio.nombre || 'Sin nombre'}":`, sugerida);
        if (!carpeta) return;
    }
    // Guardar para próximas veces
    setCarpetaGuardada(negocio.id, carpeta);

    const comando = crearComandoActualizarNegocio(carpeta);
    try {
        const copiado = await copiarAlPortapapeles(comando);
        if (!copiado) throw new Error('copy-failed');
        alert(`✅ Comando copiado.\nCarpeta: ${carpeta}\nPegalo en CMD como administrador.`);
    } catch (error) {
        console.error('No se pudo copiar el comando:', error);
        prompt('No se pudo copiar automaticamente. Copia este comando:', comando);
    }
}

async function prepararActualizacionNegocioConApk(negocio) {
    // Si ya hay carpeta guardada, la usa directamente sin prompt
    let carpeta = buscarCarpetaCliente(negocio);
    if (!carpeta) {
        const sugerida = obtenerCarpetaSugerida(negocio);
        carpeta = prompt(`Carpeta local del negocio "${negocio.nombre || 'Sin nombre'}":`, sugerida);
        if (!carpeta) return;
    }
    // Guardar para próximas veces
    setCarpetaGuardada(negocio.id, carpeta);

    const comando = crearComandoActualizarNegocioConApk(carpeta);
    try {
        const copiado = await copiarAlPortapapeles(comando);
        if (!copiado) throw new Error('copy-failed');
        alert(`✅ Comando copiado.\nCarpeta: ${carpeta}\nPegalo en CMD para actualizar app + APK.`);
    } catch (error) {
        console.error('No se pudo copiar el comando:', error);
        prompt('No se pudo copiar automaticamente. Copia este comando:', comando);
    }
}

function getNegociosSeleccionadosActualizacion() {
    return negociosData.filter(negocio => seleccionActualizacion.has(String(negocio.id)));
}

function cargarLotesActualizacion() {
    try {
        const lotes = JSON.parse(localStorage.getItem(LOTES_ACTUALIZACION_KEY) || '[]');
        return Array.isArray(lotes) ? lotes : [];
    } catch (error) {
        console.warn('No se pudieron cargar los lotes de actualizacion:', error);
        return [];
    }
}

function guardarLotesActualizacion(lotes) {
    localStorage.setItem(LOTES_ACTUALIZACION_KEY, JSON.stringify(lotes));
}

function getNegociosPorIds(ids = []) {
    const idsSet = new Set(ids.map(id => String(id)));
    return negociosData.filter(negocio => idsSet.has(String(negocio.id)));
}

function getProximoNombreLote() {
    const total = cargarLotesActualizacion().length + 1;
    return `Lote ${total}`;
}

function renderLotesActualizacion() {
    const contenedor = document.getElementById('lotes-actualizacion-lista');
    const resumen = document.getElementById('lotes-actualizacion-resumen');
    if (!contenedor) return;

    const lotes = cargarLotesActualizacion();
    if (resumen) {
        resumen.textContent = `${lotes.length} lote(s) guardado(s)`;
    }

    if (lotes.length === 0) {
        contenedor.innerHTML = `<p class="text-sm text-gray-500">No hay lotes guardados todavia.</p>`;
        return;
    }

    contenedor.innerHTML = lotes.map(lote => {
        const ids = Array.isArray(lote.ids) ? lote.ids : [];
        const negocios = getNegociosPorIds(ids);
        const conCarpeta = negocios.filter(negocio => buscarCarpetaCliente(negocio)).length;
        const nombres = negocios.slice(0, 4).map(n => n.nombre || buscarCarpetaCliente(n) || n.id).join(', ');
        const resto = negocios.length > 4 ? ` +${negocios.length - 4}` : '';
        const fecha = lote.fecha ? new Date(lote.fecha).toLocaleString() : 'Sin fecha';

        return `
            <div class="border border-gray-200 rounded-lg p-3 bg-white flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-bold text-gray-900">${escapeHtml(lote.nombre || 'Lote')}</span>
                        <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">${ids.length} negocios</span>
                        <span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">${conCarpeta} con carpeta</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">${escapeHtml(fecha)}</p>
                    <p class="text-sm text-gray-600 mt-1">${escapeHtml(nombres || 'Sin negocios visibles')}${escapeHtml(resto)}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="window.cargarLoteActualizacion('${escapeHtml(lote.id)}')" class="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium">Cargar</button>
                    <button onclick="window.actualizarLoteEnNube('${escapeHtml(lote.id)}', false)" class="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold">☁️ En nube</button>
                    <button onclick="window.actualizarLoteEnNube('${escapeHtml(lote.id)}', true)" class="bg-cyan-700 hover:bg-cyan-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold">☁️ + APK</button>
                    <button onclick="window.prepararActualizacionLote('${escapeHtml(lote.id)}', false)" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold">CMD app</button>
                    <button onclick="window.prepararActualizacionLote('${escapeHtml(lote.id)}', true)" class="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-sm font-bold">CMD + APK</button>
                    <button onclick="window.eliminarLoteActualizacion('${escapeHtml(lote.id)}')" class="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
}

function actualizarBarraSeleccionActualizacion() {
    const barra = document.getElementById('barra-actualizacion-masiva');
    const contador = document.getElementById('contador-seleccion-actualizacion');
    const seleccionados = getNegociosSeleccionadosActualizacion();
    const conCarpeta = seleccionados.filter(negocio => buscarCarpetaCliente(negocio)).length;

    if (contador) {
        contador.textContent = `${seleccionados.length} seleccionados | ${conCarpeta} con carpeta`;
    }

    if (barra) {
        barra.classList.toggle('border-purple-300', seleccionados.length > 0);
        barra.classList.toggle('bg-purple-50', seleccionados.length > 0);
    }

    renderLotesActualizacion();
}

function toggleSeleccionActualizacion(negocioId, checked) {
    const id = String(negocioId || '');
    if (!id) return;
    if (checked) {
        seleccionActualizacion.add(id);
    } else {
        seleccionActualizacion.delete(id);
    }
    actualizarBarraSeleccionActualizacion();
}

function seleccionarNegociosVisiblesActualizacion() {
    document.querySelectorAll('.check-actualizacion-negocio:not(:disabled)').forEach(input => {
        input.checked = true;
        seleccionActualizacion.add(String(input.value));
    });
    actualizarBarraSeleccionActualizacion();
}

function limpiarSeleccionActualizacion() {
    seleccionActualizacion.clear();
    document.querySelectorAll('.check-actualizacion-negocio').forEach(input => {
        input.checked = false;
    });
    actualizarBarraSeleccionActualizacion();
}

function guardarSeleccionComoLote() {
    const seleccionados = getNegociosSeleccionadosActualizacion();
    if (seleccionados.length === 0) {
        alert('Marca primero los negocios que quieres guardar en un lote.');
        return;
    }

    const nombre = prompt('Nombre del lote:', getProximoNombreLote());
    if (!nombre) return;

    const lotes = cargarLotesActualizacion();
    const lote = {
        id: `lote-${Date.now()}`,
        nombre: nombre.trim(),
        ids: seleccionados.map(negocio => String(negocio.id)),
        fecha: new Date().toISOString()
    };

    lotes.push(lote);
    guardarLotesActualizacion(lotes);
    renderLotesActualizacion();
    alert(`${lote.nombre} guardado con ${lote.ids.length} negocio(s).`);
}

function guardarSeleccionEnLotesDeDiez() {
    const seleccionados = getNegociosSeleccionadosActualizacion();
    if (seleccionados.length === 0) {
        alert('Marca primero los negocios que quieres dividir en lotes.');
        return;
    }

    const tamano = 10;
    const lotesActuales = cargarLotesActualizacion();
    const baseNombre = prompt('Nombre base para los lotes:', 'Lote');
    if (!baseNombre) return;

    const chunks = [];
    for (let i = 0; i < seleccionados.length; i += tamano) {
        chunks.push(seleccionados.slice(i, i + tamano));
    }

    if (!confirm(`Se guardaran ${chunks.length} lote(s) de hasta ${tamano} negocio(s).`)) return;

    const nuevos = chunks.map((grupo, index) => ({
        id: `lote-${Date.now()}-${index + 1}`,
        nombre: `${baseNombre.trim()} ${lotesActuales.length + index + 1}`,
        ids: grupo.map(negocio => String(negocio.id)),
        fecha: new Date().toISOString()
    }));

    guardarLotesActualizacion([...lotesActuales, ...nuevos]);
    renderLotesActualizacion();
    alert(`Listo. Se guardaron ${nuevos.length} lote(s).`);
}

function cargarLoteActualizacion(loteId) {
    const lote = cargarLotesActualizacion().find(item => String(item.id) === String(loteId));
    if (!lote) {
        alert('No se encontro ese lote.');
        return;
    }

    seleccionActualizacion.clear();
    (lote.ids || []).forEach(id => seleccionActualizacion.add(String(id)));
    document.querySelectorAll('.check-actualizacion-negocio').forEach(input => {
        input.checked = seleccionActualizacion.has(String(input.value));
    });
    actualizarBarraSeleccionActualizacion();
    alert(`${lote.nombre} cargado. Puedes copiar el comando o ajustar la seleccion.`);
}

function eliminarLoteActualizacion(loteId) {
    const lotes = cargarLotesActualizacion();
    const lote = lotes.find(item => String(item.id) === String(loteId));
    if (!lote) return;
    if (!confirm(`Eliminar ${lote.nombre}?`)) return;
    guardarLotesActualizacion(lotes.filter(item => String(item.id) !== String(loteId)));
    renderLotesActualizacion();
}

async function copiarComandoActualizacion(negocios, conApk = false, etiqueta = 'seleccion') {
    const resultado = crearComandoActualizarNegociosMasivo(negocios, conApk);
    if (resultado.incluidos === 0) {
        alert('Los negocios no tienen carpeta local detectada. Revisa el filtro Sin carpeta.');
        return;
    }

    const mensajeOmitidos = resultado.omitidos.length
        ? `\n\nSe omitiran ${resultado.omitidos.length} sin carpeta:\n${resultado.omitidos.slice(0, 10).join(', ')}${resultado.omitidos.length > 10 ? '...' : ''}`
        : '';

    const confirmar = confirm(
        `Se generara un comando para actualizar ${resultado.incluidos} negocio(s)${conApk ? ' con APK' : ''} desde ${etiqueta}.` +
        `${mensajeOmitidos}\n\nLuego pegalo en CMD desde cualquier ruta.`
    );
    if (!confirmar) return;

    try {
        const copiado = await copiarAlPortapapeles(resultado.comando);
        if (!copiado) throw new Error('copy-failed');
        alert(`Comando copiado. Incluye ${resultado.incluidos} negocio(s). Pegalo en CMD.`);
    } catch (error) {
        console.error('No se pudo copiar el comando:', error);
        prompt('No se pudo copiar automaticamente. Copia este comando:', resultado.comando);
    }
}

async function prepararActualizacionSeleccionada(conApk = false) {
    const seleccionados = getNegociosSeleccionadosActualizacion();
    if (seleccionados.length === 0) {
        alert('Marca primero los negocios que quieres actualizar.');
        return;
    }

    await copiarComandoActualizacion(seleccionados, conApk, 'la seleccion actual');
}

async function prepararActualizacionLote(loteId, conApk = false) {
    const lote = cargarLotesActualizacion().find(item => String(item.id) === String(loteId));
    if (!lote) {
        alert('No se encontro ese lote.');
        return;
    }

    const negocios = getNegociosPorIds(lote.ids || []);
    await copiarComandoActualizacion(negocios, conApk, lote.nombre || 'lote');
}

function mostrarErrorConexion() {
    const listaDiv = document.getElementById('lista-negocios');
    if (listaDiv) {
        listaDiv.innerHTML = `
            <div class="max-w-7xl mx-auto p-4">
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    <p class="font-bold">❌ Error de conexión</p>
                    <p>No se pudieron cargar los negocios. Verifica que la vista 'vista_negocios_admin' exista en Supabase.</p>
                    <button onclick="location.reload()" class="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm">Reintentar</button>
                </div>
            </div>
        `;
    }
}

// ==================== ESTADÍSTICAS ====================
function calcularEstadisticas(negocios) {
    const total = negocios.length;
    const activos = negocios.filter(n => n.estado_suscripcion === 'activa').length;
    const suspendidos = negocios.filter(n => n.estado_suscripcion === 'suspendida').length;
    const trial = negocios.filter(n => n.estado_suscripcion === 'trial').length;
    const reservasMes = negocios.reduce((sum, n) => sum + (Number(n.reservas_mes) || 0), 0);
    const reservasSemana = negocios.reduce((sum, n) => sum + getReservasSemanaPorNegocio(n.id), 0);
    const ingresos = negocios.filter(n => n.estado_suscripcion === 'activa').reduce((sum, n) => sum + PRECIO_MENSUAL, 0);
    const porVencer = negocios.filter(n => {
        const dias = n.dias_para_renovar;
        return dias !== null && dias <= 7 && dias > 0 && n.estado_suscripcion === 'activa';
    }).length;
    
    return { total, activos, suspendidos, trial, reservasMes, reservasSemana, ingresos, porVencer };
}

function calcularFechaMasDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split('T')[0];
}

// ==================== ORDENAMIENTO ====================
function ordenarNegocios(negocios, orden) {
    const negociosOrdenados = [...negocios];
    
    if (orden === 'comercial' && window.ordenarPorPrioridadComercial) {
        return window.ordenarPorPrioridadComercial(negociosOrdenados);
    } else if (orden === 'reservas') {
        negociosOrdenados.sort((a, b) => {
            const reservasA = Number(a.reservas_mes) || 0;
            const reservasB = Number(b.reservas_mes) || 0;
            if (reservasB !== reservasA) {
                return reservasB - reservasA;
            }
            // Si hay empate, ordenar por nombre
            return (a.nombre || '').localeCompare(b.nombre || '');
        });
    } else if (orden === 'semana') {
        negociosOrdenados.sort((a, b) => {
            const reservasA = getReservasSemanaPorNegocio(a.id);
            const reservasB = getReservasSemanaPorNegocio(b.id);
            if (reservasB !== reservasA) {
                return reservasB - reservasA;
            }
            const ultimaA = ultimaCitaPorNegocio[a.id]?.fecha || '';
            const ultimaB = ultimaCitaPorNegocio[b.id]?.fecha || '';
            if (ultimaB !== ultimaA) {
                return ultimaB.localeCompare(ultimaA);
            }
            return (a.nombre || '').localeCompare(b.nombre || '');
        });
    } else {
        negociosOrdenados.sort((a, b) => {
            const fechaA = a.fecha_registro ? new Date(a.fecha_registro) : new Date(0);
            const fechaB = b.fecha_registro ? new Date(b.fecha_registro) : new Date(0);
            return fechaB - fechaA;
        });
    }
    
    return negociosOrdenados;
}

function cambiarOrden(orden) {
    ordenActual = orden;
    actualizarListaNegocios();
    actualizarBotonOrden();
}

function actualizarBotonOrden() {
    ['comercial', 'reservas', 'semana', 'fecha'].forEach(orden => {
        const btn = document.getElementById(`order-${orden}`);
        if (!btn) return;

        btn.classList.remove('active', 'bg-purple-600', 'text-white', 'bg-gray-200', 'text-gray-700');
        if (ordenActual === orden) {
            btn.classList.add('active', 'bg-purple-600', 'text-white');
        } else {
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
}

// ==================== ACCIONES ====================
async function activarDesdeTrial(id, nombreNegocio) {
    if (!confirm(`✅ ¿Activar negocio?\n\nNegocio: ${nombreNegocio}\n\nPasará de "Prueba" a "ACTIVO".\n\nPróximo pago en ${DIAS_POR_DEFECTO} días.`)) return;
    
    const nuevaFecha = calcularFechaMasDias(DIAS_POR_DEFECTO);
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ 
                estado: 'activa',
                fecha_renovacion: nuevaFecha,
                monto_ultimo_pago: PRECIO_MENSUAL,
                fecha_ultimo_pago: new Date().toISOString()
            })
            .eq('negocio_id', id);
        
        if (error) throw error;
        alert(`✅ Negocio activado. Próximo pago: ${nuevaFecha}`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function suspenderNegocio(id, nombreNegocio) {
    if (!confirm(`⏸️ ¿Suspender ${nombreNegocio}?\n\nEl negocio no podrá acceder hasta que se reactive.`)) return;
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ estado: 'suspendida' })
            .eq('negocio_id', id);
        
        if (error) throw error;
        alert('✅ Negocio suspendido correctamente');
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function reactivarNegocio(id, nombreNegocio) {
    if (!confirm(`▶️ ¿Reactivar ${nombreNegocio}?\n\nSe generará un nuevo período de ${DIAS_POR_DEFECTO} días.`)) return;
    
    const nuevaFecha = calcularFechaMasDias(DIAS_POR_DEFECTO);
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ 
                estado: 'activa',
                fecha_renovacion: nuevaFecha,
                monto_ultimo_pago: PRECIO_MENSUAL,
                fecha_ultimo_pago: new Date().toISOString()
            })
            .eq('negocio_id', id);
        
        if (error) throw error;
        alert(`✅ Negocio reactivado. Próximo pago: ${nuevaFecha}`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function inactivarNegocio(id, nombreNegocio) {
    if (!confirm(`⚠️ ¿Dar de baja DEFINITIVAMENTE a ${nombreNegocio}?\n\nEsta acción es irreversible.`)) return;
    if (!confirm('Última oportunidad. ¿Estás completamente seguro?')) return;
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ estado: 'inactiva' })
            .eq('negocio_id', id);
        
        if (error) throw error;
        alert('✅ Negocio dado de baja permanentemente');
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

const TABLAS_BORRADO_NEGOCIO = [
    { table: 'lista_espera', column: 'negocio_id', label: 'Lista de espera' },
    { table: 'push_subscriptions', column: 'negocio_id', label: 'Suscripciones push' },
    { table: 'clientes_bloqueados', column: 'negocio_id', label: 'Clientes bloqueados' },
    { table: 'reservas', column: 'negocio_id', label: 'Reservas' },
    { table: 'clientes_autorizados', column: 'negocio_id', label: 'Clientes autorizados' },
    { table: 'horarios_profesionales', column: 'negocio_id', label: 'Horarios profesionales' },
    { table: 'profesionales', column: 'negocio_id', label: 'Profesionales' },
    { table: 'servicios', column: 'negocio_id', label: 'Servicios' },
    { table: 'categorias_servicios', column: 'negocio_id', label: 'Categorias de servicios' },
    { table: 'dias_cerrados', column: 'negocio_id', label: 'Dias cerrados' },
    { table: 'configuracion', column: 'negocio_id', label: 'Configuracion' },
    { table: 'suscripciones', column: 'negocio_id', label: 'Suscripciones' },
    { table: 'roma_finanzas_ingresos', column: 'negocio_id', label: 'RomaFinanzas ingresos' },
    { table: 'roma_finanzas_gastos', column: 'negocio_id', label: 'RomaFinanzas gastos' },
    { table: 'roma_finanzas_materials', column: 'negocio_id', label: 'RomaFinanzas materiales' },
    { table: 'roma_finanzas_services', column: 'negocio_id', label: 'RomaFinanzas servicios' },
    { table: 'roma_finanzas_fichas_costo', column: 'negocio_id', label: 'RomaFinanzas fichas de costo' },
    { table: 'roma_finanzas_config', column: 'negocio_id', label: 'RomaFinanzas configuracion' }
];

function esErrorTablaOColumnaInexistente(error) {
    const code = error?.code;
    const message = String(error?.message || '').toLowerCase();
    return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)
        || message.includes('could not find')
        || message.includes('does not exist')
        || message.includes('schema cache');
}

async function borrarRegistrosPorNegocio({ table, column, label }, negocioId) {
    try {
        const { error, count } = await window.supabase
            .from(table)
            .delete({ count: 'exact' })
            .eq(column, negocioId);

        if (error) {
            if (esErrorTablaOColumnaInexistente(error)) {
                return { table, label, status: 'omitida', detail: error.message };
            }
            return { table, label, status: 'error', detail: error.message };
        }

        return { table, label, status: 'ok', count: count || 0 };
    } catch (error) {
        return { table, label, status: 'error', detail: error.message };
    }
}

async function borrarDatosRelacionadosNegocio(id) {
    const resultados = [];
    for (const tabla of TABLAS_BORRADO_NEGOCIO) {
        resultados.push(await borrarRegistrosPorNegocio(tabla, id));
    }
    return resultados;
}

function limpiarEstadoLocalNegocio(id) {
    pendientesLocal = pendientesLocal.filter(negocioId => negocioId !== id);
    eliminadosLocal = eliminadosLocal.filter(negocioId => negocioId !== id);
    localStorage.setItem('pendientes_admin', JSON.stringify(pendientesLocal));
    localStorage.setItem('eliminados_admin', JSON.stringify(eliminadosLocal));
}

async function borrarNegocioCompleto(id, nombreNegocio) {
    const nombre = nombreNegocio || 'este negocio';
    const primeraConfirmacion = confirm(
        `BORRAR DEFINITIVAMENTE ${nombre} de Supabase?\n\n` +
        'Esto elimina reservas, clientes, profesionales, servicios, configuracion, suscripcion y datos de RomaFinanzas.\n\n' +
        'Esta accion no se puede deshacer.'
    );
    if (!primeraConfirmacion) return;

    const codigo = prompt(`Para confirmar el borrado total de ${nombre}, escribe BORRAR:`);
    if (codigo !== 'BORRAR') {
        alert('Borrado cancelado. No se escribio BORRAR.');
        return;
    }

    try {
        const resultados = await borrarDatosRelacionadosNegocio(id);

        const errores = resultados.filter(resultado => resultado.status === 'error');
        if (errores.length > 0) {
            const detalleErrores = errores
                .slice(0, 10)
                .map(resultado => `${resultado.label}: ${resultado.detail}`)
                .join('\n');
            alert(
                'No se completo el borrado.\n\n' +
                'Supabase bloqueo una o mas tablas. No se borro el negocio principal para evitar dejar datos huerfanos.\n\n' +
                detalleErrores
            );
            return;
        }

        const resultadoNegocio = await borrarRegistrosPorNegocio(
            { table: 'negocios', column: 'id', label: 'Negocio principal' },
            id
        );

        if (resultadoNegocio.status === 'error') {
            alert(
                'Se borraron los datos relacionados, pero no se pudo borrar el negocio principal.\n\n' +
                `${resultadoNegocio.detail}`
            );
            return;
        }

        limpiarEstadoLocalNegocio(id);

        const resumen = resultados
            .filter(resultado => resultado.status === 'ok' && resultado.count > 0)
            .map(resultado => `${resultado.label}: ${resultado.count}`)
            .join('\n') || 'No habia registros relacionados.';

        alert(`Negocio borrado de Supabase.\n\n${resumen}`);
        location.reload();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function reiniciarNegocioCompleto(id, nombreNegocio) {
    const nombre = nombreNegocio || 'este negocio';
    const primeraConfirmacion = confirm(
        `REINICIAR ${nombre} desde cero?\n\n` +
        'Esto borra reservas, clientes, profesionales, servicios, horarios, configuracion, suscripcion y datos de RomaFinanzas.\n\n' +
        'La cuenta y el login del negocio se mantienen: al entrar de nuevo vera el asistente de configuracion inicial.\n\n' +
        'Esta accion no se puede deshacer.'
    );
    if (!primeraConfirmacion) return;

    const codigo = prompt(`Para confirmar el reinicio de ${nombre}, escribe REINICIAR:`);
    if (codigo !== 'REINICIAR') {
        alert('Reinicio cancelado. No se escribio REINICIAR.');
        return;
    }

    try {
        const resultados = await borrarDatosRelacionadosNegocio(id);

        const errores = resultados.filter(resultado => resultado.status === 'error');
        if (errores.length > 0) {
            const detalleErrores = errores
                .slice(0, 10)
                .map(resultado => `${resultado.label}: ${resultado.detail}`)
                .join('\n');
            alert(
                'No se completo el reinicio.\n\n' +
                'Supabase bloqueo una o mas tablas.\n\n' +
                detalleErrores
            );
            return;
        }

        const { error: errorConfigurado } = await window.supabase
            .from('negocios')
            .update({ configurado: false })
            .eq('id', id);

        if (errorConfigurado) {
            alert(
                'Se borraron los datos, pero no se pudo marcar el negocio como no configurado.\n\n' +
                errorConfigurado.message
            );
            return;
        }

        const resumen = resultados
            .filter(resultado => resultado.status === 'ok' && resultado.count > 0)
            .map(resultado => `${resultado.label}: ${resultado.count}`)
            .join('\n') || 'No habia registros relacionados.';

        alert(`Negocio reiniciado.\n\nAl volver a entrar vera el asistente de configuracion inicial.\n\n${resumen}`);
        location.reload();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// FUNCIÓN WHATSAPP ORIGINAL (con mensaje de soporte)
function abrirModalPagadoHasta(id, nombreNegocio, fechaActual = '') {
    const fechaBase = fechaActual || calcularFechaMasDias(DIAS_POR_DEFECTO);
    const modalExistente = document.getElementById('modal-pagado-hasta');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-pagado-hasta';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">Pagado hasta</h3>
                    <p class="text-sm text-gray-500">${escapeHtml(nombreNegocio)}</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-pagado-hasta')?.remove()" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
            <input id="pagado-hasta-fecha" type="date" value="${fechaBase}" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            <label class="block text-sm font-medium text-gray-700 mt-4 mb-1">Monto pagado CUP</label>
            <input id="pagado-hasta-monto" type="number" min="1" step="1" value="${PRECIO_MENSUAL}" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            <p class="text-xs text-gray-500 mt-2">Ejemplo: si eliges septiembre 25, el negocio queda pagado hasta ese dia.</p>
            <div class="flex gap-2 mt-5">
                <button type="button" onclick="document.getElementById('modal-pagado-hasta')?.remove()" class="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">Cancelar</button>
                <button type="button" onclick="window.guardarPagadoHasta('${id}')" class="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700">Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function guardarPagadoHasta(id) {
    const fecha = document.getElementById('pagado-hasta-fecha')?.value;
    const monto = parseFloat(document.getElementById('pagado-hasta-monto')?.value || PRECIO_MENSUAL);

    if (!fecha) {
        alert('Selecciona una fecha valida');
        return;
    }
    if (Number.isNaN(monto) || monto <= 0) {
        alert('Ingresa un monto valido');
        return;
    }

    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({
                fecha_renovacion: fecha,
                monto_ultimo_pago: monto,
                fecha_ultimo_pago: new Date().toISOString()
            })
            .eq('negocio_id', id);

        if (error) throw error;
        document.getElementById('modal-pagado-hasta')?.remove();
        alert(`Pago actualizado. Pagado hasta: ${fecha}`);
        location.reload();
    } catch (error) {
        alert('Error actualizando pago: ' + error.message);
    }
}

// Largo del numero LOCAL por codigo de pais. Sin este dato no se puede saber
// si un numero que empieza por 53 es un movil cubano local (53XXXXXX, 8
// digitos) o uno ya internacional (53 + 8 digitos): esa ambiguedad era la que
// armaba numeros invalidos. Mismos valores que utils/phone-utils.js en el repo
// de rservasroma; si se agrega un pais alla, agregarlo aqui tambien.
const LARGO_LOCAL_POR_PAIS = {
    '1': 10, '7': 10, '33': 9, '34': 9, '39': 10, '49': 11, '51': 9, '52': 10,
    '53': 8, '54': 11, '56': 9, '57': 10, '58': 10, '84': 9, '86': 11,
    '351': 9, '592': 7, '593': 9
};

// Convierte el telefono guardado del negocio en el numero internacional que
// espera wa.me. Antes cada sitio de llamada hacia su propia cuenta ("si no
// empieza por 53 y tiene 8 digitos, ponle 53"), lo que rompia tres casos
// reales: moviles cubanos que empiezan por 53, numeros ya internacionales a
// los que se les pegaba otro 53 delante, y cualquier pais que no fuera Cuba.
function normalizarTelefonoWhatsApp(telefono, codigoPais) {
    const digitos = String(telefono || '').replace(/\D/g, '');
    if (!digitos) return '';

    const cc = String(codigoPais || '').replace(/\D/g, '') || '53';
    const largoLocal = LARGO_LOCAL_POR_PAIS[cc] || 8;

    // Ya trae su propio codigo de pais delante.
    if (digitos.startsWith(cc) && digitos.length > largoLocal) return digitos;

    // Guardado con el codigo de OTRO pais (numero extranjero o negocio cuyo
    // codigo_pais no esta configurado): respetarlo en vez de pegarle un 53.
    const otroPais = Object.keys(LARGO_LOCAL_POR_PAIS)
        .sort((a, b) => b.length - a.length)
        .find(c => digitos.startsWith(c) && digitos.length > LARGO_LOCAL_POR_PAIS[c]);
    if (otroPais && otroPais !== cc) return digitos;

    return cc + digitos;
}

// Los sitios de llamada solo tienen el id del negocio; el codigo de pais vive
// en la fila ya cargada en negociosData.
function codigoPaisDeNegocio(negocioId) {
    const negocio = (typeof negociosData !== 'undefined' ? negociosData : [])
        .find(n => String(n.id) === String(negocioId));
    return negocio?.codigo_pais || '';
}

function enviarWhatsApp(telefono, nombreNegocio, negocioId) {
    if (!telefono || telefono === 'No registrado' || telefono === '') {
        alert(`⚠️ ${nombreNegocio} no tiene número de teléfono registrado`);
        return;
    }

    // Registrar la fecha de último contacto
    registrarUltimoContacto(negocioId, 'soporte');

    const numeroLimpio = normalizarTelefonoWhatsApp(telefono, codigoPaisDeNegocio(negocioId));

    const mensajeCodificado = encodeURIComponent(WHATSAPP_MENSAJE);
    window.open(`https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`, '_blank');
}

// NUEVA FUNCIÓN WHATSAPP SIMPLE (solo "Hola")
function enviarWhatsAppSimple(telefono, nombreNegocio, negocioId) {
    if (!telefono || telefono === 'No registrado' || telefono === '') {
        alert(`⚠️ ${nombreNegocio} no tiene número de teléfono registrado`);
        return;
    }
    
    // Registrar la fecha de último contacto
    registrarUltimoContacto(negocioId, 'hola');

    const numeroLimpio = normalizarTelefonoWhatsApp(telefono, codigoPaisDeNegocio(negocioId));

    const mensajeCodificado = encodeURIComponent("Hola");
    window.open(`https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`, '_blank');
}

// Nueva función para registrar último contacto
function crearMensajeEntregaCliente(negocio) {
    const nombre = obtenerPrimerCampo(negocio, ['nombre', 'nombre_negocio', 'salon', 'negocio']) || 'tu negocio';
    const urlPublica = obtenerUrlPublicaNegocio(negocio);
    const urlAdmin = obtenerUrlAdminNegocio(negocio);
    const usuario = obtenerPrimerCampo(negocio, ['usuario', 'admin_usuario', 'username', 'slug', 'slug_local']);
    const password = obtenerPrimerCampo(negocio, ['password', 'contrasena', 'contraseña', 'admin_password', 'clave']);
    const fechaPago = obtenerPrimerCampo(negocio, ['proximo_pago', 'fecha_renovacion', 'pagado_hasta']);

    return [
        `Hola 😊 ya quedó listo ${nombre} en RservasRoma.`,
        '',
        'Este es el enlace para que tus clientas puedan reservar:',
        urlPublica || 'Enlace pendiente de confirmar',
        '',
        'Panel de administración:',
        urlAdmin || 'Panel pendiente de confirmar',
        '',
        `Usuario: ${usuario || 'pendiente de confirmar'}`,
        `Contraseña: ${password || 'pendiente de confirmar'}`,
        '',
        'Puedes entrar al panel para revisar tus reservas, crear citas manuales, editar servicios, profesionales, horarios, colores y datos del negocio.',
        '',
        'La app ya queda preparada para que tus clientas elijan servicio, fecha y horario disponible sin tener que escribirte primero.',
        '',
        'Incluye recordatorios, estadísticas, control de clientes, disponibilidad semanal/mensual y herramientas de RomaFinanzas para revisar si tus servicios dejan ganancia.',
        '',
        fechaPago ? `Tu acceso queda activo/pagado hasta: ${fechaPago}` : 'La prueba inicial queda activa por 15 días.',
        '',
        'Cuando la pruebes, me avisas cualquier ajuste que quieras hacer y lo revisamos.'
    ].join('\n');
}

async function generarMensajeCliente(negocio) {
    const mensaje = crearMensajeEntregaCliente(negocio);
    const copiado = await copiarAlPortapapeles(mensaje);
    const telefono = obtenerPrimerCampo(negocio, ['telefono', 'whatsapp', 'telefono_negocio']);
    const numeroFinal = normalizarTelefonoWhatsApp(telefono, negocio?.codigo_pais);

    if (copiado) {
        alert('Mensaje copiado. Puedes pegarlo en WhatsApp o editarlo antes de enviarlo.');
    } else {
        prompt('Copia este mensaje para enviarlo al cliente:', mensaje);
    }

    if (numeroFinal) {
        if (confirm('Abrir WhatsApp con este mensaje?')) {
            window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
    }
}

function registrarUltimoContacto(negocioId, tipo) {
    const fecha = new Date();
    const fechaFormateada = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()} ${fecha.getHours()}:${String(fecha.getMinutes()).padStart(2, '0')}`;
    
    if (!ultimaVezEscrito[negocioId]) {
        ultimaVezEscrito[negocioId] = {};
    }
    
    ultimaVezEscrito[negocioId][tipo] = fechaFormateada;
    ultimaVezEscrito[negocioId].ultima = fechaFormateada;
    
    localStorage.setItem('ultima_vez_escrito', JSON.stringify(ultimaVezEscrito));
    
    // Actualizar la vista si estamos en el filtro correcto
    actualizarListaNegocios();
}

// Función para obtener el texto de última vez escrito
function getUltimaVezTexto(negocioId, tipo) {
    const registro = ultimaVezEscrito[negocioId];
    if (!registro) return '';
    
    if (tipo === 'soporte' && registro.soporte) {
        return `📝 ${registro.soporte}`;
    } else if (tipo === 'hola' && registro.hola) {
        return `📝 ${registro.hola}`;
    } else if (tipo === 'ultima' && registro.ultima) {
        return `📝 ${registro.ultima}`;
    }
    
    return '';
}

// FUNCIÓN NOTIFICAR ORIGINAL (con prompt para mensaje personalizado)
async function notificarNegocio(negocio) {
    const mensaje = prompt(`📢 Mensaje para ${negocio.nombre}:`, WHATSAPP_MENSAJE);
    if (!mensaje) return;
    
    const tema = negocio.ntfy_topic || NTFY_TOPIC_GLOBAL;
    
    try {
        const response = await fetch(`https://ntfy.sh/${tema}`, {
            method: 'POST',
            body: mensaje,
            headers: {
                'Title': `📢 Mensaje para ${negocio.nombre}`,
                'Priority': 'default',
                'Tags': 'mega'
            }
        });
        
        if (response.ok) {
            alert('✅ Notificación enviada correctamente');
        } else {
            alert('❌ Error al enviar notificación');
        }
    } catch (error) {
        alert('❌ Error de red: ' + error.message);
    }
}

// NUEVA FUNCIÓN NOTIFICACIÓN DE VENCIMIENTO
async function notificarVencimiento(negocio) {
    const numeroCuenta = prompt(`💰 AVISO DE VENCIMIENTO para ${negocio.nombre}\n\nIngresa el número de cuenta o método de pago para incluir en el mensaje:\n(ej: 1234-5678-9012, Transfermóvil, Enzona, etc.)`);
    
    if (!numeroCuenta) return;
    
    const mensaje = `Hola, mañana vence la suscripción mensual. Por favor realizar el pago a esta cuenta: ${numeroCuenta}`;
    const tema = negocio.ntfy_topic || NTFY_TOPIC_GLOBAL;
    
    try {
        const response = await fetch(`https://ntfy.sh/${tema}`, {
            method: 'POST',
            body: mensaje,
            headers: {
                'Title': `⚠️ Vencimiento de suscripción - ${negocio.nombre}`,
                'Priority': 'high',
                'Tags': 'warning,calendar'
            }
        });
        
        if (response.ok) {
            alert(`✅ Notificación de vencimiento enviada a ${negocio.nombre}\n📨 Mensaje: ${mensaje}`);
        } else {
            alert('❌ Error al enviar notificación');
        }
    } catch (error) {
        alert('❌ Error de red: ' + error.message);
    }
}

async function notificarATodos() {
    const topicsUnicos = Array.from(new Map(
        negociosData.map(n => [(n.ntfy_topic || NTFY_TOPIC_GLOBAL).trim(), n])
    ).entries()).filter(([tema]) => Boolean(tema));

    if (topicsUnicos.length === 0) {
        alert('⚠️ No hay negocios activos para notificar');
        return;
    }

    const mensaje = prompt(`📢 Notificar a ${topicsUnicos.length} negocios activos:\n\nEscribe el mensaje que recibirán todos:`, 'Comunicado importante de Rservas');
    if (!mensaje) return;

    if (!confirm(`Enviar este mensaje a ${topicsUnicos.length} canales ntfy?\n\n${mensaje}`)) return;

    let enviados = 0;
    let errores = 0;
    
    for (const [tema] of topicsUnicos) {
        try {
            const response = await fetch(`https://ntfy.sh/${tema}`, {
                method: 'POST',
                body: mensaje,
                headers: { 
                    'Title': '📢 Comunicado Rservas',
                    'Priority': 'default'
                }
            });
            if (response.ok) enviados++;
            else errores++;
            await new Promise(r => setTimeout(r, 300));
        } catch(e) {
            errores++;
        }
    }
    alert(`✅ Notificaciones enviadas:\n📨 Enviados: ${enviados}\n❌ Errores: ${errores}\n📊 Total: ${activos.length}`);
}

async function exportarCSV() {
    let resultados = [...negociosData];
    if (filtroActual !== 'todos') {
        if (filtroActual === 'eliminados') {
            resultados = resultados.filter(n => eliminadosLocal.includes(n.id));
        } else {
            resultados = resultados.filter(n => n.estado_suscripcion === filtroActual);
        }
    }
    if (filtroBusqueda) {
        resultados = resultados.filter(n => 
            n.nombre?.toLowerCase().includes(filtroBusqueda) ||
            n.telefono?.toLowerCase().includes(filtroBusqueda)
        );
    }
    if (window.aplicarFiltroComercial) {
        resultados = window.aplicarFiltroComercial(resultados);
    }
    
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Estado suscripción', 'Segmento', 'Prioridad', 'Diagnóstico', 'Acción recomendada', 'Estado comercial', 'Última actividad', 'Última cita', 'Próxima cita', 'Reservas históricas', 'Reservas Mes', 'Profesionales', 'Próximo Pago', 'Monto', 'Próximo seguimiento', 'Responsable', 'Objeción', 'Notas'];
    const rows = resultados.map(n => {
        const audit = window.obtenerAuditoriaComercial?.(n.id) || {};
        const tracking = window.obtenerSeguimientoComercial?.(n.id) || {};
        return [
            n.id, n.nombre || '', n.email || '', n.telefono || '', n.estado_suscripcion || '',
            audit.segment || '', tracking.prioridad_manual || audit.priority || '', audit.diagnosis || '', audit.action || '',
            tracking.estado || 'sin_contactar', audit.lastActivity || '', audit.lastPastAppointment || '', audit.nextAppointment || '',
            audit.total || 0, n.reservas_mes || 0, audit.professionalCount ?? n.profesionales_activas ?? 0,
            n.proximo_pago || '', n.monto_ultimo_pago || PRECIO_MENSUAL, tracking.proximo_seguimiento || '',
            tracking.responsable || '', tracking.objecion || '', tracking.notas || ''
        ];
    });
    
    const csvContent = [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `negocios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`📥 Exportados ${resultados.length} negocios`);
}

// ==================== FILTROS ====================
function buscarNegocio(termino) {
    filtroBusqueda = termino.toLowerCase().trim();
    actualizarListaNegocios();
}

function limpiarBusqueda() {
    const buscador = document.getElementById('buscador');
    if (buscador) buscador.value = '';
    filtroBusqueda = "";
    actualizarListaNegocios();
}

function filtrarPorEstado(estado) {
    window.limpiarFiltroComercial?.(false);
    filtroActual = estado;
    actualizarListaNegocios();
    actualizarBotonesFiltro();
}

function actualizarListaNegocios() {
    let resultados = [...negociosData];
    
    // Primero aplicar el filtro de estado
    if (filtroActual === 'pendiente') {
        resultados = resultados.filter(n => pendientesLocal.includes(n.id));
    } else if (filtroActual === 'eliminados') {
        resultados = resultados.filter(n => eliminadosLocal.includes(n.id));
    } else if (filtroActual !== 'todos') {
        resultados = resultados.filter(n => n.estado_suscripcion === filtroActual);
    }
    
    // Luego aplicar búsqueda
    if (filtroBusqueda) {
        resultados = resultados.filter(n => 
            (n.nombre && n.nombre.toLowerCase().includes(filtroBusqueda)) ||
            (n.telefono && n.telefono.toLowerCase().includes(filtroBusqueda))
        );
    }
    if (window.aplicarFiltroComercial) {
        resultados = window.aplicarFiltroComercial(resultados);
    }
    
    // Aplicar ordenamiento
    resultados = ordenarNegocios(resultados, ordenActual);
    
    renderListaNegocios(resultados);
}

function actualizarBotonesFiltro() {
    const estados = ['todos', 'activa', 'suspendida', 'trial', 'pendiente', 'inactiva', 'eliminados'];
    estados.forEach(estado => {
        const btn = document.getElementById(`filtro-${estado}`);
        if (btn) {
            btn.classList.remove('bg-gray-800', 'bg-green-600', 'bg-red-600', 'bg-yellow-600', 'bg-purple-600', 'bg-gray-600', 'bg-pink-600', 'bg-amber-600', 'text-white');
            btn.classList.remove('bg-gray-200', 'bg-green-100', 'bg-red-100', 'bg-yellow-100', 'bg-purple-100', 'bg-gray-100', 'bg-pink-100', 'bg-amber-100', 'text-gray-700', 'text-green-700', 'text-red-700', 'text-yellow-700', 'text-purple-700', 'text-pink-700', 'text-amber-700');
            
            if (filtroActual === estado) {
                if (estado === 'todos') btn.classList.add('bg-gray-800', 'text-white');
                else if (estado === 'activa') btn.classList.add('bg-green-600', 'text-white');
                else if (estado === 'suspendida') btn.classList.add('bg-red-600', 'text-white');
                else if (estado === 'trial') btn.classList.add('bg-yellow-600', 'text-white');
                else if (estado === 'pendiente') btn.classList.add('bg-purple-600', 'text-white');
                else if (estado === 'inactiva') btn.classList.add('bg-gray-600', 'text-white');
                else if (estado === 'eliminados') btn.classList.add('bg-pink-600', 'text-white');
            } else {
                if (estado === 'todos') btn.classList.add('bg-gray-200', 'text-gray-700');
                else if (estado === 'activa') btn.classList.add('bg-green-100', 'text-green-700');
                else if (estado === 'suspendida') btn.classList.add('bg-red-100', 'text-red-700');
                else if (estado === 'trial') btn.classList.add('bg-yellow-100', 'text-yellow-700');
                else if (estado === 'pendiente') btn.classList.add('bg-purple-100', 'text-purple-700');
                else if (estado === 'inactiva') btn.classList.add('bg-gray-100', 'text-gray-700');
                else if (estado === 'eliminados') btn.classList.add('bg-pink-100', 'text-pink-700');
            }
        }
    });
}

// ==================== RENDERIZADO DEL HEADER ====================
// ==================== COBROS DE LA SEMANA ====================
function _medianocheCobro(fecha) {
    const d = new Date(fecha);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diasHastaPago(fecha) {
    if (!fecha) return null;
    return Math.round((_medianocheCobro(fecha) - _medianocheCobro(new Date())) / 86400000);
}

function fechaPagoDe(n) {
    return n.proximo_pago || n.fecha_renovacion || null;
}

// Fecha anterior al corte = dato heredado (prueba vieja). El panel de la duena
// la ignora, asi que aqui tampoco cuenta como deuda.
function esFechaHeredada(fecha) {
    return _medianocheCobro(fecha) < _medianocheCobro(FECHA_CORTE_COBRO);
}

function calcularCobros(negocios) {
    const bloqueados = [];
    const porCobrar = [];
    let heredados = 0;

    (negocios || []).forEach(n => {
        if (eliminadosLocal.includes(n.id)) return;

        if (n.estado_suscripcion === 'suspendida') {
            bloqueados.push({ n, dias: null, fecha: fechaPagoDe(n), motivo: 'suspendida' });
            return;
        }

        const f = fechaPagoDe(n);
        if (!f) return;
        if (esFechaHeredada(f)) { heredados++; return; }

        const d = diasHastaPago(f);
        if (d <= 0) bloqueados.push({ n, dias: d, fecha: f, motivo: 'vencida' });
        else if (d <= 7) porCobrar.push({ n, dias: d, fecha: f });
    });

    porCobrar.sort((a, b) => a.dias - b.dias);
    bloqueados.sort((a, b) => (a.dias ?? 99) - (b.dias ?? 99));
    return { bloqueados, porCobrar, heredados };
}

function _fechaCorta(f) {
    if (!f) return '—';
    try {
        return new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) { return String(f).slice(0, 10); }
}

function _filaCobro(item, tipo) {
    const n = item.n;
    const nombreEscapado = (n.nombre || '').replace(/'/g, "\\'");
    let etiqueta;
    if (item.motivo === 'suspendida') etiqueta = 'Suspendido a mano';
    else if (item.dias === 0) etiqueta = 'Vence HOY';
    else if (item.dias < 0) etiqueta = `Vencido hace ${Math.abs(item.dias)} d`;
    else if (item.dias === 1) etiqueta = 'Vence MAÑANA';
    else etiqueta = `En ${item.dias} días`;

    const color = tipo === 'bloqueado' ? 'text-red-700' : 'text-amber-700';
    const tel = normalizarTelefonoWhatsApp(n.telefono, n.codigo_pais);
    const btnWhats = tel
        ? `<a href="https://wa.me/${tel}?text=${encodeURIComponent(WHATSAPP_MENSAJE)}" target="_blank" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium">WhatsApp</a>`
        : '';

    return `
        <div class="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
            <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-800 text-sm truncate">${n.nombre || '(sin nombre)'}</div>
                <div class="text-xs ${color}">${etiqueta} · ${_fechaCorta(item.fecha)}</div>
            </div>
            <div class="flex gap-1.5 shrink-0">
                ${btnWhats}
                <button onclick="window.abrirModalPagadoHasta('${n.id}', '${nombreEscapado}', '${fechaPagoDe(n) || ''}')"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-medium">Registrar pago</button>
            </div>
        </div>
    `;
}

function renderSeccionCobros() {
    const { bloqueados, porCobrar, heredados } = calcularCobros(negociosData);
    if (bloqueados.length === 0 && porCobrar.length === 0) {
        return `
            <div class="mb-6 bg-white rounded-xl shadow p-4 text-sm text-gray-500">
                💰 <strong class="text-gray-700">Cobros</strong> — nadie vence esta semana ni hay salones bloqueados.
                ${heredados ? `<span class="text-gray-400">(${heredados} con fechas viejas anteriores al ${_fechaCorta(FECHA_CORTE_COBRO)}: no cuentan hasta que les registres un pago)</span>` : ''}
            </div>
        `;
    }

    return `
        <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-white rounded-xl shadow overflow-hidden">
                <div class="bg-red-50 px-4 py-2.5 border-b border-red-100">
                    <span class="font-bold text-red-700 text-sm">🔒 Bloqueados ahora (${bloqueados.length})</span>
                    <p class="text-xs text-red-600 mt-0.5">No pueden entrar a su panel. Sus clientas sí reservan.</p>
                </div>
                <div class="px-4 py-1 max-h-72 overflow-y-auto">
                    ${bloqueados.length ? bloqueados.map(i => _filaCobro(i, 'bloqueado')).join('') : '<p class="text-sm text-gray-400 py-3">Ninguno 🎉</p>'}
                </div>
            </div>

            <div class="bg-white rounded-xl shadow overflow-hidden">
                <div class="bg-amber-50 px-4 py-2.5 border-b border-amber-100">
                    <span class="font-bold text-amber-700 text-sm">⏰ Por cobrar esta semana (${porCobrar.length})</span>
                    <p class="text-xs text-amber-600 mt-0.5">Ya les está avisando la app (3, 2 y 1 día antes).</p>
                </div>
                <div class="px-4 py-1 max-h-72 overflow-y-auto">
                    ${porCobrar.length ? porCobrar.map(i => _filaCobro(i, 'porcobrar')).join('') : '<p class="text-sm text-gray-400 py-3">Nadie vence en 7 días</p>'}
                </div>
            </div>
        </div>
        ${heredados ? `<div class="mb-6 -mt-3 text-xs text-gray-400">ℹ️ ${heredados} salones tienen fechas anteriores al ${_fechaCorta(FECHA_CORTE_COBRO)} (pruebas viejas): el sistema los ignora y no los bloquea hasta que les registres un pago.</div>` : ''}
    `;
}

// ==================== SALONES QUE NECESITAN AYUDA ====================
// Un salon sin servicios, sin horarios o sin profesional asignado a sus
// servicios NO puede recibir ni una reserva, y la duena no siempre se da
// cuenta: cree que la app no sirve y la abandona.
function diagnosticarNegocio(n) {
    const problemas = [];
    if (!Number(n.profesionales_activas)) problemas.push('sin profesional');
    if (!negociosConServicios.has(n.id)) problemas.push('sin servicios');
    if (!negociosConHorarios.has(n.id)) problemas.push('sin horarios');
    const sueltos = serviciosSinProfesionalPorNegocio[n.id] || 0;
    if (sueltos > 0) problemas.push(`${sueltos} servicio${sueltos > 1 ? 's' : ''} sin profesional`);
    return problemas;
}

function calcularSalud(negocios) {
    const criticos = [];
    let totalConProblemas = 0;

    (negocios || []).forEach(n => {
        if (eliminadosLocal.includes(n.id)) return;
        if (n.estado_suscripcion === 'inactiva') return;
        const problemas = diagnosticarNegocio(n);
        if (!problemas.length) return;
        totalConProblemas++;

        // Accionables: los que pagan, o entraron hace poco y siguen a tiempo de
        // arrancar bien. El resto solo suma ruido a la lista.
        const dias = Number(n.dias_activo) || 0;
        const esAccionable = n.estado_suscripcion === 'activa' || dias <= 30;
        if (esAccionable) criticos.push({ n, problemas, dias });
    });

    criticos.sort((a, b) => {
        if ((a.n.estado_suscripcion === 'activa') !== (b.n.estado_suscripcion === 'activa')) {
            return a.n.estado_suscripcion === 'activa' ? -1 : 1;
        }
        return a.dias - b.dias;
    });

    return { criticos, totalConProblemas };
}

function renderSeccionSalud() {
    const { criticos, totalConProblemas } = calcularSalud(negociosData);
    if (!totalConProblemas) return '';

    const filas = criticos.slice(0, 12).map(({ n, problemas, dias }) => {
        const tel = normalizarTelefonoWhatsApp(n.telefono, n.codigo_pais);
        const btnWhats = tel
            ? `<a href="https://wa.me/${tel}?text=${encodeURIComponent(WHATSAPP_MENSAJE)}" target="_blank" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium shrink-0">WhatsApp</a>`
            : '';
        const etiquetaPlan = n.estado_suscripcion === 'activa'
            ? '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">PAGA</span>'
            : `<span class="text-xs text-gray-400">${dias}d</span>`;
        return `
            <div class="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-800 text-sm truncate">${escapeHtml(n.nombre || '(sin nombre)')}</span>
                        ${etiquetaPlan}
                    </div>
                    <div class="text-xs text-red-600">${problemas.map(escapeHtml).join(' · ')}</div>
                </div>
                ${btnWhats}
            </div>
        `;
    }).join('');

    const ocultos = criticos.length > 12 ? criticos.length - 12 : 0;

    return `
        <div class="mb-6 bg-white rounded-xl shadow overflow-hidden">
            <div class="bg-orange-50 px-4 py-2.5 border-b border-orange-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <span class="font-bold text-orange-700 text-sm">🚧 Salones que necesitan ayuda (${criticos.length})</span>
                    <p class="text-xs text-orange-600 mt-0.5">No pueden recibir reservas hasta resolverlo. Se listan los que pagan y los que entraron hace menos de 30 días.</p>
                </div>
                <span class="text-xs text-gray-500">${totalConProblemas} con algo pendiente en total</span>
            </div>
            <div class="px-4 py-1 max-h-80 overflow-y-auto">
                ${filas || '<p class="text-sm text-gray-400 py-3">Ninguno urgente 🎉</p>'}
            </div>
            ${ocultos ? `<div class="px-4 py-2 text-xs text-gray-400 border-t">y ${ocultos} más…</div>` : ''}
        </div>
    `;
}

// ==================== MODERACIÓN ROMAHUB (tiendas externas + reportes) ====================
// Las tiendas externas (es_tienda_externa=true) son vendedores sin cuenta
// rservasroma que se auto-registraron gratis en RomaHub (crear-tienda.html).
// Sin control previo, asi que este panel es la barrera de moderacion:
// ocultarlas (configurado=false) o revisar lo que la gente reporto.
async function cargarReportesTienda() {
    try {
        const { data, error } = await window.supabase
            .from('reportes_tienda')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.warn('No se pudo cargar reportes_tienda (¿corriste el SQL de F5?):', error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.warn('Error cargando reportes de tienda:', error);
        return [];
    }
}

async function ocultarTiendaExterna(id, nombre) {
    if (!confirm(`🚫 ¿Ocultar la tienda "${nombre}" de RomaHub?\n\nDeja de verse en el directorio y el escaparate hasta que la reactives.`)) return;
    try {
        const { error } = await window.supabase.from('negocios').update({ configurado: false }).eq('id', id);
        if (error) throw error;
        alert('✅ Tienda ocultada.');
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function activarTiendaExterna(id, nombre) {
    try {
        const { error } = await window.supabase.from('negocios').update({ configurado: true }).eq('id', id);
        if (error) throw error;
        alert(`✅ "${nombre}" vuelve a verse en RomaHub.`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function resolverReporteTienda(id, estado) {
    try {
        const { error } = await window.supabase.from('reportes_tienda').update({ estado }).eq('id', id);
        if (error) throw error;
        reportesTiendaData = reportesTiendaData.map(r => r.id === id ? { ...r, estado } : r);
        renderHeader();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

function renderSeccionRomaHub() {
    const tiendasExternas = negociosData.filter(n => n.es_tienda_externa === true);
    const pendientes = reportesTiendaData.filter(r => r.estado === 'pendiente');
    if (!tiendasExternas.length && !pendientes.length) return '';

    const negocioPorId = Object.fromEntries(negociosData.map(n => [n.id, n]));
    const reportesPorNegocio = {};
    reportesTiendaData.forEach(r => {
        reportesPorNegocio[r.negocio_id] = (reportesPorNegocio[r.negocio_id] || 0) + (r.estado === 'pendiente' ? 1 : 0);
    });

    const filasTiendas = tiendasExternas.slice(0, 30).map(n => {
        const numReportes = reportesPorNegocio[n.id] || 0;
        const oculta = n.configurado === false;
        const badgeReportes = numReportes > 0
            ? `<span class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">🚩 ${numReportes}</span>`
            : '';
        const badgeEstado = oculta
            ? '<span class="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">Oculta</span>'
            : '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Visible</span>';
        const btnToggle = oculta
            ? `<button onclick="activarTiendaExterna('${n.id}', '${escapeHtml(n.nombre).replace(/'/g, "\\'")}')" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium shrink-0">Reactivar</button>`
            : `<button onclick="ocultarTiendaExterna('${n.id}', '${escapeHtml(n.nombre).replace(/'/g, "\\'")}')" class="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium shrink-0">Ocultar</button>`;
        return `
            <div class="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-medium text-gray-800 text-sm truncate">${escapeHtml(n.nombre || '(sin nombre)')}</span>
                        ${badgeEstado}
                        ${badgeReportes}
                    </div>
                    <div class="text-xs text-gray-400">${escapeHtml(n.provincia || 'sin provincia')}${n.municipio ? ' · ' + escapeHtml(n.municipio) : ''}</div>
                </div>
                ${btnToggle}
            </div>
        `;
    }).join('');

    const filasReportes = pendientes.slice(0, 20).map(r => {
        const negocio = negocioPorId[r.negocio_id];
        const nombreNegocio = negocio ? negocio.nombre : '(negocio eliminado)';
        return `
            <div class="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-medium text-gray-800 text-sm">${escapeHtml(nombreNegocio)}</span>
                        <span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">${escapeHtml(r.motivo)}</span>
                    </div>
                    ${r.detalle ? `<div class="text-xs text-gray-500 mt-0.5">${escapeHtml(r.detalle)}</div>` : ''}
                    <div class="text-xs text-gray-400 mt-0.5">${new Date(r.created_at).toLocaleString('es-ES')}</div>
                </div>
                <div class="flex gap-1.5 shrink-0">
                    ${negocio && negocio.es_tienda_externa ? `<button onclick="ocultarTiendaExterna('${negocio.id}', '${escapeHtml(negocio.nombre).replace(/'/g, "\\'")}')" class="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium">Ocultar</button>` : ''}
                    <button onclick="resolverReporteTienda('${r.id}', 'descartado')" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded text-xs font-medium">Descartar</button>
                    <button onclick="resolverReporteTienda('${r.id}', 'resuelto')" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium">Resuelto</button>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="mb-6 bg-white rounded-xl shadow overflow-hidden">
            <div class="bg-pink-50 px-4 py-2.5 border-b border-pink-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <span class="font-bold text-pink-700 text-sm">🛍️ RomaHub — tiendas externas (${tiendasExternas.length})</span>
                    <p class="text-xs text-pink-600 mt-0.5">Vendedores sin cuenta rservasroma, auto-registrados gratis. ${pendientes.length} reporte(s) sin revisar.</p>
                </div>
            </div>
            ${filasReportes ? `
                <div class="px-4 py-2 bg-orange-50/50 border-b border-orange-100">
                    <p class="text-xs font-bold text-orange-700 mb-1">🚩 Reportes pendientes</p>
                    <div class="max-h-64 overflow-y-auto">${filasReportes}</div>
                </div>
            ` : ''}
            <div class="px-4 py-1 max-h-72 overflow-y-auto">
                ${filasTiendas || '<p class="text-sm text-gray-400 py-3">Ninguna tienda externa todavía.</p>'}
            </div>
            ${tiendasExternas.length > 30 ? `<div class="px-4 py-2 text-xs text-gray-400 border-t">y ${tiendasExternas.length - 30} más…</div>` : ''}
        </div>
    `;
}

function renderHeader() {
    const stats = calcularEstadisticas(negociosData);
    const totalPorEstado = {
        todos: negociosData.length,
        activa: negociosData.filter(n => n.estado_suscripcion === 'activa').length,
        suspendida: negociosData.filter(n => n.estado_suscripcion === 'suspendida').length,
        trial: negociosData.filter(n => n.estado_suscripcion === 'trial').length,
        pendiente: negociosData.filter(n => pendientesLocal.includes(n.id)).length,
        inactiva: negociosData.filter(n => n.estado_suscripcion === 'inactiva').length,
        eliminados: negociosData.filter(n => eliminadosLocal.includes(n.id)).length
    };
    
    // Obtener la fecha actual formateada
    const fechaActual = new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const headerHtml = `
        <div class="max-w-7xl mx-auto p-4 md:p-6">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 class="text-2xl font-bold">👑 Super Admin Panel</h1>
                    <p class="text-gray-600 text-sm">Gestión de negocios Rservas</p>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <button onclick="exportarCSV()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition">📥 Exportar CSV</button>
                    <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">🔄 Recargar</button>
                    <button onclick="logout()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition">🚪 Cerrar Sesión</button>
                </div>
            </div>
            
            <div class="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg overflow-hidden">
                <div class="px-6 py-5">
                    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div class="flex items-center gap-3">
                            <div class="text-4xl md:text-5xl">📅</div>
                            <div>
                                <p class="text-purple-100 text-sm">RESERVAS SACADAS HOY</p>
                                <p class="text-white text-xs opacity-80">${fechaActual}</p>
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="reservas-diarias-number text-5xl md:text-7xl font-bold text-white drop-shadow-lg">
                                ${reservasDiarias}
                            </div>
                            <p class="text-purple-100 text-sm mt-1">reservas en total</p>
                        </div>
                        <div class="text-right">
                            <p class="text-purple-100 text-xs">📊 Última actualización</p>
                            <p class="text-white text-sm">${new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            ${renderSeccionRomaHub()}

            ${window.renderEmbudoComercial ? window.renderEmbudoComercial() : ''}

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <div class="bg-white p-3 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-gray-800">${stats.total}</div>
                    <div class="text-gray-600 text-xs">Total Negocios</div>
                </div>
                <div class="bg-white p-3 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-green-600">${stats.activos}</div>
                    <div class="text-gray-600 text-xs">🟢 Activos</div>
                </div>
                <div class="bg-white p-3 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-red-600">${stats.suspendidos}</div>
                    <div class="text-gray-600 text-xs">🔴 Suspendidos</div>
                </div>
                <div class="bg-white p-3 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-yellow-600">${stats.trial}</div>
                    <div class="text-gray-600 text-xs">🟡 En Prueba</div>
                </div>
                <div class="bg-white p-3 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-purple-600">${stats.reservasMes}</div>
                    <div class="text-gray-600 text-xs">📅 Reservas (mes)</div>
                </div>
                <div class="bg-white p-3 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-orange-600">${stats.porVencer}</div>
                    <div class="text-gray-600 text-xs">⚠️ Vencen 7d</div>
                </div>
            </div>
            
            <div class="mb-4">
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <input type="text" 
                           id="buscador" 
                           placeholder="🔍 Buscar por nombre o teléfono..."
                           class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-base"
                           oninput="buscarNegocio(this.value)"
                           autocomplete="off">
                </div>
                <p class="text-xs text-gray-400 mt-1">💡 Busca por nombre o cualquier parte del teléfono</p>
            </div>
            
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <span class="text-sm text-gray-500 font-medium">Ordenar por:</span>
                <button id="order-comercial" onclick="cambiarOrden('comercial')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-gray-200 text-gray-700">🎯 Prioridad comercial</button>
                <button id="order-semana" onclick="cambiarOrden('semana')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-gray-200 text-gray-700">Ultima semana</button>
                <button id="order-reservas" onclick="cambiarOrden('reservas')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-purple-600 text-white">🏆 Más reservas</button>
                <button id="order-fecha" onclick="cambiarOrden('fecha')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-gray-200 text-gray-700">📅 Más recientes</button>
            </div>
            
            <div class="mb-6 flex flex-wrap gap-3 items-center justify-between">
                <div class="flex gap-2 flex-wrap">
                    <button onclick="notificarATodos()" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm transition">📢 Notificar a TODOS</button>
                    <button onclick="notificarTurnosHoy()" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm transition font-bold">Turnos Hoy</button>
                    <button onclick="notificarTurnosManana()" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm transition font-bold">🔔 Turnos Mañana</button>
                </div>
                <span class="text-xs text-gray-500">💰 ${PRECIO_MENSUAL} CUP/mes | ⏱️ +${DIAS_POR_DEFECTO} días</span>
            </div>
            
            ${renderSeccionCobros()}

            ${renderSeccionSalud()}

            <div class="flex gap-2 flex-wrap mb-6 border-b pb-4">
                <button id="filtro-todos" onclick="filtrarPorEstado('todos')" class="px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-white">📋 Todos (${totalPorEstado.todos})</button>
                <button id="filtro-activa" onclick="filtrarPorEstado('activa')" class="px-3 py-1.5 rounded-lg text-sm bg-green-100 text-green-700">🟢 Activos (${totalPorEstado.activa})</button>
                <button id="filtro-suspendida" onclick="filtrarPorEstado('suspendida')" class="px-3 py-1.5 rounded-lg text-sm bg-red-100 text-red-700">🔴 Suspendidos (${totalPorEstado.suspendida})</button>
                <button id="filtro-trial" onclick="filtrarPorEstado('trial')" class="px-3 py-1.5 rounded-lg text-sm bg-yellow-100 text-yellow-700">🟡 Prueba (${totalPorEstado.trial})</button>
                <button id="filtro-pendiente" onclick="filtrarPorEstado('pendiente')" class="px-3 py-1.5 rounded-lg text-sm bg-purple-100 text-purple-700">👀 Pendientes (${totalPorEstado.pendiente})</button>
                <button id="filtro-inactiva" onclick="filtrarPorEstado('inactiva')" class="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700">⚫ Bajas (${totalPorEstado.inactiva})</button>
                <button id="filtro-eliminados" onclick="filtrarPorEstado('eliminados')" class="px-3 py-1.5 rounded-lg text-sm bg-pink-100 text-pink-700">🗑️ Eliminados (${totalPorEstado.eliminados})</button>
            </div>
        </div>
    `;
    
    const panelHeader = document.getElementById('panel-header');
    if (panelHeader) {
        panelHeader.innerHTML = headerHtml;
    }
}

// ==================== RENDERIZADO DE LISTA ====================
function renderListaNegocios(negocios) {
    let html = `<div class="max-w-7xl mx-auto p-4 md:p-6 pt-0">`;
    
    if (filtroBusqueda) {
        html += `<div class="mb-3 text-sm text-gray-500">🔍 Resultados para: "${filtroBusqueda}" (${negocios.length} encontrados)</div>`;
    }
    
    html += `<div class="grid gap-4">`;
    
    if (negocios.length === 0) {
        html += `<div class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    <div class="text-5xl mb-3">🔍</div>
                    <p class="text-lg">No se encontraron negocios</p>
                    <button onclick="limpiarBusqueda()" class="mt-3 text-purple-600 hover:text-purple-800 underline">Limpiar búsqueda</button>
                </div>`;
    }
    
    negocios.forEach((n, index) => {
        const fechaProximo = n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido';
        const fechaUltimo = n.fecha_ultimo_pago ? new Date(n.fecha_ultimo_pago).toLocaleDateString() : 'No registrado';
        const diasRestantes = n.dias_para_renovar || 0;
        const reservasHoy = getReservasDiariasPorNegocio(n.id);
        const esPendiente = pendientesLocal.includes(n.id);
        const esEliminado = eliminadosLocal.includes(n.id);
        const ultimoSoporte = getUltimaVezTexto(n.id, 'soporte');
        const ultimoHola = getUltimaVezTexto(n.id, 'hola');
        const urlNegocio = normalizarUrlNegocio(n);
        const urlLabel = urlNegocio ? escapeHtml(getUrlLabel(urlNegocio)) : '';
        
        const estadoConfig = {
            'activa': { color: 'border-green-500', text: '🟢 Activo', bg: 'bg-green-100 text-green-700' },
            'suspendida': { color: 'border-red-500', text: '🔴 Suspendido', bg: 'bg-red-100 text-red-700' },
            'trial': { color: 'border-yellow-500', text: '🟡 Prueba', bg: 'bg-yellow-100 text-yellow-700' },
            'inactiva': { color: 'border-gray-500', text: '⚫ Inactivo', bg: 'bg-gray-100 text-gray-700' },
            'pendiente': { color: 'border-purple-500', text: '👀 Pendiente', bg: 'bg-purple-100 text-purple-700' }
        };
        const ec = estadoConfig[n.estado_suscripcion] || estadoConfig.activa;
        
        let nombreMostrado = n.nombre || 'Sin nombre';
        let telefonoMostrado = n.telefono || 'No registrado';
        
        if (filtroBusqueda) {
            const regex = new RegExp(`(${filtroBusqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            nombreMostrado = nombreMostrado.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
            if (n.telefono) {
                telefonoMostrado = n.telefono.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
            }
        }
        
        // Mostrar un indicador visual si el negocio tiene muchas reservas
        const posicionRanking = index + 1;
        const esTopReservas = ordenActual === 'reservas' && index < 3 && Number(n.reservas_mes) > 0;
        const medallaTop = esTopReservas ? (negocios.indexOf(n) === 0 ? '🥇 ' : (negocios.indexOf(n) === 1 ? '🥈 ' : '🥉 ')) : '';
        
        html += `
            <div class="bg-white rounded-lg shadow border-l-4 ${ec.color} p-4 fade-in flex flex-col">
                <div class="flex flex-col md:flex-row justify-between items-start gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 class="font-bold text-lg">${medallaTop}🏢 ${nombreMostrado}</h2>
                            ${ordenActual === 'reservas' ? `<span class="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 font-bold">Lugar #${posicionRanking}</span>` : ''}
                            <span class="px-2 py-1 rounded-full text-xs ${ec.bg} font-medium">${ec.text}</span>
                            ${reservasHoy > 0 ? `<span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">📅 +${reservasHoy} hoy</span>` : ''}
                            ${esEliminado ? `<span class="px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-700 font-medium">🗑️ Eliminado</span>` : ''}
                        </div>
                        <p class="text-sm text-gray-600">📧 ${n.email || 'No registrado'}</p>
                        <p class="text-sm text-gray-600">📱 ${telefonoMostrado}</p>
                        ${urlNegocio ? `<p class="text-sm text-gray-600"><a href="${escapeHtml(urlNegocio)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">Abrir negocio (${urlLabel})</a></p>` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4 text-sm border-t pt-3">
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">📊 Reservas (mes)</div>
                        <div class="font-bold text-lg ${Number(n.reservas_mes) > 0 ? 'text-purple-600' : 'text-gray-400'}">${n.reservas_mes || 0}</div>
                        ${ordenActual === 'reservas' ? `<div class="text-xs text-purple-500 font-semibold">#${posicionRanking} en reservas</div>` : ''}
                    </div>
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">👥 Profesionales</div>
                        <div class="font-bold text-lg">${n.profesionales_activas || 0}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">📅 Antigüedad</div>
                        <div class="font-bold text-lg">${n.dias_activo || 0} d</div>
                    </div>
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">💰 Monto mensual</div>
                        <div class="font-bold text-lg">${n.monto_ultimo_pago || PRECIO_MENSUAL}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">🔥 Reservas hoy</div>
                        <div class="font-bold text-lg ${reservasHoy > 0 ? 'text-orange-500' : 'text-gray-400'}">${reservasHoy}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">Ult. 7 dias</div>
                        <div class="font-bold text-lg ${getReservasSemanaPorNegocio(n.id) > 0 ? 'text-emerald-600' : 'text-gray-400'}">${getReservasSemanaPorNegocio(n.id)}</div>
                    </div>
                </div>
                
                <div class="flex flex-col md:flex-row justify-between text-xs mt-3 text-gray-500 gap-2 pb-3 border-b">
                    <div>Ultima cita: ${formatearUltimaCita(n.id)}</div>
                    <div>💳 Último pago: ${fechaUltimo}</div>
                    <div class="${diasRestantes <= 3 && n.estado_suscripcion === 'activa' ? 'text-red-600 font-bold' : ''}">⏰ Próximo pago: ${fechaProximo} ${diasRestantes > 0 ? `(faltan ${diasRestantes} días)` : diasRestantes < 0 ? '(VENCIDO)' : ''}</div>
                </div>

                ${window.renderFichaComercial ? window.renderFichaComercial(n) : ''}

                <div class="mt-3 flex flex-wrap gap-2">
                    <button onclick="window.togglePendiente('${n.id}')" class="${esPendiente ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">
                        ${esPendiente ? '✔️ Quitar Pendiente' : '👀 Marcar Pendiente'}
                    </button>
                    ${n.estado_suscripcion === 'trial' ? `<button onclick="window.activarDesdeTrial('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">✅ Activar</button>` : ''}
                    ${n.estado_suscripcion === 'suspendida' ? `<button onclick="window.reactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">▶️ Reactivar</button>` : ''}
                    ${n.estado_suscripcion === 'activa' ? `<button onclick="window.suspenderNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">⏸️ Suspender</button>` : ''}
                    
                    <button onclick="window.abrirModalPagadoHasta('${n.id}', '${n.nombre.replace(/'/g, "\\'")}', '${n.proximo_pago || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Pagado hasta</button>

                    <div class="flex flex-col gap-1">
                        <button onclick="window.enviarWhatsApp('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}', '${n.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">💬 Soporte</button>
                        ${ultimoSoporte ? `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${ultimoSoporte}</span>` : ''}
                    </div>
                    
                    <div class="flex flex-col gap-1">
                        <button onclick="window.enviarWhatsAppSimple('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}', '${n.id}')" class="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">💚 WhatsApp Hola</button>
                        ${ultimoHola ? `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${ultimoHola}</span>` : ''}
                    </div>

                    <button onclick="window.generarMensajeCliente(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Mensaje cliente</button>
                    
                    <button onclick="window.notificarNegocio(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">🔔 Notificar</button>
                    
                    <button onclick="window.notificarVencimiento(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">⚠️ Avisar Vencimiento</button>
                    
                    <button onclick="window.borrarNegocioCompleto('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Borrar Supabase</button>

                    <button onclick="window.reiniciarNegocioCompleto('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Reiniciar cuenta</button>

                    <button onclick="window.toggleEliminado('${n.id}')" class="${esEliminado ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'} px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">
                        ${esEliminado ? '👁️ Mostrar en Principal' : '🙈 Ocultar de Vista'}
                    </button>
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    
    const listaNegocios = document.getElementById('lista-negocios');
    if (listaNegocios) {
        listaNegocios.innerHTML = html;
        actualizarBarraSeleccionActualizacion();
        actualizarEstadoVersionesNegocios(negocios);
    }
}

// ==================== FUNCIONES DE UI ====================
async function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        try {
            await window.supabase.auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = 'login.html';
        }
    }
}

// ==================== FUNCIONES NUEVAS ====================
function togglePendiente(id) {
    const index = pendientesLocal.indexOf(id);
    
    if (index > -1) {
        pendientesLocal.splice(index, 1);
    } else {
        pendientesLocal.push(id);
    }
    
    localStorage.setItem('pendientes_admin', JSON.stringify(pendientesLocal));
    actualizarListaNegocios();
    renderHeader();
}

function toggleEliminado(id) {
    const index = eliminadosLocal.indexOf(id);
    
    if (index > -1) {
        eliminadosLocal.splice(index, 1);
    } else {
        eliminadosLocal.push(id);
    }
    
    localStorage.setItem('eliminados_admin', JSON.stringify(eliminadosLocal));
    
    // Si estamos en la vista de eliminados y quitamos el último, volver a todos
    if (filtroActual === 'eliminados' && eliminadosLocal.length === 0) {
        filtroActual = 'todos';
    }
    
    actualizarListaNegocios();
    renderHeader();
}

// Helper copiado de Node.js para formatear la hora a 12h
function formatTo12Hour(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    hour12 = hour12 === 0 ? 12 : hour12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

async function notificarTurnosPorFecha(diasAdelante = 1) {
    const esHoy = diasAdelante === 0;
    const etiquetaDia = esHoy ? 'hoy' : 'mañana';
    const selectorBoton = esHoy ? 'button[onclick="notificarTurnosHoy()"]' : 'button[onclick="notificarTurnosManana()"]';
    const textoBotonFallback = esHoy ? 'Turnos Hoy' : '🔔 Turnos Mañana';

    // 1. Obtener todos los activos/trial
    const elegibles = negociosData.filter(n => n.estado_suscripcion === 'activa' || n.estado_suscripcion === 'trial');
    
    if (elegibles.length === 0) {
        alert('⚠️ No hay negocios activos o en prueba.');
        return;
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Havana',
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const partesCuba = Object.fromEntries(formatter.formatToParts(new Date()).map(p => [p.type, p.value]));
    const baseCuba = new Date(`${partesCuba.year}-${partesCuba.month}-${partesCuba.day}T00:00:00Z`);
    baseCuba.setUTCDate(baseCuba.getUTCDate() + diasAdelante);

    const year = baseCuba.getUTCFullYear();
    const month = String(baseCuba.getUTCMonth() + 1).padStart(2, '0');
    const day = String(baseCuba.getUTCDate()).padStart(2, '0');
    const fechaSQL = `${year}-${month}-${day}`;

    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diaSemana = dias[baseCuba.getUTCDay()];
    const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    const fechaLegible = `${diaSemanaCapitalizado} ${baseCuba.getUTCDate()} de ${meses[baseCuba.getUTCMonth()]} de ${year}`;

    try {
        // 2. Traer SOLO los turnos del día elegido que estén "Reservados"
        const { data: turnos, error } = await window.supabase
            .from('reservas')
            .select('negocio_id, cliente_nombre, cliente_whatsapp, servicio, profesional_nombre, hora_inicio')
            .eq('fecha', fechaSQL)
            .eq('estado', 'Reservado'); 

        if (error) throw error;

        if (!turnos || turnos.length === 0) {
            alert(`No hay NINGÚN turno registrado para ${etiquetaDia} en todo el sistema.`);
            return;
        }

        // Agrupar los turnos por negocio_id
        const turnosPorNegocio = turnos.reduce((acc, t) => {
            if (!acc[t.negocio_id]) acc[t.negocio_id] = [];
            acc[t.negocio_id].push(t);
            return acc;
        }, {});

        // 3. EL GRAN FILTRO: Seleccionar solo negocios que tengan turnos en el objeto anterior
        const negociosConTurnos = elegibles.filter(neg => turnosPorNegocio[neg.id] && turnosPorNegocio[neg.id].length > 0);

        if (negociosConTurnos.length === 0) {
            alert(`Ninguno de los negocios activos tiene turnos para ${etiquetaDia}.`);
            return;
        }

        if (!confirm(`🔔 ¿Notificar turnos a los ${negociosConTurnos.length} negocios que SÍ tienen reservas ${etiquetaDia}?\n\n(Se han descartado los que tienen la agenda vacía para ahorrar tiempo)`)) return;

        const btnNotificar = document.querySelector(selectorBoton);
        const textoOriginalBtn = btnNotificar ? btnNotificar.innerHTML : textoBotonFallback;
        if (btnNotificar) btnNotificar.innerHTML = `⏳ Procesando 0/${negociosConTurnos.length}...`;

        // 4. Buscar solo los topics de los negocios que sí tienen turnos
        const { data: topicsData } = await window.supabase
            .from('negocios')
            .select('id, ntfy_topic')
            .in('id', negociosConTurnos.map(n => n.id)); 
            
        const mapTopics = {};
        if (topicsData) {
            topicsData.forEach(n => mapTopics[n.id] = n.ntfy_topic);
        }

        let enviados = 0, errores = 0;
        let temasUsados = new Set();
        let negociosSinTopic = [];
        let procesados = 0;

        // 5. Procesar únicamente la lista limpia
        for (const neg of negociosConTurnos) {
            procesados++;
            if (btnNotificar) btnNotificar.innerHTML = `⏳ Enviando ${procesados}/${negociosConTurnos.length}...`;

            const turnosNegocio = turnosPorNegocio[neg.id];
            turnosNegocio.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
            
            let ntfyTopic = mapTopics[neg.id]; 
            
            if (!ntfyTopic || ntfyTopic.trim() === '') {
                ntfyTopic = NTFY_TOPIC_GLOBAL;
                negociosSinTopic.push(neg.nombre);
            } else {
                ntfyTopic = ntfyTopic.trim();
            }

            temasUsados.add(ntfyTopic);

            const tituloMensaje = `${neg.nombre}: ${turnosNegocio.length} turnos para ${etiquetaDia}`;
            
            const porProfesional = {};
            const porServicio = {};
            
            turnosNegocio.forEach(turno => {
                const profesional = turno.profesional_nombre || 'No asignado';
                const servicio = turno.servicio || 'No especificado';
                porProfesional[profesional] = (porProfesional[profesional] || 0) + 1;
                porServicio[servicio] = (porServicio[servicio] || 0) + 1;
            });

            let cuerpoMensaje = `🌟 *${neg.nombre}*\n📅 ${fechaLegible}\n📊 Total: ${turnosNegocio.length} turno${turnosNegocio.length !== 1 ? 's' : ''}\n━━━━━━━━━━━━━━━━━━━━━\n`;
            
            turnosNegocio.forEach((turno, index) => {
                const hora = formatTo12Hour(turno.hora_inicio);
                const profesional = turno.profesional_nombre || 'No asignado';
                const servicio = turno.servicio || '?';
                
                cuerpoMensaje += `${index + 1}. ${hora} | ${turno.cliente_nombre}\n`;
                cuerpoMensaje += `   💅 ${servicio} | 👩‍🎨 ${profesional}\n`;
                cuerpoMensaje += `   📱 ${turno.cliente_whatsapp || '---'}\n`;
                if (index < turnosNegocio.length - 1) cuerpoMensaje += `\n`;
            });

            if (Object.keys(porProfesional).length > 0) {
                cuerpoMensaje += `\n━━━━━━━━━━━━━━━━━━━━━\n📊 *Por profesional:*\n`;
                for (const [prof, count] of Object.entries(porProfesional)) {
                    cuerpoMensaje += `• ${prof}: ${count}\n`;
                }
            }
            
            if (Object.keys(porServicio).length > 0) {
                cuerpoMensaje += `\n📊 *Por servicio:*\n`;
                for (const [serv, count] of Object.entries(porServicio)) {
                    cuerpoMensaje += `• ${serv}: ${count}\n`;
                }
            }
            
            cuerpoMensaje += `\n💖 *${neg.nombre}*`;

            const tituloLimpio = tituloMensaje.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, ' ').trim();

            try {
                const resp = await fetch(`https://ntfy.sh/${ntfyTopic}`, {
                    method: 'POST',
                    body: cuerpoMensaje,
                    headers: { 
                        'Title': tituloLimpio,
                        'Priority': 'default',
                        'Tags': 'bell'
                    }
                });
                
                if (resp.ok) enviados++; else errores++;
                
                // Mantenemos 2.5s pero como son muchos menos negocios, terminará rapidísimo
                await new Promise(r => setTimeout(r, 2500)); 
                
            } catch(e) { 
                errores++; 
            }
        }

        if (btnNotificar) btnNotificar.innerHTML = textoOriginalBtn;

        const canalesFinales = Array.from(temasUsados);
        let reporteFinal = `✅ Proceso finalizado:\n📨 Enviados a NTFY: ${enviados}\n❌ Errores: ${errores}\n\n📡 Canales contactados (${canalesFinales.length}):\n${canalesFinales.join(', ')}`;
        
        if (negociosSinTopic.length > 0) {
            console.warn("⚠️ Negocios sin ntfy_topic configurado:", negociosSinTopic);
        }

        alert(reporteFinal);
        
    } catch (error) {
        const btnNotificar = document.querySelector(selectorBoton);
        if (btnNotificar) btnNotificar.innerHTML = textoBotonFallback;
        alert('❌ Error general: ' + error.message);
    }
}

async function notificarTurnosHoy() {
    return notificarTurnosPorFecha(0);
}

async function notificarTurnosManana() {
    return notificarTurnosPorFecha(1);
}

// ==================== TOKEN GITHUB ====================
function configurarTokenGitHub() {
    const actual = localStorage.getItem('gh_token_superadmin') || '';
    const nuevo = prompt('Token de GitHub (ghp_...):\n\nSe guarda solo en este navegador, nunca en el servidor.', actual);
    if (nuevo === null) return;
    if (!nuevo.trim()) {
        localStorage.removeItem('gh_token_superadmin');
        window.GH_TOKEN = '';
        alert('Token eliminado.');
    } else {
        localStorage.setItem('gh_token_superadmin', nuevo.trim());
        window.GH_TOKEN = nuevo.trim();
        alert('✅ Token guardado. Ya puedes usar "Actualizar en nube".');
    }
}

function tieneTokenGitHub() {
    return Boolean(window.GH_TOKEN);
}

// ==================== ACTUALIZACIÓN EN NUBE ====================
async function dispararWorkflowActualizacion(repoSlug, conApk = false) {
    const url = `https://api.github.com/repos/${window.GH_OWNER}/${window.GH_SUPERADMIN_REPO}/actions/workflows/actualizar-cliente.yml/dispatches`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `token ${window.GH_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main', inputs: { repo: repoSlug, con_apk: conApk ? 'true' : 'false' } })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API ${response.status}: ${text}`);
    }
}

async function actualizarClienteEnNube(negocio, conApk = false) {
    if (!tieneTokenGitHub()) {
        if (confirm('No hay token de GitHub configurado.\n\n¿Configurarlo ahora?')) configurarTokenGitHub();
        return;
    }
    const slug = buscarCarpetaCliente(negocio);
    if (!slug) {
        alert(`No se detectó carpeta/repo para ${negocio.nombre}. Verifica el slug del negocio.`);
        return;
    }

    const etiqueta = conApk ? 'app web + APK Android' : 'app web';
    if (!confirm(`☁️ Actualizar ${negocio.nombre} (${etiqueta})?\n\nRepo: ${slug}\n\nNo necesitas abrir CMD ni tener las carpetas locales.`)) return;

    const btnId = conApk ? `btn-nube-apk-${negocio.id}` : `btn-nube-${negocio.id}`;
    const btn = document.getElementById(btnId);
    if (btn) { btn.textContent = '⏳ Disparando...'; btn.disabled = true; }

    try {
        await dispararWorkflowActualizacion(slug, conApk);
        if (btn) { btn.textContent = '✅ En cola'; btn.style.background = '#16a34a'; }
        setTimeout(() => {
            if (btn) { btn.textContent = conApk ? '☁️ + APK' : '☁️ Actualizar'; btn.disabled = false; btn.style.background = ''; }
        }, 5000);
        alert(`✅ Workflow iniciado para ${negocio.nombre} (${etiqueta}).\n\nProgreso en:\nhttps://github.com/${window.GH_OWNER}/${window.GH_SUPERADMIN_REPO}/actions`);
    } catch (error) {
        if (btn) { btn.textContent = '❌ Error'; btn.disabled = false; }
        alert(`❌ Error al disparar workflow: ${error.message}`);
    }
}

async function actualizarSeleccionadosEnNube(conApk = false) {
    if (!tieneTokenGitHub()) {
        if (confirm('No hay token de GitHub configurado.\n\n¿Configurarlo ahora?')) configurarTokenGitHub();
        return;
    }
    const seleccionados = getNegociosSeleccionadosActualizacion();
    if (seleccionados.length === 0) {
        alert('Selecciona primero los negocios que quieres actualizar.');
        return;
    }

    const conSlug = seleccionados.filter(n => buscarCarpetaCliente(n));
    const sinSlug = seleccionados.filter(n => !buscarCarpetaCliente(n));
    const etiqueta = conApk ? 'app + APK' : 'solo app web';

    let msg = `☁️ Actualizar ${conSlug.length} negocio(s) en nube (${etiqueta})?`;
    if (sinSlug.length > 0) msg += `\n\n⚠️ Se omitirán ${sinSlug.length} sin carpeta detectada.`;
    if (!confirm(msg)) return;

    let enviados = 0, errores = 0;
    for (const negocio of conSlug) {
        try {
            await dispararWorkflowActualizacion(buscarCarpetaCliente(negocio), conApk);
            enviados++;
            await new Promise(r => setTimeout(r, 500));
        } catch { errores++; }
    }

    alert(`✅ Workflows disparados (${etiqueta}):\n📨 Iniciados: ${enviados}\n❌ Errores: ${errores}\n\nhttps://github.com/${window.GH_OWNER}/${window.GH_SUPERADMIN_REPO}/actions`);
}

async function actualizarLoteEnNube(loteId, conApk = false) {
    const lote = cargarLotesActualizacion().find(item => String(item.id) === String(loteId));
    if (!lote) { alert('No se encontró ese lote.'); return; }

    const negocios = getNegociosPorIds(lote.ids || []);
    const conSlug = negocios.filter(n => buscarCarpetaCliente(n));
    const etiqueta = conApk ? 'app + APK' : 'solo app web';

    if (!confirm(`☁️ Actualizar lote "${lote.nombre}" — ${conSlug.length} negocios (${etiqueta})?`)) return;

    let enviados = 0, errores = 0;
    for (const negocio of conSlug) {
        try {
            await dispararWorkflowActualizacion(buscarCarpetaCliente(negocio), conApk);
            enviados++;
            await new Promise(r => setTimeout(r, 500));
        } catch { errores++; }
    }

    alert(`✅ Lote "${lote.nombre}" (${etiqueta}).\n📨 Iniciados: ${enviados}\n❌ Errores: ${errores}`);
}

// Exponer funciones globales
window.buscarNegocio = buscarNegocio;
window.limpiarBusqueda = limpiarBusqueda;
window.filtrarPorEstado = filtrarPorEstado;
window.activarDesdeTrial = activarDesdeTrial;
window.suspenderNegocio = suspenderNegocio;
window.reactivarNegocio = reactivarNegocio;
window.inactivarNegocio = inactivarNegocio;
window.borrarNegocioCompleto = borrarNegocioCompleto;
window.reiniciarNegocioCompleto = reiniciarNegocioCompleto;
window.enviarWhatsApp = enviarWhatsApp;
window.enviarWhatsAppSimple = enviarWhatsAppSimple;  
window.generarMensajeCliente = generarMensajeCliente;
window.notificarNegocio = notificarNegocio;
window.notificarVencimiento = notificarVencimiento;  
window.prepararActualizacionNegocio = prepararActualizacionNegocio;
window.prepararActualizacionNegocioConApk = prepararActualizacionNegocioConApk;
window.toggleSeleccionActualizacion = toggleSeleccionActualizacion;
window.seleccionarNegociosVisiblesActualizacion = seleccionarNegociosVisiblesActualizacion;
window.limpiarSeleccionActualizacion = limpiarSeleccionActualizacion;
window.guardarSeleccionComoLote = guardarSeleccionComoLote;
window.guardarSeleccionEnLotesDeDiez = guardarSeleccionEnLotesDeDiez;
window.cargarLoteActualizacion = cargarLoteActualizacion;
window.eliminarLoteActualizacion = eliminarLoteActualizacion;
window.prepararActualizacionSeleccionada = prepararActualizacionSeleccionada;
window.prepararActualizacionLote = prepararActualizacionLote;
window.notificarATodos = notificarATodos;
window.abrirModalPagadoHasta = abrirModalPagadoHasta;
window.guardarPagadoHasta = guardarPagadoHasta;
window.exportarCSV = exportarCSV;
window.logout = logout;
window.cambiarOrden = cambiarOrden;
window.togglePendiente = togglePendiente;
window.toggleEliminado = toggleEliminado;
window.notificarTurnosHoy = notificarTurnosHoy;
window.notificarTurnosManana = notificarTurnosManana;
window.actualizarClienteEnNube = actualizarClienteEnNube;
window.actualizarSeleccionadosEnNube = actualizarSeleccionadosEnNube;
window.actualizarLoteEnNube = actualizarLoteEnNube;
window.configurarTokenGitHub = configurarTokenGitHub;
window.exportarCarpetasLocales = exportarCarpetasLocales;
window.importarCarpetasLocales = importarCarpetasLocales;
window.abrirGestionCarpetas = abrirGestionCarpetas;
window.guardarCarpetaDesdeUI = guardarCarpetaDesdeUI;
window.editarCarpetaNegocio = editarCarpetaNegocio;
window.limpiarCarpetaNegocio = limpiarCarpetaNegocio;
window.renderGestionCarpetas = renderGestionCarpetas;

// ==================== UI GESTIÓN DE CARPETAS ====================

function abrirGestionCarpetas() {
    // Crear modal si no existe
    let modal = document.getElementById('modal-carpetas');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-carpetas';
        modal.className = 'fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-auto py-8';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4">
                <div class="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 class="text-lg font-bold text-gray-900">📁 Carpetas locales de clientes</h2>
                        <p class="text-xs text-gray-500 mt-0.5">Gestiona qué carpeta local corresponde a cada cliente. Se guarda en este navegador.</p>
                    </div>
                    <button onclick="document.getElementById('modal-carpetas').remove()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>
                <div class="px-6 py-4 border-b flex flex-wrap gap-2 items-center">
                    <input id="carpetas-buscador" type="text" placeholder="Buscar cliente..." oninput="renderGestionCarpetas()" class="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:ring-2 focus:ring-indigo-400 outline-none">
                    <button onclick="exportarCarpetasLocales()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">⬇️ Exportar JSON</button>
                    <button onclick="importarCarpetasLocales()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">⬆️ Importar JSON</button>
                </div>
                <div id="carpetas-lista" class="px-6 py-4 max-h-[60vh] overflow-y-auto"></div>
                <div class="px-6 py-3 border-t bg-gray-50 rounded-b-2xl">
                    <p id="carpetas-resumen" class="text-xs text-gray-500"></p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Cerrar al click en backdrop
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }
    renderGestionCarpetas();
}

function renderGestionCarpetas() {
    const lista = document.getElementById('carpetas-lista');
    const resumen = document.getElementById('carpetas-resumen');
    if (!lista) return;

    const buscador = (document.getElementById('carpetas-buscador')?.value || '').toLowerCase().trim();
    const mapaGuardado = cargarCarpetasLocales();
    const total = negociosData.length;

    let negocios = [...negociosData];
    if (buscador) {
        negocios = negocios.filter(n => {
            const nombre = (n.nombre || '').toLowerCase();
            const carpeta = buscarCarpetaCliente(n).toLowerCase();
            return nombre.includes(buscador) || carpeta.includes(buscador);
        });
    }

    // Ordenar: primero los sin carpeta guardada en localStorage
    negocios.sort((a, b) => {
        const aGuardada = !!mapaGuardado[String(a.id)];
        const bGuardada = !!mapaGuardado[String(b.id)];
        if (aGuardada !== bGuardada) return aGuardada ? 1 : -1;
        return (a.nombre || '').localeCompare(b.nombre || '');
    });

    const conGuardada = Object.keys(mapaGuardado).length;
    const sinCarpeta = negociosData.filter(n => !buscarCarpetaCliente(n)).length;

    if (resumen) {
        resumen.textContent = `${total} clientes | ${conGuardada} con carpeta guardada en localStorage | ${sinCarpeta} sin ninguna carpeta detectada`;
    }

    if (negocios.length === 0) {
        lista.innerHTML = '<p class="text-gray-400 text-sm py-4 text-center">Sin resultados</p>';
        return;
    }

    lista.innerHTML = negocios.map(n => {
        const carpetaActual = buscarCarpetaCliente(n);
        const guardada = mapaGuardado[String(n.id)];
        const fuente = guardada ? 'localStorage' : (CARPETAS_CLIENTES_POR_NEGOCIO_ID[String(n.id)] ? 'hardcoded' : carpetaActual ? 'auto' : '');
        const fuenteColor = fuente === 'localStorage' ? 'bg-green-100 text-green-700' :
                            fuente === 'hardcoded' ? 'bg-blue-100 text-blue-700' :
                            fuente === 'auto' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
        const fuenteLabel = fuente || 'sin carpeta';

        return `
            <div class="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-sm text-gray-900 truncate">${escapeHtml(n.nombre || n.id)}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${fuenteColor}">${fuenteLabel}</span>
                    </div>
                    <div id="carpeta-display-${n.id}" class="text-xs text-gray-500 mt-0.5 font-mono truncate">${carpetaActual || '—'}</div>
                    <div id="carpeta-edit-${n.id}" class="hidden mt-1 flex gap-1">
                        <input id="carpeta-input-${n.id}" type="text" value="${escapeHtml(carpetaActual)}" placeholder="nombre-carpeta" class="border rounded px-2 py-1 text-xs font-mono flex-1 focus:ring-1 focus:ring-indigo-400 outline-none">
                        <button onclick="guardarCarpetaDesdeUI('${n.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs font-bold">OK</button>
                        <button onclick="cancelarEditCarpeta('${n.id}')" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">×</button>
                    </div>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                    <button onclick="editarCarpetaNegocio('${n.id}')" class="text-xs px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-medium">✏️</button>
                    ${guardada ? `<button onclick="limpiarCarpetaNegocio('${n.id}')" class="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium">🗑</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function editarCarpetaNegocio(negocioId) {
    document.getElementById(`carpeta-display-${negocioId}`)?.classList.add('hidden');
    document.getElementById(`carpeta-edit-${negocioId}`)?.classList.remove('hidden');
    document.getElementById(`carpeta-input-${negocioId}`)?.focus();
}

function cancelarEditCarpeta(negocioId) {
    document.getElementById(`carpeta-display-${negocioId}`)?.classList.remove('hidden');
    document.getElementById(`carpeta-edit-${negocioId}`)?.classList.add('hidden');
}

window.cancelarEditCarpeta = cancelarEditCarpeta;

function editarCarpetaRapida(negocioId, nombreNegocio) {
    const actual = getCarpetaGuardada(negocioId) || buscarCarpetaCliente({ id: negocioId }) || '';
    const nueva = prompt(`📁 Carpeta local para "${nombreNegocio}"\n(solo el nombre de carpeta, sin ruta completa):`, actual);
    if (nueva === null) return; // canceló
    setCarpetaGuardada(negocioId, nueva);
    // Recargar lista para reflejar cambio
    renderListaNegocios && renderListaNegocios();
}
window.editarCarpetaRapida = editarCarpetaRapida;

function guardarCarpetaDesdeUI(negocioId) {
    const input = document.getElementById(`carpeta-input-${negocioId}`);
    if (!input) return;
    const valor = input.value.trim();
    setCarpetaGuardada(negocioId, valor);
    renderGestionCarpetas();
}

function limpiarCarpetaNegocio(negocioId) {
    if (!confirm('¿Eliminar la carpeta guardada para este cliente? Volverá a usar la detección automática.')) return;
    setCarpetaGuardada(negocioId, '');
    renderGestionCarpetas();
}
window.configurarTokenGitHub = configurarTokenGitHub;
window.actualizarClienteEnNube = actualizarClienteEnNube;
window.actualizarSeleccionadosEnNube = actualizarSeleccionadosEnNube;
window.actualizarLoteEnNube = actualizarLoteEnNube;

// ==================== INICIALIZACIÓN ====================
async function init() {
    console.log('🚀 Inicializando panel Super Admin...');
    
    // Mostrar loading
    const panelHeader = document.getElementById('panel-header');
    const listaNegocios = document.getElementById('lista-negocios');
    
    if (panelHeader) {
        panelHeader.innerHTML = `<div class="text-center p-8"><div class="text-2xl">👑</div><p class="mt-2">Verificando acceso...</p></div>`;
    }
    if (listaNegocios) {
        listaNegocios.innerHTML = `<div class="text-center p-8">Cargando panel...</div>`;
    }
    
    // Verificar acceso
    const acceso = await verificarAcceso();
    if (!acceso) return;
    
    // Cargar negocios primero para mostrar el panel rapido.
    const negocios = await cargarNegocios();
    
    if (negocios.length === 0) {
        if (panelHeader) {
            panelHeader.innerHTML = `
                <div class="max-w-7xl mx-auto p-4">
                    <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
                        <p class="font-bold">⚠️ No se encontraron negocios</p>
                        <p>Verifica que la tabla 'vista_negocios_admin' exista en Supabase y contenga datos.</p>
                        <button onclick="location.reload()" class="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm">Reintentar</button>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    negociosData = negocios;
    renderHeader();
    
    // Ordenar por reservas por defecto
    const negociosOrdenados = ordenarNegocios(negocios, 'reservas');
    renderListaNegocios(negociosOrdenados);
    actualizarBotonesFiltro();
    actualizarBotonOrden();

    Promise.all([
        obtenerReservasDiarias(),
        obtenerActividadReservas(negocios.map(n => n.id).filter(Boolean)),
        window.cargarAuditoriaComercial ? window.cargarAuditoriaComercial(negocios) : Promise.resolve(),
        window.cargarSeguimientoComercial ? window.cargarSeguimientoComercial() : Promise.resolve()
    ]).then(([totalDiarias]) => {
        reservasDiarias = totalDiarias || 0;
        renderHeader();
        actualizarListaNegocios();
        actualizarBotonesFiltro();
        actualizarBotonOrden();
        console.log('✅ Actividad de reservas cargada en segundo plano');
    }).catch(error => {
        console.error('Error cargando actividad en segundo plano:', error);
    });

    // Reportes de RomaHub (tiendas externas): en segundo plano, no bloquea
    // el panel si la tabla aun no existe (F5 recien desplegado).
    cargarReportesTienda().then(reportes => {
        reportesTiendaData = reportes;
        renderHeader();
    });
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
