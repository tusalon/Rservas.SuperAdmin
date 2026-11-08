// Crear un salon nuevo desde el SuperAdmin (movil o PC). Sustituye a
// C:\ClientesAutomation\Abrir Panel.bat: todo vive en Supabase, el alta es la
// funcion crear_cliente() (sql-crear-cliente.sql) y el mensaje de bienvenida sale
// de aqui. Se carga despues de super-admin.js y usa sus helpers globales
// (UI, BTN_*, escapeHtml, prepararModal, normalizarTelefonoWhatsApp, ...).

let solicitudesAlta = [];          // solicitudes de la web aun sin atender
let solicitudesAltaCargadas = false;

// ---------------------------------------------------------------- mensaje fijo
// Texto de la PC (plantillas/mensaje-base.txt) con la contraseña JUNTA, como se
// decidio el 07-11-2026. Si algun dia se quiere separar, solo hay que quitar la
// linea de la contraseña y avisar en el modal de que va aparte.
// Van a /releases/latest/ a proposito: apuntan solas a la ultima version.
const APK_PANEL_ALTA = 'https://github.com/tusalon/rservasroma/releases/latest/download/rservasroma-admin-debug.apk';
const APK_CLIENTAS_ALTA = 'https://github.com/tusalon/rservasroma-clientes/releases/latest/download/rservasroma-clientes.apk';

function mensajeBienvenidaAlta({ nombre, slug, password, telefono, email }) {
    return `✨ ¡Hola! Tu sistema de reservas para ${nombre} ya está listo ✨

⚙️ Tu panel de administración:
https://tusalon.github.io/rservasroma/admin.html?s=${slug}

🔑 Datos de acceso:
• Usuario: ${slug}
• Contraseña: ${password}

📌 Primeros pasos (5 minutos):
1. Entra al panel con tu usuario y contraseña
2. Te va a guiar paso a paso: quién atiende, tus servicios
   principales y las horas en que trabajas
3. Al terminar ¡ya puedes recibir reservas! 🎉
4. Comparte tu enlace con tus clientas desde el botón 🔗

📲 Instala el panel como app en tu celular:
• Android: descarga e instala este archivo desde el teléfono:
  ${APK_PANEL_ALTA}
  Si Android te avisa de "orígenes desconocidos", permítelo para el navegador.
  También puedes usarlo sin instalar nada: acepta el aviso de "Instalar app"
  que te sale al entrar, o abre el menú ⋮ del navegador → "Instalar app"
• iPhone: abre el enlace en Safari → Compartir ⬆️ → "Añadir a pantalla de
  inicio", y desde ahora entra siempre por ese ícono

🔔 Notificaciones al instante:
Dentro del panel toca el botón 🔔 y acepta el permiso. Te va a llegar un
aviso al celular cada vez que entre una reserva, una cancelación o un pago
— y cada mañana, el resumen con todos los turnos de tu día.
📱 En iPhone instala primero la app (paso de arriba) y necesitas iOS 16.4
o más nuevo.

👭 La app para tus clientas:
Cuando les compartas tu enlace, cada clienta puede dejarlo como app en su
celular. Pásales esto según su teléfono:

• Android — que descargue e instale este archivo:
  ${APK_CLIENTAS_ALTA}
• iPhone — no se pueden instalar apps fuera de la App Store, así que se hace
  desde el navegador: que abra tu enlace en Safari, toque Compartir ⬆️ y
  luego "Añadir a pantalla de inicio". Le queda el ícono igual que una app.

La app de tus clientas se actualiza sola: siempre abre la versión más nueva,
nadie tiene que reinstalar nada.

🗓️ Lo que ya viene listo en tu panel:
• Horarios por día: marcas las horas exactas en que atiendes
• Días especiales: horario distinto para feriados o semanas puntuales
• Catálogo de diseños: subes tus fotos y tus clientas eligen el
  diseño al reservar
• Fidelización: cada X citas, la siguiente lleva descuento automático
• "Turnos de mañana": le recuerdas por WhatsApp a tus clientas
  con un solo toque
• Cobro real de cada cita y estadísticas de tu mes
• Idioma español/inglés y tu moneda según tu país

💅 Datos que cargué por ti:
• Teléfono: ${telefono}
• Email: ${email}
(Los cambias cuando quieras en "Editar Negocio" 💖)

Cualquier duda escríbeme al wa.me/+15154650340 🚀

🏠 La Casa de la Comunidad RservasRoma — aquí compartimos ideas,
novedades y nos ayudamos entre salones:
https://chat.whatsapp.com/E8S5IQrEHSEIq7Yt2jFiG1?s=cl&p=a&mlu=4&ilr=4
`;
}

