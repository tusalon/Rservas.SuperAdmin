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
assert.match(context.renderEmbudoComercial(), /Embudo comercial RservasRoma/);

console.log('commercial-tracking: 11 assertions OK');
