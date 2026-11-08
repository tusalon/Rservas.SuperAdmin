// Revisión salón por salón: la situación REAL de cada negocio (plan, pago, uso, configuración,
// último contacto) para valorarla con las admins, con el WhatsApp de cada uno a un toque.
// Se carga después de super-admin.js y usa sus helpers globales (chip, BTN_*, escapeHtml,
// jsArg, enlaceWhatsApp, botonRegistrarPago, fechaPagoDe, diasHastaPago, esFechaHeredada, ...).
// Solo LEE: no cambia nada en la base. Registrar un pago o escribir sigue pasando por los
// botones de siempre.

// El orden de esta lista es el orden de prioridad al revisar: lo que más dinero puede
// estar escondido primero.
const SITUACIONES_REV = [
    { k: 'pago_en_prueba', t: 'Tiene un pago anotado pero sigue en prueba', tono: 'rojo', plantilla: 'pago_a_confirmar',
      que: 'Hay un pago registrado y la cuenta quedó como prueba. Mira si hay que activarla (Registrar pago).' },
    { k: 'pago_sin_registrar', t: 'Plan activo vencido y sigue usando la app', tono: 'ambar', plantilla: 'pago_a_confirmar',
      que: 'Sigue recibiendo citas con el plan vencido. Lo más probable: pagó y falta registrarlo, o usa sin pagar.' },
    { k: 'prueba_terminada_con_uso', t: 'Prueba terminada y sigue usando la app', tono: 'ambar', plantilla: 'prueba_terminada_con_uso',
      que: 'La prueba acabó pero sigue recibiendo citas: ¿pagó sin que se anotara, o la usa gratis?' },
    { k: 'dejo_de_pagar', t: 'Plan vencido y sin actividad', tono: 'rojo', plantilla: 'dejo_de_pagar',
      que: 'Pagaba, venció y ya no recibe citas. Pregunta si lo deja o si falta algo.' },
    { k: 'por_vencer', t: 'Vence en 7 días o menos', tono: 'ambar', plantilla: 'vence',
      que: 'Plan activo que se renueva pronto.' },
    { k: 'prueba_por_terminar', t: 'Prueba que está por terminar', tono: 'ambar', plantilla: 'prueba_por_terminar',
      que: 'Aún está en prueba: momento para ofrecer activarla.' },
    { k: 'prueba_vigente', t: 'En prueba, sin urgencia', tono: 'gris', plantilla: 'saludo',
      que: 'La prueba sigue; todavía no hay nada que cobrar.' },
    { k: 'al_dia', t: 'Paga y está al día', tono: 'verde', plantilla: 'saludo',
      que: 'Nada que hacer con el pago.' },
    { k: 'plan_sin_fecha', t: 'Plan activo con fecha vieja', tono: 'gris', plantilla: 'saludo',
      que: 'Su fecha es anterior al corte de cobro: el sistema no la bloquea. Confirma hasta cuándo pagó.' },
    { k: 'prueba_terminada_poco_uso', t: 'Prueba terminada, usó la app antes', tono: 'gris', plantilla: 'prueba_terminada_sin_uso',
      que: 'Tuvo citas hace tiempo y ahora no. Posible recuperación.' },
    { k: 'nunca_configuro', t: 'Nunca terminó la configuración', tono: 'gris', plantilla: 'configurar',
      que: 'No puede recibir reservas hasta configurar.' },
    { k: 'nunca_reservo', t: 'Configurada pero nunca recibió una cita', tono: 'gris', plantilla: 'primera_reserva',
      que: 'Está lista pero nadie ha reservado: ayúdala a compartir su enlace.' },
    { k: 'suspendida', t: 'Suspendida', tono: 'rojo', plantilla: 'saludo',
      que: 'La suspendiste a mano.' },
];
const SIT_POR_CLAVE = Object.fromEntries(SITUACIONES_REV.map(s => [s.k, s]));