// ------------------------------------------------------------------- utilidades
// Sin i, l, o, 0, 1: se dictan o se leen mal por WhatsApp. 31 simbolos; se
// descartan los bytes que darian un reparto desigual.
const LETRAS_CLAVE = 'abcdefghjkmnpqrstuvwxyz23456789';
function generarClaveAlta(largo = 8) {
    let clave = '';
    while (clave.length < largo) {
        const bytes = crypto.getRandomValues(new Uint8Array(largo * 2));
        for (const b of bytes) {
            if (b < 248 && clave.length < largo) clave += LETRAS_CLAVE[b % LETRAS_CLAVE.length];
        }
    }
    return clave;
}

// Misma idea que la funcion de la base (que manda: si el slug ya existe le suma -2).
function slugDesdeNombre(nombre) {
    const base = String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36).replace(/-+$/g, '');
    return base.length >= 2 ? base : 'salon';
}

// Misma lista que el formulario de la web (HouseofRservasRoma/app.js): toda América y España.
const PAISES_ALTA = [
    ['Cuba', '53'], ['EE. UU.', '1'], ['México', '52'], ['España', '34'],
    ...[['Antigua y Barbuda', '1'], ['Argentina', '54'], ['Aruba', '297'], ['Bahamas', '1'], ['Barbados', '1'], ['Belice', '501'], ['Bermudas', '1'], ['Bolivia', '591'], ['Brasil', '55'], ['Canadá', '1'], ['Chile', '56'], ['Colombia', '57'], ['Costa Rica', '506'], ['Curazao', '599'], ['Dominica', '1'], ['Ecuador', '593'], ['El Salvador', '503'], ['Granada', '1'], ['Guadalupe', '590'], ['Guatemala', '502'], ['Guayana Francesa', '594'], ['Guyana', '592'], ['Haití', '509'], ['Honduras', '504'], ['Islas Caimán', '1'], ['Jamaica', '1'], ['Martinica', '596'], ['Nicaragua', '505'], ['Panamá', '507'], ['Paraguay', '595'], ['Perú', '51'], ['Puerto Rico', '1'], ['R. Dominicana', '1'], ['San Cristóbal y Nieves', '1'], ['San Vicente', '1'], ['Santa Lucía', '1'], ['Surinam', '597'], ['Trinidad y Tobago', '1'], ['Uruguay', '598'], ['Venezuela', '58']]
        .sort((a, b) => a[0].localeCompare(b[0], 'es'))
].map(([n, c]) => [c, n + ' (+' + c + ')']).concat([['otro', 'Otro país…']]);

const MOTIVOS_ALTA = {
    nombre_invalido: 'Escribe el nombre del salón (entre 2 y 80 letras).',
    email_invalido: 'Ese correo no parece válido. Revísalo.',
    password_invalida: 'La contraseña debe tener entre 6 y 72 caracteres.',
    codigo_pais_invalido: 'El código del país no es válido.',
    telefono_invalido: 'El teléfono no parece válido. Escríbelo sin el código del país.',
    slug_invalido: 'La dirección solo puede llevar letras minúsculas, números, guion y guion bajo (2 a 40).',
    slug_existe: 'Ya existe un salón con esa dirección. Cámbiala o déjala vacía para que se genere sola.',
    duplicado_simultaneo: 'Otro alta con el mismo correo o dirección se guardó justo ahora. Revisa la lista y vuelve a intentarlo.',
};

