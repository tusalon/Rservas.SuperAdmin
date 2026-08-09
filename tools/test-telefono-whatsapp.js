// Comprueba la normalizacion de telefonos para wa.me en super-admin.js.
// Ejecutar:  node tools/test-telefono-whatsapp.js
//
// Cada caso de abajo es un numero que ANTES se armaba mal y hacia que WhatsApp
// respondiera "numero invalido".

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'super-admin.js'), 'utf8');

// Se evalua el codigo real del panel (no una copia) para que el test siga
// valiendo si alguien edita la funcion.
const desde = source.indexOf('const LARGO_LOCAL_POR_PAIS');
const hasta = source.indexOf('function codigoPaisDeNegocio');
assert.ok(desde !== -1 && hasta > desde, 'No se encontro normalizarTelefonoWhatsApp en super-admin.js');

const contexto = {};
vm.createContext(contexto);
vm.runInContext(source.slice(desde, hasta), contexto);
const normalizar = contexto.normalizarTelefonoWhatsApp;

const casos = [
    // [telefono guardado, codigo_pais, esperado, por que]
    ['53123456', '53', '5353123456', 'movil cubano que empieza por 53: antes se enviaba con 8 digitos'],
    ['55123456', '53', '5355123456', 'movil cubano normal'],
    ['5355123456', '53', '5355123456', 'cubano ya internacional: no se le pega otro 53'],
    ['+53 5512-3456', '53', '5355123456', 'con espacios y signos'],
    ['612345678', '34', '34612345678', 'movil espanol local: antes se enviaba sin prefijo'],
    ['34612345678', '34', '34612345678', 'espanol ya internacional'],
    ['3055551234', '1', '13055551234', 'movil de USA local'],
    ['13055551234', '1', '13055551234', 'USA ya internacional'],
    ['34612345678', '', '34612345678', 'negocio sin codigo_pais pero numero ya internacional'],
    ['55123456', '', '5355123456', 'negocio sin codigo_pais: cae a Cuba por defecto'],
    ['', '53', '', 'sin telefono no hay enlace'],
    [null, '53', '', 'telefono nulo no revienta']
];

let fallos = 0;
for (const [telefono, codigoPais, esperado, motivo] of casos) {
    const obtenido = normalizar(telefono, codigoPais);
    if (obtenido !== esperado) {
        fallos++;
        console.error(`FALLO (${motivo})\n  entrada: ${JSON.stringify(telefono)} / codigo_pais ${JSON.stringify(codigoPais)}\n  esperado: ${esperado}\n  obtenido: ${obtenido}\n`);
    }
}

assert.equal(fallos, 0, `${fallos} caso(s) fallaron`);
console.log(`OK - ${casos.length} casos de telefono/prefijo pasaron`);