// Qué situación le toca a este salón. Una sola, la más importante.
function situacionRevision(n) {
    const u = resumenUsoSalon(n);
    const f = fechaPagoDe(n);
    const heredada = Boolean(f) && esFechaHeredada(f);
    const dias = f && !heredada ? diasHastaPago(f) : null;
    const usa = u.r30 > 0;
    const pagoAnotado = Boolean(n.fecha_ultimo_pago);

    if (n.estado_suscripcion === 'suspendida') return 'suspendida';
    if (n.estado_suscripcion === 'activa') {
        if (dias == null) return usa ? 'pago_sin_registrar' : 'plan_sin_fecha';
        if (dias < 0) return usa ? 'pago_sin_registrar' : 'dejo_de_pagar';
        return dias <= 7 ? 'por_vencer' : 'al_dia';
    }
    // En prueba (o cualquier otro estado sin plan).
    if (pagoAnotado) return 'pago_en_prueba';
    if (dias != null && dias >= 0) return dias <= 7 ? 'prueba_por_terminar' : 'prueba_vigente';
    if (usa) return 'prueba_terminada_con_uso';
    if (u.total > 0) return 'prueba_terminada_poco_uso';
    return n.configurado ? 'nunca_reservo' : 'nunca_configuro';
}

const fechaRev = f => {
    if (!f) return '—';
    try { return fechaLocal(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }); } catch { return String(f).slice(0, 10); }
};
const monedaRev = m => (m == null || m === '' ? '' : ` · ${Number(m).toLocaleString('es-ES')}`);
const haceRev = d => (d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} d`);

// Las líneas que se leen una por una. Todo sale de datos de la base, nada inventado.
function lineasRevision(n) {
    const u = resumenUsoSalon(n);
    const f = fechaPagoDe(n);
    const heredada = Boolean(f) && esFechaHeredada(f);
    const dias = f ? diasHastaPago(f) : null;
    const lineas = [];

    const plan = n.estado_suscripcion === 'activa' ? 'Plan activo' : n.estado_suscripcion === 'suspendida' ? 'Suspendida' : 'En prueba';
    let vence = '';
    if (!f) vence = ' · sin fecha';
    else if (heredada) vence = ` · fecha ${fechaRev(f)} (anterior al corte: no se bloquea)`;
    else if (dias < 0) vence = ` · venció el ${fechaRev(f)} (${haceRev(-dias)})`;
    else if (dias === 0) vence = ' · vence hoy';
    else vence = ` · vence el ${fechaRev(f)} (en ${dias} d)`;
    lineas.push(['Plan', plan + vence]);

    // Pagó y aun así figura vencido: el pago es de la fecha del vencimiento (o posterior) y la fecha no avanzó.
    const pagoSinAvanzar = Boolean(n.fecha_ultimo_pago && f && !heredada && dias < 0
        && fechaLocal(n.fecha_ultimo_pago).getTime() >= fechaLocal(f).getTime() - 2 * 86400000);
    lineas.push(['Pago', n.fecha_ultimo_pago
        ? `Último anotado: ${fechaRev(n.fecha_ultimo_pago)}${monedaRev(n.monto_ultimo_pago)}${pagoSinAvanzar ? ' · OJO: pagó junto a su vencimiento y la fecha no avanzó, revisa si quedó bien' : ''}`
        : 'Nunca se anotó un pago']);

    lineas.push(['Uso', u.total
        ? `${u.r30} cita${u.r30 === 1 ? '' : 's'} en 30 d · ${u.total} en total${u.futuras ? ` · ${u.futuras} próxima${u.futuras === 1 ? '' : 's'}` : ''}${u.ultima ? ` · última ${fechaRev(u.ultima)}` : ''}`
        : 'Nunca recibió una cita']);

    const problemas = typeof diagnosticarNegocio === 'function' ? diagnosticarNegocio(n) : [];
    lineas.push(['Config', n.configurado === false ? 'No terminó el asistente' : (problemas.length ? `Le falta: ${problemas.join(', ')}` : 'Completa')]);

    const seg = window.obtenerSeguimientoComercial?.(n.id);
    const contacto = seg?.ultimo_contacto ? `Último contacto: ${fechaRev(seg.ultimo_contacto)}` : 'Sin contactar';
    lineas.push(['Registro', `${n.dias_activo != null ? `${n.dias_activo} d desde el alta · ` : ''}${contacto}`]);
    return lineas;
}

let revFiltro = 'todas';
let revTexto = '';
let revMostrar = 40;

function negociosRevision() {
    return negociosData.filter(n => n.archivado !== true && n.es_tienda_externa !== true && !eliminadosLocal.includes(n.id));
}

function tarjetaRevision(n, sit) {
    const s = SIT_POR_CLAVE[sit];
    const filas = lineasRevision(n).map(([k, v]) => `
        <div class="flex gap-2"><dt class="w-16 shrink-0 text-gray-500">${k}</dt><dd class="min-w-0 break-words text-gray-800">${escapeHtml(v)}</dd></div>`).join('');
    const tel = normalizarTelefonoWhatsApp(n.telefono, n.codigo_pais);
    return `
        <li class="py-3">
            <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-gray-900 break-words">${escapeHtml(n.nombre || '(sin nombre)')}</span>
                ${chip(escapeHtml(s.t), s.tono, true)}
            </div>
            <p class="text-sm text-gray-600 mt-0.5">${escapeHtml(n.telefono || 'sin teléfono')}${n.email ? ` · ${escapeHtml(n.email)}` : ''}</p>
            <dl class="mt-2 space-y-0.5 text-sm">${filas}</dl>
            <p class="mt-2 text-sm text-gray-700"><span class="font-medium">Qué revisar:</span> ${escapeHtml(s.que)}</p>
            <div class="mt-2 flex flex-wrap gap-2">
                ${tel ? `<button type="button" onclick="abrirChatRevision(${jsArg(n.id)})" class="${BTN_PRI}">Abrir chat</button>${enlaceWhatsApp(n, 'Con mensaje', s.plantilla)}` : '<span class="text-sm text-red-700">Sin teléfono válido</span>'}
                ${botonRegistrarPago(n, BTN_SEC)}
            </div>
        </li>`;
}

function renderRevision() {
    const modal = document.getElementById('modal-revision');
    if (!modal) return;
    const todas = negociosRevision().map(n => ({ n, sit: situacionRevision(n) }));
    const conteo = Object.fromEntries(SITUACIONES_REV.map(s => [s.k, 0]));
    todas.forEach(x => { conteo[x.sit]++; });

    const q = revTexto.trim().toLowerCase();
    const lista = todas
        .filter(x => (revFiltro === 'todas' || x.sit === revFiltro)
            && (!q || `${x.n.nombre || ''} ${x.n.telefono || ''} ${x.n.email || ''}`.toLowerCase().includes(q)))
        .sort((a, b) => SITUACIONES_REV.findIndex(s => s.k === a.sit) - SITUACIONES_REV.findIndex(s => s.k === b.sit)
            || (resumenUsoSalon(b.n).r30 - resumenUsoSalon(a.n).r30));

    const opciones = [{ k: 'todas', t: 'Todas', c: todas.length }, ...SITUACIONES_REV.filter(s => conteo[s.k]).map(s => ({ k: s.k, t: s.t, c: conteo[s.k] }))]
        .map(c => `<option value="${c.k}" ${revFiltro === c.k ? 'selected' : ''}>${escapeHtml(c.t)} (${c.c})</option>`).join('');

    modal.querySelector('#rev-filtro').innerHTML = opciones;
    modal.querySelector('#rev-resumen').textContent = `${lista.length} ${lista.length === 1 ? 'salón' : 'salones'} en esta vista`;
    const visibles = lista.slice(0, revMostrar);
    modal.querySelector('#rev-lista').innerHTML = visibles.length
        ? visibles.map(x => tarjetaRevision(x.n, x.sit)).join('')
        : '<li class="py-6 text-sm text-gray-600">Ningún salón en esta vista.</li>';
    modal.querySelector('#rev-mas').classList.toggle('hidden', lista.length <= revMostrar);
    modal.querySelector('#rev-mas').textContent = `Ver ${Math.min(40, lista.length - revMostrar)} más (de ${lista.length - revMostrar} que faltan)`;
    modal._lista = lista;
}

function abrirRevision() {
    document.getElementById('modal-revision')?.remove();
    revMostrar = 40;
    const modal = document.createElement('div');
    modal.id = 'modal-revision';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 flex items-start sm:items-center justify-center p-0 sm:p-4';
    modal.innerHTML = `
        <div class="bg-white sm:rounded-lg shadow-xl w-full max-w-3xl h-dvh sm:h-auto sm:max-h-[calc(100dvh-2rem)] flex flex-col">
            <div class="flex items-start justify-between gap-3 px-4 pt-4 pb-2 border-b border-gray-200">
                <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-gray-900">Revisión salón por salón</h3>
                    <p class="text-sm text-gray-600">La situación real de cada salón, ordenada por lo que más conviene revisar. Solo lectura.</p>
                </div>
                <button type="button" aria-label="Cerrar" onclick="document.getElementById('modal-revision')?.remove()" class="-mr-2 -mt-1 inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-md text-gray-600 hover:bg-gray-100 text-2xl leading-none">&times;</button>
            </div>
            <div class="px-4 py-2 border-b border-gray-200">
                <label for="rev-buscar" class="sr-only">Buscar salón</label>
                <input id="rev-buscar" type="search" placeholder="Buscar por nombre, teléfono o correo" autocomplete="off"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 min-h-11 md:min-h-10 text-base md:text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200">
                <label for="rev-filtro" class="sr-only">Situación</label>
                <select id="rev-filtro" onchange="filtrarRevision(this.value)" class="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 min-h-11 md:min-h-10 text-base md:text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"></select>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span id="rev-resumen" class="text-sm text-gray-600 mr-auto"></span>
                    <button type="button" onclick="actualizarRevision()" class="${BTN_SEC}">Actualizar</button>
                    <button type="button" onclick="copiarListaRevision(this)" class="${BTN_SEC}">Copiar esta lista</button>
                </div>
            </div>
            <div class="overflow-y-auto px-4 flex-1 min-h-0">
                <ul id="rev-lista" class="divide-y divide-gray-200"></ul>
                <button type="button" id="rev-mas" onclick="verMasRevision()" class="${BTN_SEC} w-full my-3 hidden"></button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    prepararModal(modal, 'Revisión salón por salón');
    modal.querySelector('#rev-buscar').addEventListener('input', e => { revTexto = e.target.value; revMostrar = 40; renderRevision(); });
    renderRevision();
}

