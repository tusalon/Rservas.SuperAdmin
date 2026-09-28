// Comprueba la alerta "bajo su actividad", la eleccion de plantilla de WhatsApp
// y las fechas de pago de super-admin.js.
// Ejecutar:  node tools/test-plantillas.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'super-admin.js'), 'utf8');
const trozo = (desde, hasta) => {
    const a = source.indexOf(desde);
    const b = source.indexOf(hasta, a);
    assert.ok(a !== -1 && b > a, `No se encontro el trozo "${desde}" en super-admin.js`);
    return source.slice(a, b);
};

const hoy = new Date();
const enDias = n => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const contexto = {
    FECHA_CORTE_COBRO: '2026-07-19',
    actividadPorNegocio: {},
    problemas: {},
    auditoria: {},
    diagnosticarNegocio: n => contexto.problemas[n.id] || [],
    obtenerUrlPublicaNegocio: n => `https://tusalon.github.io/${n.id}/`,
    window: {},
};
contexto.window.obtenerAuditoriaComercial = id => contexto.auditoria[id] || null;
vm.createContext(contexto);
// Codigo real del panel, no una copia.
vm.runInContext(trozo('// Igual que parseFechaLocal', 'function calcularCobros'), contexto);
vm.runInContext(trozo('function _fechaCorta', 'function _filaCobro'), contexto);
vm.runInContext(trozo('// ==================== ALERTA DE ACTIVIDAD', 'function abrirWhatsAppConPlantilla'), contexto);

const { bajaActividad, sugerirPlantilla, diasHastaPago } = contexto;
const PLANTILLAS = vm.runInContext('PLANTILLAS', contexto);

// --- Fechas: "AAAA-MM-DD" es un dia local, como en la app de la duena.
assert.equal(diasHastaPago(enDias(1)), 1, 'manana es 1 dia, no 0 (antes el panel decia "Vence hoy")');
assert.equal(diasHastaPago(`${enDias(1)}T00:00:00+00:00`), 1, 'con hora UTC tambien cuenta el dia escrito');
assert.equal(diasHastaPago(enDias(0)), 0);

// --- Alerta de actividad
const fila = (creadas7, creadas28) => ({ reservas_creadas_7d: creadas7, reservas_28: creadas28 });
contexto.actividadPorNegocio = {
    cae: fila(2, 2 + 30),        // media 10/semana, esta semana 2
    normal: fila(9, 9 + 30),     // media 10, esta 9
    poco: fila(0, 6),            // media 2: poco volumen, no se avisa
    justo: fila(5, 5 + 30),      // exactamente la mitad: no es caida
    sinDatos: { reservas_28: 40 },
};
// Lo que sale de vm es de otro "reino": se compara por contenido.
assert.equal(JSON.stringify(bajaActividad({ id: 'cae' })), JSON.stringify({ semana: 2, media: 10 }));
assert.equal(bajaActividad({ id: 'normal' }), null);
assert.equal(bajaActividad({ id: 'poco' }), null, 'con menos de 3 por semana no hay alerta');
assert.equal(bajaActividad({ id: 'justo' }), null);
assert.equal(bajaActividad({ id: 'sinDatos' }), null, 'sin la columna nueva no se inventa una caida');
assert.equal(bajaActividad({ id: 'noExiste' }), null);

// --- Plantilla sugerida
const salon = (id, extra = {}) => ({ id, nombre: 'Salón ' + id, estado_suscripcion: 'activa', ...extra });
assert.equal(sugerirPlantilla(salon('vence', { proximo_pago: enDias(1) })), 'vence');
contexto.problemas = {
    horarios: ['sin horarios'],
    asignar: ['2 servicios sin profesional'],
    varios: ['sin profesional', 'sin servicios'],
};
assert.equal(sugerirPlantilla(salon('horarios')), 'sin_horarios');
assert.equal(sugerirPlantilla(salon('asignar')), 'servicio_sin_profesional');
assert.equal(sugerirPlantilla(salon('varios')), 'configurar');
contexto.auditoria = { nueva: { segment: 'Sin estrenar' }, va_bien: { segment: 'Activa' } };
assert.equal(sugerirPlantilla(salon('nueva')), 'primera_reserva');
assert.equal(sugerirPlantilla(salon('cae')), 'bajo_actividad');
contexto.actividadPorNegocio.va_bien = { ...fila(10, 40), finanzas_cobros_30: 5 };
assert.equal(sugerirPlantilla(salon('va_bien')), 'referido');
contexto.actividadPorNegocio.va_bien.finanzas_cobros_30 = 0;
assert.equal(sugerirPlantilla(salon('va_bien')), 'finanzas', 'paga, va bien y no usa Finanzas');
assert.equal(sugerirPlantilla(salon('otro', { estado_suscripcion: 'trial' })), 'saludo');

// --- Ninguna plantilla lleva precio ni contrasena, y todas tutean
Object.entries(PLANTILLAS).forEach(([clave, plantilla]) => {
    const texto = plantilla.texto(salon('x', { proximo_pago: enDias(2) }));
    assert.ok(!/\bCUP\b|\d+\s*(pesos|usd)/i.test(texto), `${clave}: no debe mencionar precios`);
    assert.ok(!/contraseña|password/i.test(texto), `${clave}: no debe llevar contraseñas`);
    assert.ok(!/usted|ayudarle/i.test(texto), `${clave}: en tuteo`);
});

console.log('plantillas y alertas: OK');
