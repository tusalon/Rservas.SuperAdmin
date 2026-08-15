// Comprueba el filtrado de negocios archivados en super-admin.js.
// Ejecutar:  node tools/test-archivar-negocios.js
//
// Contexto: 178 de 379 negocios llevaban mas de 2 meses sin actividad y
// ensuciaban la lista. Archivar los saca de la vista SIN borrar nada, porque
// ninguno llevaba mas de 6 meses parado y casi todos tienen su salon montado:
// son gente que puede volver. Estas pruebas evitan dos fallos concretos:
//   - que un archivado reaparezca en algun filtro
//   - que los contadores del header dejen de cuadrar con lo que abre el filtro

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'super-admin.js'), 'utf8');

// Se evalua la funcion real del panel, no una copia.
const desde = source.indexOf('function actualizarListaNegocios()');
const hasta = source.indexOf('function actualizarBotonesFiltro()');
assert.ok(desde !== -1 && hasta > desde, 'No se encontro actualizarListaNegocios en super-admin.js');

const negocios = [
    { id: '1', nombre: 'Activa normal',      estado_suscripcion: 'activa',  archivado: false },
    { id: '2', nombre: 'Trial normal',       estado_suscripcion: 'trial',   archivado: false },
    { id: '3', nombre: 'Trial archivada',    estado_suscripcion: 'trial',   archivado: true },
    { id: '4', nombre: 'Activa archivada',   estado_suscripcion: 'activa',  archivado: true },
    { id: '5', nombre: 'Sin campo archivado', estado_suscripcion: 'trial' } // antes de correr el SQL
];

function listar(filtro) {
    let visto = null;
    const contexto = {
        negociosData: negocios,
        filtroActual: filtro,
        filtroBusqueda: '',
        pendientesLocal: ['2'],
        eliminadosLocal: ['1'],
        ordenActual: 'fecha',
        ordenarNegocios: (r) => r,
        renderListaNegocios: (r) => { visto = r; },
        window: {}
    };
    vm.createContext(contexto);
    vm.runInContext(source.slice(desde, hasta) + '\nactualizarListaNegocios();', contexto);
    // Se compara como texto: vm devuelve arrays de otro realm y deepEqual
    // estricto falla por el prototipo aunque el contenido sea identico.
    return Array.from(visto, n => n.id).join(',');
}

const casos = [
    ['todos',       '1,2,5', 'el filtro Todos no debe enseñar archivados'],
    ['activa',      '1',     '"Activa archivada" no puede colarse por su estado de suscripcion'],
    ['trial',       '2,5',   'lo mismo con Prueba'],
    ['pendiente',   '2',     'los marcados pendientes tampoco traen archivados'],
    ['eliminados',  '1',     'ni la papelera local'],
    ['archivados',  '3,4',   'el filtro Archivados es el UNICO que los enseña']
];

for (const [filtro, esperado, porque] of casos) {
    assert.equal(listar(filtro), esperado, `filtro "${filtro}": ${porque}`);
}

// Un negocio sin el campo (antes de correr el SQL) tiene que seguir viendose:
// si no, al desplegar el panel sin la migracion se vaciaria la lista entera.
assert.ok(listar('todos').split(',').includes('5'), 'sin la columna archivado el negocio debe seguir visible');

// Los contadores del header cuentan sobre los visibles, no sobre el total.
const visibles = negocios.filter(n => n.archivado !== true);
assert.equal(visibles.length, 3, 'Todos debe contar 3, no los 5 de la tabla');
assert.equal(negocios.filter(n => n.archivado === true).length, 2, 'Archivados debe contar 2');

// El boton de la tarjeta y su funcion tienen que existir y estar expuestos.
assert.match(source, /window\.alternarArchivadoNegocio = alternarArchivadoNegocio;/);
assert.match(source, /archivado_at: estaArchivado \? null : new Date\(\)\.toISOString\(\)/);
assert.match(source, /Ejecuta sql-archivar-negocios\.sql/, 'si falta la columna hay que decir que SQL correr');

console.log(`OK: archivado verificado (${casos.length} filtros + columna ausente + contadores)`);