// Abre el chat vacío: para mirar la conversación y decidir qué escribir en el momento. No lo anota
// como contacto (solo el botón «Con mensaje» lo hace, porque ahí sí se escribe).
function abrirChatRevision(id) {
    const n = negociosData.find(x => String(x.id) === String(id));
    const tel = n && normalizarTelefonoWhatsApp(n.telefono, n.codigo_pais);
    if (!tel) { alert(`${n?.nombre || 'Este salón'} no tiene un teléfono válido.`); return; }
    window.open(`https://wa.me/${tel}`, '_blank', 'noopener');
}

function verMasRevision() { revMostrar += 40; renderRevision(); }
function filtrarRevision(clave) { revFiltro = clave; revMostrar = 40; renderRevision(); }

// Vuelve a leer los salones de la base (por si acabas de registrar un pago) y repinta.
async function actualizarRevision() {
    try { await window.cargarNegocios?.(); } catch (e) { console.warn('No se pudo actualizar la revisión:', e); }
    renderRevision();
}

// Lista de texto para pegar a las admins: un salón por línea, sin teléfonos de clientas.
async function copiarListaRevision(boton) {
    const modal = document.getElementById('modal-revision');
    const lista = modal?._lista || [];
    const texto = lista.map(({ n, sit }) => {
        const u = resumenUsoSalon(n);
        const pago = n.fecha_ultimo_pago ? `último pago ${fechaRev(n.fecha_ultimo_pago)}` : 'sin pagos anotados';
        return `${n.nombre || '(sin nombre)'} · ${n.telefono || 'sin teléfono'} · ${SIT_POR_CLAVE[sit].t} · ${pago} · ${u.r30} citas/30 d`;
    }).join('\n');
    const ok = await copiarAlPortapapeles(texto);
    if (boton) { const t = boton.textContent; boton.textContent = ok ? 'Copiada ✓' : 'No se pudo copiar'; setTimeout(() => { boton.textContent = t; }, 1800); }
}

function botonRevision() {
    return `<button type="button" onclick="abrirRevision()" class="${BTN_OSCURO}">Revisión</button>`;
}

window.abrirRevision = abrirRevision;
window.filtrarRevision = filtrarRevision;
window.verMasRevision = verMasRevision;
window.abrirChatRevision = abrirChatRevision;
window.actualizarRevision = actualizarRevision;
window.copiarListaRevision = copiarListaRevision;
window.botonRevision = botonRevision;
window.renderRevision = renderRevision;
window.situacionRevision = situacionRevision;
