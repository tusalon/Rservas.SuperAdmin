import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const now = new Date();
const isoDaysAgo = days => new Date(now.getTime() - days * 86400000).toISOString();
const dateDaysFromNow = days => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);

const businesses = [
    { id: 'active-unpaid', nombre: 'Activo sin pago', estado_suscripcion: 'trial' },
    { id: 'paying-risk', nombre: 'Pago en riesgo', estado_suscripcion: 'activa' },
    { id: 'quick-schedule', nombre: 'Solo horario', estado_suscripcion: 'trial' },
    { id: 'dormant-history', nombre: 'Dormido', estado_suscripcion: 'inactiva' },
    { id: 'never-started', nombre: 'Nunca activado', estado_suscripcion: 'trial' },
];

const tables = {
    negocios: [
        { id: 'active-unpaid', configurado: true, updated_at: isoDaysAgo(4), es_tienda_externa: false },
        { id: 'paying-risk', configurado: true, updated_at: isoDaysAgo(45), es_tienda_externa: false },
        { id: 'quick-schedule', configurado: true, updated_at: isoDaysAgo(10), es_tienda_externa: false },
        { id: 'dormant-history', configurado: true, updated_at: isoDaysAgo(150), es_tienda_externa: false },
        { id: 'never-started', configurado: false, updated_at: null, es_tienda_externa: false },
    ],
    profesionales: ['active-unpaid', 'paying-risk', 'quick-schedule', 'dormant-history'].map(negocio_id => ({ negocio_id, created_at: isoDaysAgo(200), activo: true })),
    servicios: ['active-unpaid', 'paying-risk', 'quick-schedule', 'dormant-history'].map(negocio_id => ({ negocio_id, created_at: isoDaysAgo(200), activo: true })),
    horarios_profesionales: ['active-unpaid', 'paying-risk', 'dormant-history'].map(negocio_id => ({ negocio_id, created_at: isoDaysAgo(200), dias: ['lunes'] })),
    reservas: [
        { negocio_id: 'active-unpaid', created_at: isoDaysAgo(2), fecha: dateDaysFromNow(2), estado: 'reservada' },
        { negocio_id: 'paying-risk', created_at: isoDaysAgo(45), fecha: dateDaysFromNow(-40), estado: 'completada' },
        { negocio_id: 'dormant-history', created_at: isoDaysAgo(150), fecha: dateDaysFromNow(-145), estado: 'completada' },
    ],
    seguimiento_comercial_negocios: [],
};

function queryFor(table) {
    const state = { from: 0, to: 999, filters: [] };
    const query = {
        select() { return query; },
        range(from, to) { state.from = from; state.to = to; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        then(resolve) {
            let rows = [...(tables[table] || [])];
            state.filters.forEach(([column, value]) => { rows = rows.filter(row => row[column] === value); });
            resolve({ data: rows.slice(state.from, state.to + 1), error: null });
        },
    };
    return query;
}

const storage = {};
const context = {
    console,
    Date,
    Intl,
    setTimeout,
    clearTimeout,
    alert() {},
    localStorage: {
        getItem(key) { return storage[key] || null; },
        setItem(key, value) { storage[key] = value; },
    },
    document: {
        getElementById() { return null; },
        body: { appendChild() {} },
    },
    supabase: { from: queryFor },
    negociosData: businesses,
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../commercial-tracking.js', import.meta.url), 'utf8'), context);

await context.cargarAuditoriaComercial(businesses);

assert.equal(context.obtenerAuditoriaComercial('active-unpaid').segment, 'Activa');
assert.equal(context.obtenerAuditoriaComercial('active-unpaid').priority, 'P1');
assert.equal(context.obtenerAuditoriaComercial('active-unpaid').futureAppointments, 1);
assert.equal(context.obtenerAuditoriaComercial('paying-risk').segment, 'En riesgo');
assert.equal(context.obtenerAuditoriaComercial('paying-risk').priority, 'P0');
assert.equal(context.obtenerAuditoriaComercial('quick-schedule').diagnosis, 'Solo falta horario');
assert.equal(context.obtenerAuditoriaComercial('dormant-history').segment, 'Dormida');
assert.equal(context.obtenerAuditoriaComercial('never-started').segment, 'Nunca activada');

context.filtrarComercial('cierre_ahora');
assert.deepEqual(context.aplicarFiltroComercial(businesses).map(item => item.id), ['active-unpaid']);

const ordered = context.ordenarPorPrioridadComercial(businesses).map(item => item.id);
assert.equal(ordered[0], 'paying-risk');
assert.match(context.renderEmbudoComercial(), /Cierre ahora/);

// Mismo caso, pero con las filas que devuelve admin_actividad_negocios
// (sql-admin-actividad-negocios.sql): tiene que dar exactamente lo mismo.
const fila = (negocio_id, extra) => ({
    negocio_id, configurado: true, es_tienda_externa: false,
    profesionales: 1, servicios: 1, horarios: 1,
    profesionales_ultima: isoDaysAgo(200), servicios_ultima: isoDaysAgo(200), horarios_ultima: isoDaysAgo(200),
    reservas_total: 0, reservas_ultima_creada: null, reservas_30: 0, reservas_90: 0,
    ultima_cita: null, proxima_cita: null, citas_futuras: 0,
    ...extra,
});
const actividad = Object.fromEntries([
    fila('active-unpaid', { updated_at: isoDaysAgo(4), reservas_total: 1, reservas_ultima_creada: isoDaysAgo(2), reservas_30: 1, reservas_90: 1, proxima_cita: dateDaysFromNow(2), citas_futuras: 1 }),
    fila('paying-risk', { updated_at: isoDaysAgo(45), reservas_total: 1, reservas_ultima_creada: isoDaysAgo(45), reservas_90: 1, ultima_cita: dateDaysFromNow(-40) }),
    fila('quick-schedule', { updated_at: isoDaysAgo(10), horarios: 0, horarios_ultima: null }),
    fila('dormant-history', { updated_at: isoDaysAgo(150), reservas_total: 1, reservas_ultima_creada: isoDaysAgo(150), ultima_cita: dateDaysFromNow(-145) }),
    fila('never-started', { configurado: false, updated_at: null, profesionales: 0, servicios: 0, horarios: 0, profesionales_ultima: null, servicios_ultima: null, horarios_ultima: null }),
].map(f => [f.negocio_id, f]));

// daysWithoutActivity depende del instante en que se calcula: se redondea.
const foto = () => JSON.stringify(businesses.map(b => {
    const a = context.obtenerAuditoriaComercial(b.id);
    return { ...a, daysWithoutActivity: Math.round(a.daysWithoutActivity) };
}));
const antes = foto();
context.supabase = { from() { throw new Error('con la RPC no se debe bajar ninguna tabla'); } };
context.cargarActividadAdmin = async () => actividad;
await context.cargarAuditoriaComercial(businesses);
const despues = foto();
assert.equal(despues, antes, 'la RPC da la misma auditoria que las tablas');

console.log('commercial-tracking: 12 assertions OK');