function ayudaFuncionFaltante(error) {
    const texto = `${error?.code || ''} ${error?.message || ''}`;
    return /PGRST202|42883|could not find the function|does not exist/i.test(texto)
        ? 'Falta crear la función en Supabase: ejecuta una vez sql-crear-cliente.sql en el SQL Editor.'
        : null;
}

// ------------------------------------------------------------------ solicitudes
async function cargarSolicitudesAlta() {
    try {
        const { data, error } = await window.supabase.rpc('solicitudes_alta_pendientes');
        if (error) throw error;
        solicitudesAlta = Array.isArray(data) ? data : [];
    } catch (error) {
        // Sin la funcion todavia, o sin red: el boton sigue funcionando sin la lista.
        console.warn('No se pudieron leer las solicitudes de alta:', error?.message || error);
        solicitudesAlta = [];
    }
    solicitudesAltaCargadas = true;
    repintarPanel();
}
window.cargarSolicitudesAlta = cargarSolicitudesAlta;

function botonNuevoSalon() {
    const n = solicitudesAlta.length;
    const aviso = n
        ? `<span class="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-amber-400 text-purple-950 text-xs font-bold" aria-label="${n} solicitudes por atender">${n}</span>`
        : '';
    return `<button type="button" onclick="abrirNuevoCliente()" class="${BTN_OSCURO}">+ Nuevo salón${aviso}</button>`;
}
window.botonNuevoSalon = botonNuevoSalon;

async function descartarSolicitudAlta(id) {
    const s = solicitudesAlta.find(x => String(x.id) === String(id));
    if (!confirm(`¿Descartar la solicitud de ${s?.nombre_salon || 'este salón'}?\n\nSale de la lista de pendientes.`)) return;
    const { error } = await window.supabase.rpc('solicitud_alta_descartar', { p_id: id });
    if (error) { alert('No se pudo descartar: ' + error.message); return; }
    solicitudesAlta = solicitudesAlta.filter(x => String(x.id) !== String(id));
    repintarPanel();
    abrirNuevoCliente();
}
window.descartarSolicitudAlta = descartarSolicitudAlta;

// ------------------------------------------------------------------- formulario
const CAMPO_ALTA = 'w-full rounded-md border border-gray-300 bg-white px-3 min-h-11 text-base md:text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200';

