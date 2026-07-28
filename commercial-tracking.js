// Embudo de activación y seguimiento comercial de RservasRoma.
// Los indicadores se calculan con datos operativos; las notas comerciales se
// guardan en Supabase cuando existe la tabla y, como respaldo, en localStorage.

const COMMERCIAL_LOCAL_KEY = 'seguimiento_comercial_rservas_v1';
const COMMERCIAL_TABLE = 'seguimiento_comercial_negocios';
const COMMERCIAL_DAY_MS = 24 * 60 * 60 * 1000;

const commercialState = {
    loading: true,
    ready: false,
    filter: 'todos',
    auditByBusiness: {},
    trackingByBusiness: {},
    persistence: 'local',
    loadError: '',
};

function commercialEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function commercialReadLocal() {
    try {
        const parsed = JSON.parse(localStorage.getItem(COMMERCIAL_LOCAL_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function commercialWriteLocal() {
    localStorage.setItem(COMMERCIAL_LOCAL_KEY, JSON.stringify(commercialState.trackingByBusiness));
}

async function commercialFetchAll(table, columns, applyFilters) {
    const pageSize = 1000;
    let from = 0;
    let rows = [];
    for (let page = 0; page < 25; page++) {
        let query = window.supabase.from(table).select(columns).range(from, from + pageSize - 1);
        if (applyFilters) query = applyFilters(query);
        const { data, error } = await query;
        if (error) throw error;
        const batch = data || [];
        rows = rows.concat(batch);
        if (batch.length < pageSize) break;
        from += pageSize;
    }
    return rows;
}

function commercialLatest(current, candidate) {
    if (!candidate) return current || null;
    const timestamp = new Date(candidate).getTime();
    if (!Number.isFinite(timestamp)) return current || null;
    if (!current || timestamp > new Date(current).getTime()) return candidate;
    return current;
}

function commercialDaysSince(value, now = new Date()) {
    if (!value) return 9999;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return 9999;
    return Math.max(0, (now.getTime() - timestamp) / COMMERCIAL_DAY_MS);
}

function commercialIsCancelled(status) {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'cancelada' || normalized === 'cancelado' || normalized === 'cancelled';
}

function commercialActionFor({ segment, paying, futureAppointments, operational, professionalCount, serviceCount, scheduleCount, totalReservations }) {
    if (paying && (segment === 'En riesgo' || segment === 'Dormida')) {
        return { priority: 'P0', diagnosis: 'Cliente de pago en riesgo', action: 'Llamar y resolver antes de perder la suscripción' };
    }
    if (paying) {
        return { priority: 'P3', diagnosis: 'Cliente de pago activo', action: 'Retención, testimonio y referidos' };
    }
    if (segment === 'Activa' && futureAppointments > 0) {
        return { priority: 'P1', diagnosis: 'Usa la agenda y tiene citas futuras', action: 'Revisión de 10 min y cierre de suscripción' };
    }
    if (segment === 'Activa') {
        return { priority: 'P1', diagnosis: 'Activa sin suscripción', action: 'Demostrar valor actual y presentar el plan' };
    }
    if (!operational && professionalCount > 0 && serviceCount > 0 && scheduleCount === 0) {
        return { priority: 'P1', diagnosis: 'Solo falta horario', action: 'Activación asistida de 10 minutos' };
    }
    if (!operational && professionalCount > 0 && serviceCount === 0 && scheduleCount > 0) {
        return { priority: 'P1', diagnosis: 'Solo falta servicio', action: 'Crear el primer servicio y publicar el enlace' };
    }
    if (segment === 'En riesgo') {
        return { priority: 'P2', diagnosis: 'Actividad en descenso', action: 'Diagnosticar fricción y recuperar uso' };
    }
    if (segment === 'Dormida' && totalReservations > 0) {
        return { priority: 'P2', diagnosis: 'Usó la app y abandonó', action: 'Reactivación personalizada por WhatsApp' };
    }
    if (operational && totalReservations === 0) {
        return { priority: 'P2', diagnosis: 'Configurada sin reservas', action: 'Ayudar a conseguir la primera reserva' };
    }
    if (segment === 'Configuración incompleta') {
        return { priority: 'P2', diagnosis: 'Faltan componentes de configuración', action: 'Completar el wizard con acompañamiento' };
    }
    return { priority: 'P4', diagnosis: 'Nunca inició la configuración', action: 'Calificar interés antes de hacer onboarding' };
}

async function cargarAuditoriaComercial(negocios = []) {
    commercialState.loading = true;
    commercialState.loadError = '';
    try {
        const [businessRows, reservations, professionals, services, schedules] = await Promise.all([
            commercialFetchAll('negocios', 'id,configurado,updated_at,codigo_pais,provincia,municipio,es_tienda_externa'),
            commercialFetchAll('reservas', 'negocio_id,created_at,fecha,estado'),
            commercialFetchAll('profesionales', 'negocio_id,created_at', query => query.eq('activo', true)),
            commercialFetchAll('servicios', 'negocio_id,created_at', query => query.eq('activo', true)),
            commercialFetchAll('horarios_profesionales', 'negocio_id,created_at,dias'),
        ]);

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const cutoff30 = new Date(now.getTime() - 30 * COMMERCIAL_DAY_MS).toISOString();
        const cutoff90 = new Date(now.getTime() - 90 * COMMERCIAL_DAY_MS).toISOString();
        const businessById = Object.fromEntries(businessRows.map(row => [String(row.id), row]));
        const components = {};
        const reservationStats = {};

        const ensureComponents = id => (components[id] ||= {
            professionals: 0,
            services: 0,
            schedules: 0,
            latestCreatedAt: null,
        });
        const ensureReservations = id => (reservationStats[id] ||= {
            total: 0,
            lastCreatedAt: null,
            reservations30: 0,
            reservations90: 0,
            lastPastAppointment: null,
            nextAppointment: null,
            futureAppointments: 0,
        });

        professionals.forEach(row => {
            if (!row.negocio_id) return;
            const item = ensureComponents(String(row.negocio_id));
            item.professionals++;
            item.latestCreatedAt = commercialLatest(item.latestCreatedAt, row.created_at);
        });
        services.forEach(row => {
            if (!row.negocio_id) return;
            const item = ensureComponents(String(row.negocio_id));
            item.services++;
            item.latestCreatedAt = commercialLatest(item.latestCreatedAt, row.created_at);
        });
        schedules.forEach(row => {
            if (!row.negocio_id) return;
            const item = ensureComponents(String(row.negocio_id));
            if (!Array.isArray(row.dias) || row.dias.length > 0) item.schedules++;
            item.latestCreatedAt = commercialLatest(item.latestCreatedAt, row.created_at);
        });
        reservations.forEach(row => {
            if (!row.negocio_id) return;
            const item = ensureReservations(String(row.negocio_id));
            item.total++;
            item.lastCreatedAt = commercialLatest(item.lastCreatedAt, row.created_at);
            if (row.created_at && row.created_at >= cutoff30) item.reservations30++;
            if (row.created_at && row.created_at >= cutoff90) item.reservations90++;
            if (!row.fecha || commercialIsCancelled(row.estado)) return;
            if (row.fecha < today) {
                if (!item.lastPastAppointment || row.fecha > item.lastPastAppointment) item.lastPastAppointment = row.fecha;
            } else {
                item.futureAppointments++;
                if (!item.nextAppointment || row.fecha < item.nextAppointment) item.nextAppointment = row.fecha;
            }
        });

        const audit = {};
        negocios.forEach(business => {
            const id = String(business.id);
            const meta = businessById[id] || {};
            const component = components[id] || { professionals: 0, services: 0, schedules: 0, latestCreatedAt: null };
            const booking = reservationStats[id] || {
                total: 0, lastCreatedAt: null, reservations30: 0, reservations90: 0,
                lastPastAppointment: null, nextAppointment: null, futureAppointments: 0,
            };
            let lastActivity = commercialLatest(meta.updated_at || null, component.latestCreatedAt);
            lastActivity = commercialLatest(lastActivity, booking.lastCreatedAt);
            const daysWithoutActivity = commercialDaysSince(lastActivity, now);
            const configured = meta.configurado === true;
            const operational = configured && component.professionals > 0 && component.services > 0 && component.schedules > 0;
            const anySetup = configured || component.professionals > 0 || component.services > 0 || component.schedules > 0 || booking.total > 0;
            let segment;
            if (!operational) {
                segment = anySetup ? 'Configuración incompleta' : 'Nunca activada';
            } else if (booking.reservations30 > 0 || daysWithoutActivity <= 30) {
                segment = 'Activa';
            } else if (daysWithoutActivity <= 90) {
                segment = 'En riesgo';
            } else {
                segment = 'Dormida';
            }
            const paying = business.estado_suscripcion === 'activa';
            const commercialAction = commercialActionFor({
                segment,
                paying,
                futureAppointments: booking.futureAppointments,
                operational,
                professionalCount: component.professionals,
                serviceCount: component.services,
                scheduleCount: component.schedules,
                totalReservations: booking.total,
            });
            audit[id] = {
                ...booking,
                ...commercialAction,
                segment,
                paying,
                configured,
                operational,
                professionalCount: component.professionals,
                serviceCount: component.services,
                scheduleCount: component.schedules,
                lastActivity,
                daysWithoutActivity,
                locationComplete: Boolean(meta.provincia && meta.municipio),
                isExternalStore: meta.es_tienda_externa === true || business.es_tienda_externa === true,
            };
        });

        commercialState.auditByBusiness = audit;
        commercialState.ready = true;
    } catch (error) {
        console.error('Error cargando auditoría comercial:', error);
        commercialState.loadError = error?.message || String(error);
    } finally {
        commercialState.loading = false;
    }
}

async function cargarSeguimientoComercial() {
    commercialState.trackingByBusiness = commercialReadLocal();
    try {
        const { data, error } = await window.supabase
            .from(COMMERCIAL_TABLE)
            .select('*');
        if (error) throw error;
        (data || []).forEach(row => {
            commercialState.trackingByBusiness[String(row.negocio_id)] = row;
        });
        commercialState.persistence = 'supabase';
        commercialWriteLocal();
    } catch (error) {
        commercialState.persistence = 'local';
        console.warn('Seguimiento comercial en respaldo local:', error?.message || error);
    }
}

function obtenerAuditoriaComercial(negocioId) {
    return commercialState.auditByBusiness[String(negocioId)] || null;
}

function obtenerSeguimientoComercial(negocioId) {
    return commercialState.trackingByBusiness[String(negocioId)] || {
        negocio_id: negocioId,
        estado: 'sin_contactar',
        prioridad_manual: '',
        ultimo_contacto: '',
        proximo_seguimiento: '',
        responsable: '',
        objecion: '',
        resultado: 'sin_cambio',
        notas: '',
    };
}

const COMMERCIAL_STATUS_LABELS = {
    sin_contactar: 'Sin contactar',
    contactado: 'Contactado',
    respondio: 'Respondió',
    diagnostico: 'Diagnóstico',
    activacion_agendada: 'Activación agendada',
    activado: 'Activado',
    oferta_enviada: 'Oferta enviada',
    pago_confirmado: 'Pago confirmado',
    no_responde: 'No responde',
    no_interesado: 'No interesado',
};

function commercialFormatDate(value, withTime = false) {
    if (!value) return '—';
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00` : value;
    const date = new Date(normalized);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleDateString('es-ES', withTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short', year: 'numeric' });
}

function commercialSegmentClasses(segment) {
    if (segment === 'Activa') return 'bg-emerald-100 text-emerald-800';
    if (segment === 'En riesgo') return 'bg-amber-100 text-amber-800';
    if (segment === 'Dormida') return 'bg-red-100 text-red-800';
    if (segment === 'Configuración incompleta') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-200 text-gray-700';
}

function commercialPriorityClasses(priority) {
    if (priority === 'P0') return 'bg-red-600 text-white';
    if (priority === 'P1') return 'bg-fuchsia-600 text-white';
    if (priority === 'P2') return 'bg-amber-500 text-white';
    if (priority === 'P3') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-200 text-gray-700';
}

function renderEmbudoComercial() {
    if (commercialState.loading) {
        return `<div class="mb-6 bg-white rounded-xl shadow p-4 text-sm text-gray-500">🎯 Calculando embudo comercial y actividad por negocio…</div>`;
    }
    if (!commercialState.ready) {
        return `<div class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">No se pudo calcular el embudo comercial. ${commercialEscape(commercialState.loadError)}</div>`;
    }
    const businesses = (negociosData || []).filter(n => {
        const item = obtenerAuditoriaComercial(n.id);
        return item && !item.isExternalStore;
    });
    const count = predicate => businesses.filter(n => predicate(obtenerAuditoriaComercial(n.id), obtenerSeguimientoComercial(n.id))).length;
    const metrics = {
        retention: count(item => item.paying && (item.segment === 'En riesgo' || item.segment === 'Dormida')),
        closeNow: count(item => !item.paying && item.segment === 'Activa' && item.futureAppointments > 0),
        activeUnpaid: count(item => !item.paying && item.segment === 'Activa'),
        riskUnpaid: count(item => !item.paying && item.segment === 'En riesgo'),
        quickActivation: count(item => item.diagnosis === 'Solo falta horario' || item.diagnosis === 'Solo falta servicio'),
        dormantHistory: count(item => item.segment === 'Dormida' && item.total > 0),
        paidThisCycle: count((item, tracking) => tracking.estado === 'pago_confirmado'),
    };
    const persistenceLabel = commercialState.persistence === 'supabase'
        ? '<span class="text-emerald-700">☁️ Seguimiento sincronizado en Supabase</span>'
        : '<span class="text-amber-700">💾 Seguimiento guardado en este dispositivo; falta ejecutar el SQL incluido</span>';
    const card = (filter, value, title, subtitle, classes) => `
        <button onclick="filtrarComercial('${filter}')" class="text-left rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${classes}">
            <div class="text-2xl font-black">${value}</div>
            <div class="text-sm font-bold mt-0.5">${title}</div>
            <div class="text-xs opacity-80 mt-1">${subtitle}</div>
        </button>`;
    return `
        <section class="mb-6 bg-white rounded-2xl shadow overflow-hidden border border-fuchsia-100">
            <div class="bg-gradient-to-r from-fuchsia-700 to-purple-700 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 class="font-black">🎯 Embudo comercial RservasRoma</h2>
                    <p class="text-xs text-fuchsia-100">Prioriza retención, cierre y activación; no contactes la base completa con el mismo mensaje.</p>
                </div>
                <div class="text-xs bg-white/15 px-3 py-1.5 rounded-full">${persistenceLabel}</div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 p-3">
                ${card('retencion', metrics.retention, 'P0 Retención', 'Pagan y están en riesgo', 'bg-red-50 border-red-200 text-red-800')}
                ${card('cierre_ahora', metrics.closeNow, 'Cierre ahora', 'Activos, citas futuras, sin pago', 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800')}
                ${card('activos_sin_pago', metrics.activeUnpaid, 'Activos sin pago', 'Ya experimentaron valor', 'bg-purple-50 border-purple-200 text-purple-800')}
                ${card('riesgo_sin_pago', metrics.riskUnpaid, 'En riesgo', 'Prevenir abandono', 'bg-amber-50 border-amber-200 text-amber-800')}
                ${card('activacion_rapida', metrics.quickActivation, 'Activación rápida', 'Solo horario o servicio', 'bg-orange-50 border-orange-200 text-orange-800')}
                ${card('dormidos_historial', metrics.dormantHistory, 'Recuperación', 'Dormidos con historial', 'bg-gray-50 border-gray-200 text-gray-800')}
                ${card('pago_confirmado', metrics.paidThisCycle, 'Ventas marcadas', 'Pago confirmado en seguimiento', 'bg-emerald-50 border-emerald-200 text-emerald-800')}
            </div>
            ${commercialState.filter !== 'todos' ? `<div class="px-4 pb-3 text-xs flex items-center gap-2"><span class="font-bold text-fuchsia-700">Filtro comercial activo</span><button onclick="limpiarFiltroComercial()" class="underline text-gray-600">Ver todos</button></div>` : ''}
        </section>`;
}

function commercialMatchesFilter(business, filter = commercialState.filter) {
    if (filter === 'todos') return true;
    const item = obtenerAuditoriaComercial(business.id);
    const tracking = obtenerSeguimientoComercial(business.id);
    if (!item || item.isExternalStore) return false;
    if (filter === 'retencion') return item.paying && (item.segment === 'En riesgo' || item.segment === 'Dormida');
    if (filter === 'cierre_ahora') return !item.paying && item.segment === 'Activa' && item.futureAppointments > 0;
    if (filter === 'activos_sin_pago') return !item.paying && item.segment === 'Activa';
    if (filter === 'riesgo_sin_pago') return !item.paying && item.segment === 'En riesgo';
    if (filter === 'activacion_rapida') return item.diagnosis === 'Solo falta horario' || item.diagnosis === 'Solo falta servicio';
    if (filter === 'dormidos_historial') return item.segment === 'Dormida' && item.total > 0;
    if (filter === 'pago_confirmado') return tracking.estado === 'pago_confirmado';
    if (filter === 'p1_sin_contactar') return item.priority === 'P1' && tracking.estado === 'sin_contactar';
    return true;
}

function aplicarFiltroComercial(negocios) {
    return (negocios || []).filter(business => commercialMatchesFilter(business));
}

function ordenarPorPrioridadComercial(negocios) {
    const weight = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
    return [...(negocios || [])].sort((a, b) => {
        const auditA = obtenerAuditoriaComercial(a.id) || {};
        const auditB = obtenerAuditoriaComercial(b.id) || {};
        const trackingA = obtenerSeguimientoComercial(a.id);
        const trackingB = obtenerSeguimientoComercial(b.id);
        const manualA = trackingA.prioridad_manual || auditA.priority || 'P4';
        const manualB = trackingB.prioridad_manual || auditB.priority || 'P4';
        const priorityDifference = (weight[manualA] ?? 9) - (weight[manualB] ?? 9);
        if (priorityDifference) return priorityDifference;
        const futureDifference = (auditB.futureAppointments || 0) - (auditA.futureAppointments || 0);
        if (futureDifference) return futureDifference;
        return (a.nombre || '').localeCompare(b.nombre || '');
    });
}

function filtrarComercial(filter) {
    commercialState.filter = filter || 'todos';
    if (typeof filtroActual !== 'undefined') filtroActual = 'todos';
    if (typeof ordenActual !== 'undefined') ordenActual = 'comercial';
    if (typeof actualizarListaNegocios === 'function') actualizarListaNegocios();
    if (typeof renderHeader === 'function') renderHeader();
    if (typeof actualizarBotonOrden === 'function') actualizarBotonOrden();
    document.getElementById('lista-negocios')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpiarFiltroComercial(render = true) {
    commercialState.filter = 'todos';
    if (render && typeof actualizarListaNegocios === 'function') actualizarListaNegocios();
    if (render && typeof renderHeader === 'function') renderHeader();
}

function renderFichaComercial(business) {
    const item = obtenerAuditoriaComercial(business.id);
    if (!item || item.isExternalStore) return '';
    const tracking = obtenerSeguimientoComercial(business.id);
    const priority = tracking.prioridad_manual || item.priority;
    const statusLabel = COMMERCIAL_STATUS_LABELS[tracking.estado] || 'Sin contactar';
    const configuration = item.operational
        ? 'Operativa'
        : `${item.professionalCount} prof. · ${item.serviceCount} servicios · ${item.scheduleCount} horarios`;
    const nextFollowUp = tracking.proximo_seguimiento
        ? `<span class="font-semibold text-fuchsia-700">Próximo seguimiento: ${commercialFormatDate(tracking.proximo_seguimiento)}</span>`
        : '<span class="text-gray-400">Sin próxima fecha</span>';
    return `
        <div class="mt-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/40 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap gap-1.5 items-center">
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${commercialPriorityClasses(priority)}">${priority}</span>
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${commercialSegmentClasses(item.segment)}">${commercialEscape(item.segment)}</span>
                    <span class="px-2 py-1 rounded-full text-xs bg-white border text-gray-700">${commercialEscape(statusLabel)}</span>
                </div>
                <button onclick="abrirSeguimientoComercial('${commercialEscape(business.id)}')" class="bg-fuchsia-700 hover:bg-fuchsia-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Editar seguimiento</button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-xs">
                <div><span class="text-gray-500 block">Configuración</span><strong>${commercialEscape(configuration)}</strong></div>
                <div><span class="text-gray-500 block">Última actividad</span><strong>${commercialFormatDate(item.lastActivity, true)}</strong></div>
                <div><span class="text-gray-500 block">Última cita</span><strong>${commercialFormatDate(item.lastPastAppointment)}</strong></div>
                <div><span class="text-gray-500 block">Próxima cita</span><strong>${commercialFormatDate(item.nextAppointment)}</strong></div>
                <div><span class="text-gray-500 block">Reservas históricas</span><strong>${item.total || 0}</strong></div>
            </div>
            <div class="mt-2 text-xs text-gray-700"><strong>Diagnóstico:</strong> ${commercialEscape(item.diagnosis)} · <strong>Acción:</strong> ${commercialEscape(item.action)}</div>
            <div class="mt-2 text-xs">${nextFollowUp}${tracking.responsable ? ` · Responsable: <strong>${commercialEscape(tracking.responsable)}</strong>` : ''}</div>
        </div>`;
}

function commercialSelectOptions(options, selected) {
    return options.map(([value, label]) => `<option value="${commercialEscape(value)}" ${String(selected || '') === value ? 'selected' : ''}>${commercialEscape(label)}</option>`).join('');
}

function abrirSeguimientoComercial(negocioId) {
    const business = (negociosData || []).find(item => String(item.id) === String(negocioId));
    if (!business) return;
    const audit = obtenerAuditoriaComercial(negocioId) || {};
    const tracking = obtenerSeguimientoComercial(negocioId);
    document.getElementById('modal-seguimiento-comercial')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-seguimiento-comercial';
    modal.className = 'fixed inset-0 z-50 bg-black/50 p-3 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] overflow-y-auto">
            <div class="sticky top-0 bg-gradient-to-r from-fuchsia-700 to-purple-700 text-white px-5 py-4 flex items-start justify-between gap-3">
                <div><p class="text-xs text-fuchsia-100">Seguimiento comercial</p><h3 class="text-xl font-black">${commercialEscape(business.nombre || negocioId)}</h3></div>
                <button onclick="cerrarSeguimientoComercial()" class="text-2xl leading-none">×</button>
            </div>
            <div class="p-5">
                <div class="grid md:grid-cols-3 gap-2 mb-5 text-sm">
                    <div class="bg-gray-50 rounded-lg p-3"><span class="text-xs text-gray-500 block">Segmento</span><strong>${commercialEscape(audit.segment || 'Calculando')}</strong></div>
                    <div class="bg-gray-50 rounded-lg p-3"><span class="text-xs text-gray-500 block">Diagnóstico</span><strong>${commercialEscape(audit.diagnosis || '—')}</strong></div>
                    <div class="bg-gray-50 rounded-lg p-3"><span class="text-xs text-gray-500 block">Acción recomendada</span><strong>${commercialEscape(audit.action || '—')}</strong></div>
                </div>
                <div class="grid md:grid-cols-2 gap-4">
                    <label class="text-sm font-semibold text-gray-700">Estado comercial
                        <select id="com-estado" class="mt-1 w-full border rounded-lg p-2.5 bg-white">${commercialSelectOptions(Object.entries(COMMERCIAL_STATUS_LABELS), tracking.estado)}</select>
                    </label>
                    <label class="text-sm font-semibold text-gray-700">Prioridad manual
                        <select id="com-prioridad" class="mt-1 w-full border rounded-lg p-2.5 bg-white">${commercialSelectOptions([['','Automática'],['P0','P0 Retención'],['P1','P1 Cierre'],['P2','P2 Activación'],['P3','P3 Seguimiento'],['P4','P4 Baja intención']], tracking.prioridad_manual)}</select>
                    </label>
                    <label class="text-sm font-semibold text-gray-700">Último contacto
                        <input id="com-ultimo-contacto" type="date" value="${commercialEscape(String(tracking.ultimo_contacto || '').slice(0, 10))}" class="mt-1 w-full border rounded-lg p-2.5">
                    </label>
                    <label class="text-sm font-semibold text-gray-700">Próximo seguimiento
                        <input id="com-proximo" type="date" value="${commercialEscape(String(tracking.proximo_seguimiento || '').slice(0, 10))}" class="mt-1 w-full border rounded-lg p-2.5">
                    </label>
                    <label class="text-sm font-semibold text-gray-700">Responsable
                        <input id="com-responsable" value="${commercialEscape(tracking.responsable || '')}" placeholder="Nombre de quien dará seguimiento" class="mt-1 w-full border rounded-lg p-2.5">
                    </label>
                    <label class="text-sm font-semibold text-gray-700">Resultado
                        <select id="com-resultado" class="mt-1 w-full border rounded-lg p-2.5 bg-white">${commercialSelectOptions([['sin_cambio','Sin cambio'],['configuracion_completa','Configuración completa'],['primera_reserva','Primera reserva'],['reactivado','Reactivado'],['recurrente','Uso recurrente'],['perdido','Oportunidad perdida']], tracking.resultado)}</select>
                    </label>
                    <label class="md:col-span-2 text-sm font-semibold text-gray-700">Objeción principal
                        <input id="com-objecion" value="${commercialEscape(tracking.objecion || '')}" placeholder="Precio, datos móviles, falta de tiempo, no ve valor…" class="mt-1 w-full border rounded-lg p-2.5">
                    </label>
                    <label class="md:col-span-2 text-sm font-semibold text-gray-700">Notas
                        <textarea id="com-notas" rows="4" class="mt-1 w-full border rounded-lg p-2.5" placeholder="Acuerdos, necesidad detectada y siguiente paso concreto">${commercialEscape(tracking.notas || '')}</textarea>
                    </label>
                </div>
                <div class="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
                    <button onclick="cerrarSeguimientoComercial()" class="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
                    <button id="com-guardar" onclick="guardarSeguimientoComercial('${commercialEscape(negocioId)}')" class="px-5 py-2.5 rounded-lg bg-fuchsia-700 text-white font-bold">Guardar seguimiento</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function cerrarSeguimientoComercial() {
    document.getElementById('modal-seguimiento-comercial')?.remove();
}

async function guardarSeguimientoComercial(negocioId) {
    const button = document.getElementById('com-guardar');
    if (button) { button.disabled = true; button.textContent = 'Guardando…'; }
    const current = obtenerSeguimientoComercial(negocioId);
    const payload = {
        negocio_id: negocioId,
        estado: document.getElementById('com-estado')?.value || 'sin_contactar',
        prioridad_manual: document.getElementById('com-prioridad')?.value || null,
        ultimo_contacto: document.getElementById('com-ultimo-contacto')?.value || null,
        proximo_seguimiento: document.getElementById('com-proximo')?.value || null,
        responsable: document.getElementById('com-responsable')?.value.trim() || null,
        objecion: document.getElementById('com-objecion')?.value.trim() || null,
        resultado: document.getElementById('com-resultado')?.value || 'sin_cambio',
        notas: document.getElementById('com-notas')?.value.trim() || null,
        created_at: current.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    commercialState.trackingByBusiness[String(negocioId)] = payload;
    commercialWriteLocal();
    let remoteSaved = false;
    try {
        const { error } = await window.supabase.from(COMMERCIAL_TABLE).upsert(payload, { onConflict: 'negocio_id' });
        if (error) throw error;
        commercialState.persistence = 'supabase';
        remoteSaved = true;
    } catch (error) {
        commercialState.persistence = 'local';
        console.warn('Seguimiento guardado solo localmente:', error?.message || error);
    }
    cerrarSeguimientoComercial();
    if (typeof renderHeader === 'function') renderHeader();
    if (typeof actualizarListaNegocios === 'function') actualizarListaNegocios();
    alert(remoteSaved ? '✅ Seguimiento guardado en Supabase.' : '💾 Seguimiento guardado en este dispositivo. Ejecuta el SQL incluido para sincronizarlo en Supabase.');
}

window.cargarAuditoriaComercial = cargarAuditoriaComercial;
window.cargarSeguimientoComercial = cargarSeguimientoComercial;
window.obtenerAuditoriaComercial = obtenerAuditoriaComercial;
window.obtenerSeguimientoComercial = obtenerSeguimientoComercial;
window.renderEmbudoComercial = renderEmbudoComercial;
window.renderFichaComercial = renderFichaComercial;
window.aplicarFiltroComercial = aplicarFiltroComercial;
window.ordenarPorPrioridadComercial = ordenarPorPrioridadComercial;
window.filtrarComercial = filtrarComercial;
window.limpiarFiltroComercial = limpiarFiltroComercial;
window.abrirSeguimientoComercial = abrirSeguimientoComercial;
window.cerrarSeguimientoComercial = cerrarSeguimientoComercial;
window.guardarSeguimientoComercial = guardarSeguimientoComercial;
