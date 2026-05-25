// super-admin.js
// ==================== CONFIGURACIÓN ====================
const PRECIO_MENSUAL = 1000;
const DIAS_POR_DEFECTO = 15;
const WHATSAPP_MENSAJE = "Hola, escribimos desde el soporte de Rservas.Roma para saber en qué podemos ayudarle";
const NTFY_TOPIC_GLOBAL = "rservas-vencimientos";
const ADMIN_EMAIL = "rservasroma@gmail.com";
const CLIENTES_ROOT_LOCAL = "C:\\Users\\RODO\\Documents\\ClientesRservas";
const AUTOMATION_DIR_LOCAL = "C:\\Users\\RODO\\Documents\\New project";
const NEGOCIOS_RECTIFICADOS = {
    "742405d7-292e-424a-bd63-f6e6b09fd7d5": {
        carpeta_local: "ketycasalon",
        slug_local: "ketycasalon",
        ntfy_topic: "ketycas-salon",
        sitio_web: "https://tusalon.github.io/ketycasalon/"
    }
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
let ordenActual = "reservas"; // 'reservas', 'semana' o 'fecha'
let reservasDiarias = 0;
let reservasDiariasData = [];
let reservasSemanaData = [];
let ultimaCitaPorNegocio = {};
let pendientesLocal = JSON.parse(localStorage.getItem('pendientes_admin')) || [];
let eliminadosLocal = JSON.parse(localStorage.getItem('eliminados_admin')) || [];
let ultimaVezEscrito = JSON.parse(localStorage.getItem('ultima_vez_escrito')) || {};

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

// ==================== CARGAR NEGOCIOS ====================
async function cargarNegocios() {
    try {
        console.log('🔄 Cargando negocios...');
        
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
        
        const idsNegocios = unique.map(n => n.id).filter(Boolean);
        if (idsNegocios.length > 0) {
            const { data: datosUrl, error: errorUrl } = await window.supabase
                .from('negocios')
                .select('id,sitio_web,ntfy_topic')
                .in('id', idsNegocios);

            if (errorUrl) {
                console.warn('No se pudieron cargar las URLs de los negocios:', errorUrl);
            } else if (datosUrl) {
                const extrasPorId = Object.fromEntries(datosUrl.map(n => [n.id, n]));
                unique = unique.map(n => ({
                    ...n,
                    sitio_web: extrasPorId[n.id]?.sitio_web || n.sitio_web || '',
                    ntfy_topic: extrasPorId[n.id]?.ntfy_topic || n.ntfy_topic || ''
                }));
            }
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

async function obtenerActividadReservas() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const hace7 = new Date(hoy);
        hace7.setDate(hace7.getDate() - 6);
        const fechaInicioSemana = hace7.toISOString().split('T')[0];
        const fechaHoy = hoy.toISOString().split('T')[0];

        const { data: semana, error: errorSemana } = await window.supabase
            .from('reservas')
            .select('negocio_id, fecha, hora_inicio, estado')
            .gte('fecha', fechaInicioSemana)
            .lte('fecha', fechaHoy);

        if (errorSemana) {
            console.warn('Error al obtener reservas de la ultima semana:', errorSemana);
        }

        const { data: ultimas, error: errorUltimas } = await window.supabase
            .from('reservas')
            .select('negocio_id, fecha, hora_inicio, estado')
            .lte('fecha', fechaHoy)
            .order('fecha', { ascending: false })
            .order('hora_inicio', { ascending: false })
            .limit(5000);

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
    } catch (error) {
        console.error('Error obteniendo actividad de reservas:', error);
        reservasSemanaData = [];
        ultimaCitaPorNegocio = {};
    }
}

function getReservasSemanaPorNegocio(negocioId) {
    if (!negocioId) return 0;
    return reservasSemanaData.filter(r => r.negocio_id === negocioId).length;
}

function formatearUltimaCita(negocioId) {
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
    const candidatos = obtenerCandidatosCarpetaNegocio(negocio);

    for (const candidata of candidatos) {
        const candidataNormalizada = normalizarParaMatch(candidata);
        if (!candidataNormalizada) continue;

        const coincidencias = CARPETAS_CLIENTES.filter(carpeta => normalizarParaMatch(carpeta) === candidataNormalizada);
        if (coincidencias.length > 0) {
            return elegirMejorCarpeta(candidata, coincidencias);
        }
    }

    return '';
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
        `cd /d "${target}"`,
        'git status',
        'git add .',
        'git commit -m "Actualizar logica de reservas"',
        'git push'
    ].join('\r\n');
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
    const sugerida = obtenerCarpetaSugerida(negocio);
    const carpeta = prompt(
        `Carpeta local del negocio "${negocio.nombre || 'Sin nombre'}":`,
        sugerida
    );

    if (!carpeta) return;

    const comando = crearComandoActualizarNegocio(carpeta);

    try {
        const copiado = await copiarAlPortapapeles(comando);
        if (!copiado) throw new Error('copy-failed');
        alert('Comando copiado. Pegalo en CMD como administrador para actualizar este negocio desde exoticbyyuly.');
    } catch (error) {
        console.error('No se pudo copiar el comando:', error);
        prompt('No se pudo copiar automaticamente. Copia este comando:', comando);
    }
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
    
    if (orden === 'reservas') {
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
    ['reservas', 'semana', 'fecha'].forEach(orden => {
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

async function extenderFechaPago(id, nombreNegocio) {
    const diasExtras = prompt(`📅 Extender pago de ${nombreNegocio}\n\nDías a extender (recomendado: ${DIAS_POR_DEFECTO}):`, DIAS_POR_DEFECTO);
    if (!diasExtras) return;
    
    const diasNum = parseInt(diasExtras);
    if (isNaN(diasNum) || diasNum <= 0) {
        alert('❌ Ingrese un número de días válido');
        return;
    }
    
    const nuevaFecha = calcularFechaMasDias(diasNum);
    const nuevoMonto = prompt(`💰 Monto del pago en CUP:\n\nMonto actual: ${PRECIO_MENSUAL} CUP`, PRECIO_MENSUAL);
    if (!nuevoMonto) return;
    
    const montoNum = parseFloat(nuevoMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
        alert('❌ Monto inválido');
        return;
    }
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ 
                fecha_renovacion: nuevaFecha,
                monto_ultimo_pago: montoNum,
                fecha_ultimo_pago: new Date().toISOString()
            })
            .eq('negocio_id', id);
        
        if (error) throw error;
        alert(`✅ Fecha actualizada: ${nuevaFecha}\n💰 Monto: ${montoNum} CUP`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
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

function enviarWhatsApp(telefono, nombreNegocio, negocioId) {
    if (!telefono || telefono === 'No registrado' || telefono === '') {
        alert(`⚠️ ${nombreNegocio} no tiene número de teléfono registrado`);
        return;
    }
    
    // Registrar la fecha de último contacto
    registrarUltimoContacto(negocioId, 'soporte');
    
    let numeroLimpio = telefono.replace(/\D/g, '');
    if (!numeroLimpio.startsWith('53') && numeroLimpio.length === 8) {
        numeroLimpio = '53' + numeroLimpio;
    }
    
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
    
    let numeroLimpio = telefono.replace(/\D/g, '');
    if (!numeroLimpio.startsWith('53') && numeroLimpio.length === 8) {
        numeroLimpio = '53' + numeroLimpio;
    }
    
    const mensajeCodificado = encodeURIComponent("Hola");
    window.open(`https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`, '_blank');
}

// Nueva función para registrar último contacto
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
    const activos = { length: topicsUnicos.length };
    
    if (topicsUnicos.length === 0) {
        alert('⚠️ No hay negocios activos para notificar');
        return;
    }
    
    const mensaje = prompt(`📢 Notificar a ${activos.length} negocios activos:\n\nEscribe el mensaje que recibirán todos:`, 'Comunicado importante de Rservas');
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
    
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Estado', 'Reservas Mes', 'Profesionales', 'Días Activo', 'Próximo Pago', 'Monto', 'Días para Renovar', 'Reservas Hoy'];
    const rows = resultados.map(n => [
        n.id, 
        n.nombre || '', 
        n.email || '', 
        n.telefono || '',
        n.estado_suscripcion || '', 
        n.reservas_mes || 0, 
        n.profesionales_activas || 0,
        n.dias_activo || 0, 
        n.proximo_pago || '', 
        n.monto_ultimo_pago || PRECIO_MENSUAL,
        n.dias_para_renovar || 0,
        getReservasDiariasPorNegocio(n.id)
    ]);
    
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
    
    // Aplicar ordenamiento
    resultados = ordenarNegocios(resultados, ordenActual);
    
    renderListaNegocios(resultados);
}

function actualizarBotonesFiltro() {
    const estados = ['todos', 'activa', 'suspendida', 'trial', 'pendiente', 'inactiva', 'eliminados'];
    estados.forEach(estado => {
        const btn = document.getElementById(`filtro-${estado}`);
        if (btn) {
            btn.classList.remove('bg-gray-800', 'bg-green-600', 'bg-red-600', 'bg-yellow-600', 'bg-purple-600', 'bg-gray-600', 'bg-pink-600', 'text-white');
            btn.classList.remove('bg-gray-200', 'bg-green-100', 'bg-red-100', 'bg-yellow-100', 'bg-purple-100', 'bg-gray-100', 'bg-pink-100', 'text-gray-700', 'text-green-700', 'text-red-700', 'text-yellow-700', 'text-purple-700');
            
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
                    <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">🔄 Actualizar</button>
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
                    <div class="text-2xl font-bold text-orange-600">${stats.reservasSemana}</div>
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
                <button id="order-semana" onclick="cambiarOrden('semana')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-gray-200 text-gray-700">Ultima semana</button>
                <button id="order-reservas" onclick="cambiarOrden('reservas')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-purple-600 text-white">🏆 Más reservas</button>
                <button id="order-fecha" onclick="cambiarOrden('fecha')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-gray-200 text-gray-700">📅 Más recientes</button>
            </div>
            
            <div class="mb-6 flex flex-wrap gap-3 items-center justify-between">
                <div class="flex gap-2 flex-wrap">
                    <button onclick="notificarATodos()" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm transition">📢 Notificar a TODOS</button>
                    <button onclick="notificarTurnosManana()" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm transition font-bold">🔔 Turnos Mañana</button>
                </div>
                <span class="text-xs text-gray-500">💰 ${PRECIO_MENSUAL} CUP/mes | ⏱️ +${DIAS_POR_DEFECTO} días</span>
            </div>
            
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
        const carpetaCliente = buscarCarpetaCliente(n);
        
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
                        <p class="text-sm ${carpetaCliente ? 'text-emerald-700' : 'text-amber-700'}">Carpeta: ${carpetaCliente ? escapeHtml(carpetaCliente) : 'sin match automatico'}</p>
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

                <div class="mt-3 flex flex-wrap gap-2">
                    <button onclick="window.togglePendiente('${n.id}')" class="${esPendiente ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">
                        ${esPendiente ? '✔️ Quitar Pendiente' : '👀 Marcar Pendiente'}
                    </button>
                    ${n.estado_suscripcion === 'trial' ? `<button onclick="window.activarDesdeTrial('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">✅ Activar</button>` : ''}
                    ${n.estado_suscripcion === 'suspendida' ? `<button onclick="window.reactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">▶️ Reactivar</button>` : ''}
                    ${n.estado_suscripcion === 'activa' ? `<button onclick="window.suspenderNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">⏸️ Suspender</button>` : ''}
                    
                    <button onclick="window.extenderFechaPago('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">📅 Extender</button>

                    <button onclick="window.abrirModalPagadoHasta('${n.id}', '${n.nombre.replace(/'/g, "\\'")}', '${n.proximo_pago || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Pagado hasta</button>

                    <button onclick="window.prepararActualizacionNegocio(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Actualizar app</button>
                    
                    <div class="flex flex-col gap-1">
                        <button onclick="window.enviarWhatsApp('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}', '${n.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">💬 Soporte</button>
                        ${ultimoSoporte ? `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${ultimoSoporte}</span>` : ''}
                    </div>
                    
                    <div class="flex flex-col gap-1">
                        <button onclick="window.enviarWhatsAppSimple('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}', '${n.id}')" class="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">💚 WhatsApp Hola</button>
                        ${ultimoHola ? `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${ultimoHola}</span>` : ''}
                    </div>
                    
                    <button onclick="window.notificarNegocio(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">🔔 Notificar</button>
                    
                    <button onclick="window.notificarVencimiento(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">⚠️ Avisar Vencimiento</button>
                    
                    <button onclick="window.inactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">🗑️ Baja</button>
                    
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

async function notificarTurnosManana() {
    // 1. Obtener todos los activos/trial
    const elegibles = negociosData.filter(n => n.estado_suscripcion === 'activa' || n.estado_suscripcion === 'trial');
    
    if (elegibles.length === 0) {
        alert('⚠️ No hay negocios activos o en prueba.');
        return;
    }

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    
    const year = manana.getFullYear();
    const month = String(manana.getMonth() + 1).padStart(2, '0');
    const day = String(manana.getDate()).padStart(2, '0');
    const mananaSQL = `${year}-${month}-${day}`;
    
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const diaSemana = dias[manana.getDay()];
    const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    const fechaLegible = `${diaSemanaCapitalizado} ${manana.getDate()} de ${meses[manana.getMonth()]} de ${year}`;

    try {
        // 2. Traer SOLO los turnos de mañana que estén "Reservados"
        const { data: turnos, error } = await window.supabase
            .from('reservas')
            .select('negocio_id, cliente_nombre, cliente_whatsapp, servicio, profesional_nombre, hora_inicio')
            .eq('fecha', mananaSQL)
            .eq('estado', 'Reservado'); 

        if (error) throw error;

        if (!turnos || turnos.length === 0) {
            alert('No hay NINGÚN turno registrado para el día de mañana en todo el sistema.');
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
            alert('Ninguno de los negocios activos tiene turnos para mañana.');
            return;
        }

        if (!confirm(`🔔 ¿Notificar turnos a los ${negociosConTurnos.length} negocios que SÍ tienen reservas mañana?\n\n(Se han descartado los que tienen la agenda vacía para ahorrar tiempo)`)) return;

        const btnNotificar = document.querySelector('button[onclick="notificarTurnosManana()"]');
        const textoOriginalBtn = btnNotificar ? btnNotificar.innerHTML : '🔔 Turnos Mañana';
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

            const tituloMensaje = `${neg.nombre}: ${turnosNegocio.length} turnos para mañana`;
            
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
        const btnNotificar = document.querySelector('button[onclick="notificarTurnosManana()"]');
        if (btnNotificar) btnNotificar.innerHTML = '🔔 Turnos Mañana';
        alert('❌ Error general: ' + error.message);
    }
}

// Exponer funciones globales
window.buscarNegocio = buscarNegocio;
window.limpiarBusqueda = limpiarBusqueda;
window.filtrarPorEstado = filtrarPorEstado;
window.activarDesdeTrial = activarDesdeTrial;
window.suspenderNegocio = suspenderNegocio;
window.reactivarNegocio = reactivarNegocio;
window.inactivarNegocio = inactivarNegocio;
window.extenderFechaPago = extenderFechaPago;
window.enviarWhatsApp = enviarWhatsApp;
window.enviarWhatsAppSimple = enviarWhatsAppSimple;  
window.notificarNegocio = notificarNegocio;
window.notificarVencimiento = notificarVencimiento;  
window.prepararActualizacionNegocio = prepararActualizacionNegocio;
window.notificarATodos = notificarATodos;
window.abrirModalPagadoHasta = abrirModalPagadoHasta;
window.guardarPagadoHasta = guardarPagadoHasta;
window.exportarCSV = exportarCSV;
window.logout = logout;
window.cambiarOrden = cambiarOrden;
window.togglePendiente = togglePendiente;
window.toggleEliminado = toggleEliminado;
window.notificarTurnosManana = notificarTurnosManana;

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
    
    // Obtener reservas diarias
    reservasDiarias = await obtenerReservasDiarias();
    await obtenerActividadReservas();
    
    // Cargar negocios
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
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