function abrirNuevoCliente(solicitud = null) {
    document.getElementById('modal-nuevo-cliente')?.remove();
    const s = solicitud && typeof solicitud === 'object' ? solicitud : null;

    const listaSolicitudes = solicitudesAlta.length && !s ? `
        <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p class="text-sm font-semibold text-amber-900">Solicitudes de la web (${solicitudesAlta.length})</p>
            <ul class="mt-2 space-y-2">
                ${solicitudesAlta.map(x => `
                    <li class="rounded-md bg-white border border-amber-100 p-2">
                        <p class="text-sm font-medium text-gray-900 break-words">${escapeHtml(x.nombre_salon)}</p>
                        <p class="text-xs text-gray-600 break-words">${escapeHtml(x.whatsapp)} · ${escapeHtml(x.email)}${x.plataforma ? ' · ' + escapeHtml(x.plataforma) : ''}</p>
                        ${x.nota ? `<p class="text-xs text-gray-600 mt-1 break-words">“${escapeHtml(x.nota)}”</p>` : ''}
                        <div class="flex gap-2 mt-2">
                            <button type="button" class="${BTN_PRI}" onclick="abrirNuevoCliente(solicitudAltaPorId(${jsArg(x.id)}))">Usar estos datos</button>
                            <button type="button" class="${BTN_SEC}" onclick="descartarSolicitudAlta(${jsArg(x.id)})">Descartar</button>
                        </div>
                    </li>`).join('')}
            </ul>
            <p class="text-xs text-amber-900 mt-2">O llena el formulario de abajo para un salón que no vino por la web.</p>
        </div>` : '';

    const modal = document.createElement('div');
    modal.id = 'modal-nuevo-cliente';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div class="flex items-start justify-between gap-3 mb-3">
                <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-gray-900">Nuevo salón</h3>
                    <p class="text-sm text-gray-600">Queda sin configurar: al entrar, su dueña ve el asistente y pone sus propios servicios.</p>
                </div>
                <button type="button" aria-label="Cerrar" onclick="document.getElementById('modal-nuevo-cliente')?.remove()" class="-mr-2 -mt-1 inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-md text-gray-600 hover:bg-gray-100 text-2xl leading-none">&times;</button>
            </div>
            ${listaSolicitudes}
            <form id="nc-form" novalidate autocomplete="off">
                <label for="nc-nombre" class="block text-sm font-medium text-gray-800 mb-1">Nombre del salón</label>
                <input id="nc-nombre" type="text" maxlength="80" class="${CAMPO_ALTA}" value="${escapeHtml(s?.nombre_salon || '')}">
                <p id="nc-enlace" class="mt-1 text-xs text-gray-600 break-all"></p>

                <label for="nc-pais" class="block text-sm font-medium text-gray-800 mt-3 mb-1">País</label>
                <select id="nc-pais" class="${CAMPO_ALTA}">
                    ${PAISES_ALTA.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
                </select>
                <input id="nc-pais-otro" type="text" inputmode="numeric" maxlength="4" placeholder="Código del país, por ejemplo 593" class="${CAMPO_ALTA} mt-2 hidden">

                <label for="nc-telefono" class="block text-sm font-medium text-gray-800 mt-3 mb-1">WhatsApp de la dueña</label>
                <input id="nc-telefono" type="tel" inputmode="tel" class="${CAMPO_ALTA}" value="${escapeHtml(s?.whatsapp || '')}">

                <label for="nc-email" class="block text-sm font-medium text-gray-800 mt-3 mb-1">Correo</label>
                <input id="nc-email" type="email" inputmode="email" autocapitalize="off" class="${CAMPO_ALTA}" value="${escapeHtml(s?.email || '')}">
                <div id="nc-conflicto" class="hidden mt-2" role="alert"></div>

                <label for="nc-clave" class="block text-sm font-medium text-gray-800 mt-3 mb-1">Contraseña</label>
                <div class="flex gap-2">
                    <input id="nc-clave" type="text" autocapitalize="off" spellcheck="false" class="${CAMPO_ALTA} font-mono" value="${generarClaveAlta()}">
                    <button type="button" id="nc-otra" class="${BTN_SEC}">Otra</button>
                </div>
                <p class="mt-1 text-xs text-gray-600">Va en el mensaje de bienvenida. Después la cambias desde el menú del salón → Cambiar contraseña.</p>

                <details class="mt-3">
                    <summary class="text-sm text-purple-800 cursor-pointer">Cambiar la dirección del salón (opcional)</summary>
                    <input id="nc-slug" type="text" autocapitalize="off" spellcheck="false" placeholder="se genera sola desde el nombre" class="${CAMPO_ALTA} mt-2">
                </details>

                <p id="nc-error" class="hidden mt-3 text-sm text-red-700" role="alert"></p>
                <div class="flex gap-2 mt-4">
                    <button type="button" class="${BTN_SEC} flex-1" onclick="document.getElementById('modal-nuevo-cliente')?.remove()">Cancelar</button>
                    <button type="submit" id="nc-crear" class="${BTN_PRI} flex-1">Crear salón</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
    prepararModal(modal, 'Nuevo salón');

    const $ = id => modal.querySelector('#' + id);
    const valorPais = () => ($('nc-pais').value === 'otro' ? $('nc-pais-otro').value.trim() : $('nc-pais').value);
    const mostrarError = texto => {
        $('nc-error').textContent = texto || '';
        $('nc-error').classList.toggle('hidden', !texto);
        if (texto) $('nc-error').scrollIntoView({ block: 'nearest' });
    };
    const pintarEnlace = () => {
        const slug = $('nc-slug').value.trim().toLowerCase() || slugDesdeNombre($('nc-nombre').value);
        $('nc-enlace').textContent = $('nc-nombre').value.trim()
            ? `Enlace de sus clientas: tusalon.github.io/rservasroma/?s=${slug} (si ya existe, se le añade un número)`
            : '';
    };
    $('nc-nombre').addEventListener('input', pintarEnlace);
    $('nc-slug').addEventListener('input', pintarEnlace);
    $('nc-pais').addEventListener('change', () => {
        $('nc-pais-otro').classList.toggle('hidden', $('nc-pais').value !== 'otro');
        if ($('nc-pais').value === 'otro') $('nc-pais-otro').focus();
    });
    $('nc-otra').addEventListener('click', () => { $('nc-clave').value = generarClaveAlta(); });
    $('nc-email').addEventListener('input', () => { $('nc-conflicto').classList.add('hidden'); });
    pintarEnlace();

    // Si la solicitud trae el país ("+34 612345678", así lo guarda la web), se marca solo
    // y el teléfono queda sin el prefijo. Sin "+", se deja Cuba como antes.
    const conPais = /^\+(\d{1,4})\s+(.+)$/.exec((s?.whatsapp || '').trim());
    if (conPais) {
        const [, cod, resto] = conPais;
        if (PAISES_ALTA.some(([v]) => v === cod)) $('nc-pais').value = cod;
        else { $('nc-pais').value = 'otro'; $('nc-pais-otro').value = cod; $('nc-pais-otro').classList.remove('hidden'); }
        $('nc-telefono').value = resto;
    }

    modal.querySelector('#nc-form').addEventListener('submit', async e => {
        e.preventDefault();
        mostrarError('');
        $('nc-conflicto').classList.add('hidden');
        const boton = $('nc-crear');
        if (boton.disabled) return; // un solo toque: dos altas seguidas darian "correo repetido"
        boton.disabled = true;
        boton.textContent = 'Creando…';
        const claveDicha = $('nc-clave').value;
        try {
            const { data, error } = await window.supabase.rpc('crear_cliente', {
                p_nombre: $('nc-nombre').value,
                p_telefono: $('nc-telefono').value,
                p_email: $('nc-email').value,
                p_password: claveDicha,
                p_codigo_pais: valorPais(),
                p_slug: $('nc-slug').value.trim() || null,
                p_solicitud_id: s?.id || null,
            });
            if (error) throw error;

            if (!data?.ok) {
                if (data?.motivo === 'email_existe') {
                    const x = data.existente || {};
                    const fecha = x.fecha_registro ? new Date(x.fecha_registro).toLocaleDateString('es') : '';
                    $('nc-conflicto').innerHTML = `
                        <div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            <p class="font-semibold">Ese correo ya tiene un salón</p>
                            <p class="mt-1 break-words">${escapeHtml(x.nombre || 'Sin nombre')} · ${escapeHtml(x.slug || 'sin dirección')} · ${escapeHtml(x.telefono || '')}${fecha ? ' · desde ' + escapeHtml(fecha) : ''}</p>
                            <p class="mt-1">Cada salón necesita su propio correo. Si es el mismo salón, no lo crees otra vez: búscalo en la lista.</p>
                            <button type="button" id="nc-otro-salon" class="${BTN_SEC} mt-2">Es otro salón</button>
                        </div>`;
                    $('nc-conflicto').classList.remove('hidden');
                    $('nc-conflicto').scrollIntoView({ block: 'nearest' }); // en el movil queda bajo el boton
                    $('nc-otro-salon').addEventListener('click', () => {
                        $('nc-conflicto').classList.add('hidden');
                        $('nc-email').focus();
                        $('nc-email').select();
                        mostrarError('Escribe el correo propio de este salón.');
                    });
                    return;
                }
                mostrarError(MOTIVOS_ALTA[data?.motivo] || 'No se pudo crear el salón.');
                return;
            }

            // Creado. Se vuelve a leer la lista para que el salon aparezca en el panel.
            modal.remove();
            solicitudesAlta = solicitudesAlta.filter(x => String(x.id) !== String(s?.id));
            mostrarSalonCreado({ ...data, password: claveDicha });
            cargarNegocios().then(lista => { if (lista?.length) { negociosData = lista; } repintarPanel(); })
                .catch(err => console.warn('No se pudo refrescar la lista tras crear el salón:', err));
        } catch (error) {
            mostrarError(ayudaFuncionFaltante(error) || ('No se pudo crear el salón: ' + (error?.message || error)));
        } finally {
            if (document.body.contains(boton)) { boton.disabled = false; boton.textContent = 'Crear salón'; }
        }
    });
}
window.abrirNuevoCliente = abrirNuevoCliente;
window.solicitudAltaPorId = id => solicitudesAlta.find(x => String(x.id) === String(id)) || null;

// ------------------------------------------------------------ salon ya creado
function mostrarSalonCreado(r) {
    document.getElementById('modal-salon-creado')?.remove();
    const mensaje = mensajeBienvenidaAlta({
        nombre: r.nombre, slug: r.slug, password: r.password, telefono: r.telefono, email: r.email,
    });
    const numero = normalizarTelefonoWhatsApp(r.telefono, r.codigo_pais);

    const modal = document.createElement('div');
    modal.id = 'modal-salon-creado';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h3 class="text-lg font-semibold text-gray-900">Salón creado</h3>
            <p class="text-sm text-gray-700 mt-1 break-words"><strong>${escapeHtml(r.nombre)}</strong> · usuario <span class="font-mono">${escapeHtml(r.slug)}</span></p>
            <p class="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2 mt-3">La contraseña solo se ve ahora, dentro del mensaje. Si la pierdes, cámbiala desde el menú del salón → Cambiar contraseña.</p>
            <label for="nc-mensaje" class="block text-sm font-medium text-gray-800 mt-3 mb-1">Mensaje de bienvenida (puedes cambiarlo)</label>
            <textarea id="nc-mensaje" rows="9" class="w-full rounded-md border border-gray-300 px-3 py-2 text-base md:text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"></textarea>
            <p id="nc-copiado" class="hidden mt-1 text-sm text-green-800" role="status">Copiado.</p>
            <div class="flex flex-wrap gap-2 mt-4">
                <button type="button" id="nc-copiar" class="${BTN_SEC} flex-1">Copiar mensaje</button>
                <button type="button" id="nc-whatsapp" class="${BTN_PRI} flex-1" ${numero ? '' : 'disabled'}>Abrir WhatsApp</button>
            </div>
            <button type="button" id="nc-listo" class="${BTN_TEXTO} w-full mt-2">Listo</button>
        </div>`;
    document.body.appendChild(modal);
    const texto = modal.querySelector('#nc-mensaje');
    texto.value = mensaje; // por value, no como HTML: el nombre es texto de otra persona
    prepararModal(modal, 'Salón creado');
    // prepararModal enfoca el primer campo: aqui seria el texto, que en el movil
    // abre el teclado y deja el mensaje desplazado al final.
    texto.scrollTop = 0;
    modal.querySelector('#nc-copiar').focus();

    modal.querySelector('#nc-copiar').addEventListener('click', async () => {
        let ok = false;
        try { ok = await copiarAlPortapapeles(texto.value); } catch (e) { /* permiso denegado: se deja el texto seleccionado */ }
        if (ok) modal.querySelector('#nc-copiado').classList.remove('hidden');
        else { texto.focus(); texto.select(); }
    });
    modal.querySelector('#nc-whatsapp').addEventListener('click', () => {
        // window.open dentro del clic: si no, el navegador lo bloquea.
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto.value)}`, '_blank', 'noopener');
    });
    modal.querySelector('#nc-listo').addEventListener('click', () => modal.remove());
}
