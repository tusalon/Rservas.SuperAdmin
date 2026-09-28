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
const NEGOCIOS_RECTIFICADOS = {
    "742405d7-292e-424a-bd63-f6e6b09fd7d5": {
        carpeta_local: "ketycasalon",
        slug_local: "ketycasalon",
        ntfy_topic: "ketycas-salon",
        sitio_web: "https://tusalon.github.io/ketycasalon/"
    }
};

let filtroActual = "todos";
let filtroBusqueda = "";
let textoBuscador = ""; // lo escrito tal cual, para volver a ponerlo en el buscador
let negociosData = [];
// Estado de configuracion por salon (para "Salones que necesitan ayuda")
let negociosConServicios = new Set();
let negociosConHorarios = new Set();
let serviciosSinProfesionalPorNegocio = {};
let ordenActual = "reservas"; // 'reservas', 'semana' o 'fecha'
let reservasDiarias = null; // null = aun cargando: se muestra "—", no un 0 falso
let datosActualizadosEn = null; // hora en que llegaron los datos, no la del pintado
let reservasDiariasData = [];
let reportesTiendaData = [];
let tiendasPorAprobarData = [];
let ticketsSoporteData = [];
let reservasSemanaData = [];
let actividadReservasCargada = false;
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

// Pide columnas sueltas de negocios y, si alguna no existe todavia en esta
// base, la deja fuera y vuelve a intentar.
//
// POR QUE: la consulta pedia "archivado", que solo existe si se corrio
// sql-archivar-negocios.sql. Donde no se corrio, Postgres rechaza la consulta
// ENTERA (42703) y el panel se quedaba sin NINGUN extra: es_tienda_externa
// llegaba siempre en falso — o sea que las tiendas de RomaHub se mezclaban con
// los salones — y romahub_estado siempre como "aprobada". Fallaba en silencio,
// solo con un warning en la consola.
async function traerExtrasNegocios(columnas) {
    let pedidas = [...columnas];

    for (let intento = 0; intento < columnas.length; intento++) {
        const { data, error } = await window.supabase
            .from('negocios')
            .select(pedidas.join(','));

        if (!error) return { data, faltantes: columnas.filter(c => !pedidas.includes(c)) };

        // 42703 = columna inexistente. El mensaje la nombra: se quita y se reintenta.
        const nombre = (error.message || '').match(/column [^.]*\.?([a-z0-9_]+) does not exist/i)?.[1];
        if (error.code !== '42703' || !nombre || !pedidas.includes(nombre)) {
            return { data: null, error, faltantes: [] };
        }
        pedidas = pedidas.filter(c => c !== nombre);
        if (pedidas.length <= 1) return { data: null, error, faltantes: [] };
    }

    return { data: null, error: new Error('Demasiadas columnas inexistentes'), faltantes: [] };
}

// ==================== CARGAR NEGOCIOS ====================
async function cargarNegocios() {
    try {
        console.log('🔄 Cargando negocios...');
        
        // "configurado" no viene en vista_negocios_admin y es lo que dice si la
        // duena termino el asistente inicial: se trae aqui para mostrarlo en
        // cada tarjeta.
        const extrasPromise = traerExtrasNegocios([
            'id', 'sitio_web', 'ntfy_topic', 'es_tienda_externa',
            'archivado', 'romahub_estado', 'romahub_nota_rechazo', 'configurado'
        ]);

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
        
        const { data: datosUrl, error: errorUrl, faltantes } = await extrasPromise;
        if (errorUrl) {
            console.warn('No se pudieron cargar las URLs de los negocios:', errorUrl);
        } else if (datosUrl) {
            if (faltantes && faltantes.length) {
                console.warn(
                    `Estas columnas no existen en negocios y se ignoraron: ${faltantes.join(', ')}. ` +
                    'Si falta "archivado", corre sql-archivar-negocios.sql para poder archivar salones.'
                );
            }
            const extrasPorId = Object.fromEntries(datosUrl.map(n => [n.id, n]));
            unique = unique.map(n => ({
                ...n,
                sitio_web: extrasPorId[n.id]?.sitio_web || n.sitio_web || '',
                ntfy_topic: extrasPorId[n.id]?.ntfy_topic || n.ntfy_topic || '',
                es_tienda_externa: extrasPorId[n.id]?.es_tienda_externa === true,
                archivado: extrasPorId[n.id]?.archivado === true,
                romahub_estado: extrasPorId[n.id]?.romahub_estado || 'aprobada',
                romahub_nota_rechazo: extrasPorId[n.id]?.romahub_nota_rechazo || '',
                configurado: extrasPorId[n.id]?.configurado === true
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
        datosActualizadosEn = new Date();
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
        actividadReservasCargada = false;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const hace7 = new Date(hoy);
        hace7.setDate(hace7.getDate() - 6);
        const fechaInicioSemana = hace7.toISOString().split('T')[0];
        const fechaHoy = hoy.toISOString().split('T')[0];

        // Por paginas: una sola consulta se cortaba en 1000 filas sin avisar.
        // Sin .in(negocio_id, ...): con ~380 ids la URL pasaba de 14 KB y el
        // filtro no quitaba nada (la semana de todos los negocios es lo que se
        // quiere). La "ultima cita" ya no sale de aqui: la da la ficha
        // comercial, que lee todas las citas y no cuenta las canceladas.
        const { data: semana } = await traerTodo(
            'reservas',
            'id, negocio_id, fecha',
            q => q.gte('fecha', fechaInicioSemana).lte('fecha', fechaHoy).order('id')
        );
        reservasSemanaData = semana || [];
        actividadReservasCargada = true;
    } catch (error) {
        console.error('Error obteniendo actividad de reservas:', error);
        reservasSemanaData = [];
        actividadReservasCargada = true;
    }
}

function getReservasSemanaPorNegocio(negocioId) {
    if (!negocioId) return 0;
    return reservasSemanaData.filter(r => r.negocio_id === negocioId).length;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Un valor de la base como argumento de onclick="fn(...)". JSON lo deja como
// string JS valido y escapeHtml lo protege dentro del atributo: un nombre con
// ' " < & ya no puede romper el boton ni ejecutar codigo en este panel.
// Antes se escapaba solo la comilla simple, y dejaba pasar " y &#39;.
function jsArg(value) {
    return escapeHtml(JSON.stringify(value ?? ''));
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

function aplicarRectificacionNegocio(negocio) {
    const rectificacion = NEGOCIOS_RECTIFICADOS[negocio?.id];
    return rectificacion ? { ...negocio, ...rectificacion } : negocio;
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
    // El mismo calculo que "Por cobrar esta semana" en Cobros, para que los
    // dos numeros coincidan.
    const porVencer = calcularCobros(negocios).porCobrar.length;
    
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
            const ultimaA = window.obtenerAuditoriaComercial?.(a.id)?.lastPastAppointment || '';
            const ultimaB = window.obtenerAuditoriaComercial?.(b.id)?.lastPastAppointment || '';
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

// El embudo comercial ocupaba toda la parte de arriba del panel, y mientras se
// calculaba dejaba un "Calculando embudo…" que empujaba la lista de negocios
// fuera de la pantalla — en el movil habia que bajar bastante para ver el
// primer salon. Ahora vive detras de un boton y arranca cerrado: la lista queda
// arriba y el embudo se abre cuando de verdad se va a usar.
// La eleccion se recuerda, para quien prefiera tenerlo siempre abierto.
let embudoAbierto = (() => {
    try { return localStorage.getItem('embudoAbierto') === 'true'; } catch (e) { return false; }
})();

function renderEmbudoPlegable() {
    const filtroComercialActivo = window.hayFiltroComercialActivo
        ? window.hayFiltroComercialActivo()
        : false;

    // Si el embudo esta cerrado pero uno de sus filtros sigue aplicado, la lista
    // se ve recortada sin explicacion y sin forma de volver atras: el boton de
    // "Ver todos" vive dentro del panel. Por eso el aviso sale igual.
    const avisoFiltro = (!embudoAbierto && filtroComercialActivo)
        ? `<span class="text-xs bg-fuchsia-100 text-fuchsia-800 px-3 py-1.5 rounded-full">
               Filtro del embudo activo
               <button onclick="limpiarFiltroComercial()" class="underline ml-1 font-semibold">Ver todos</button>
           </span>`
        : '';

    return `
        <div class="mb-4 flex flex-wrap items-center gap-2">
            <button onclick="alternarEmbudo()"
                class="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-fuchsia-700 to-purple-700 hover:opacity-90 transition">
                ${embudoAbierto ? '▲ Ocultar embudo' : '🎯 Ver embudo comercial'}
            </button>
            ${avisoFiltro}
        </div>
        ${embudoAbierto && window.renderEmbudoComercial ? window.renderEmbudoComercial() : ''}`;
}

window.alternarEmbudo = function() {
    embudoAbierto = !embudoAbierto;
    try { localStorage.setItem('embudoAbierto', String(embudoAbierto)); } catch (e) {}
    renderHeader();
};

// Dice de un vistazo si la duena termino el asistente inicial. Es el mismo
// campo (negocios.configurado) que la app mira para decidir si le muestra el
// asistente al entrar: si esta en false, la salonera sigue viendo el wizard y
// todavia no tiene su salon armado.
//
// OJO: en las tiendas externas de RomaHub ese mismo campo se usa como "oculta
// del directorio" (ver ocultarTiendaExterna), asi que ahi no significa wizard y
// no se muestra la etiqueta.
function badgeWizard(negocio) {
    if (negocio.es_tienda_externa === true) return '';
    return negocio.configurado === true
        ? '<span class="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium" title="Terminó el asistente de configuración inicial">✅ Wizard completo</span>'
        : '<span class="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 font-medium" title="Todavía ve el asistente de configuración al entrar">⏳ Wizard sin terminar</span>';
}

// reiniciar_negocio() devuelve los conteos con el nombre crudo de cada tabla.
// Este mapa los convierte en el mismo texto que el panel mostraba antes, para
// que el resumen del reinicio se siga leyendo igual.
const ETIQUETAS_TABLAS = Object.fromEntries(
    [
        ['lista_espera', 'Lista de espera'],
        ['push_subscriptions', 'Suscripciones push'],
        ['clientes_bloqueados', 'Clientes bloqueados'],
        ['reservas', 'Reservas'],
        ['clientes_autorizados', 'Clientes autorizados'],
        ['horarios_profesionales', 'Horarios profesionales'],
        ['profesionales', 'Profesionales'],
        ['servicios', 'Servicios'],
        ['categorias_servicios', 'Categorias de servicios'],
        ['dias_cerrados', 'Dias cerrados'],
        ['configuracion', 'Configuracion'],
        ['suscripciones', 'Suscripciones'],
        ['roma_finanzas_ingresos', 'RomaFinanzas ingresos'],
        ['roma_finanzas_gastos', 'RomaFinanzas gastos'],
        ['roma_finanzas_materials', 'RomaFinanzas materiales'],
        ['roma_finanzas_services', 'RomaFinanzas servicios'],
        ['roma_finanzas_fichas_costo', 'RomaFinanzas fichas de costo'],
        ['roma_finanzas_config', 'RomaFinanzas configuracion'],
    ]
);


function esErrorTablaOColumnaInexistente(error) {
    const code = error?.code;
    const message = String(error?.message || '').toLowerCase();
    return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)
        || message.includes('could not find')
        || message.includes('does not exist')
        || message.includes('schema cache');
}

// El borrado tabla por tabla desde el navegador vivia aqui. Lo hace ahora
// reiniciar_negocio() dentro de la base (sql-reiniciar-negocio.sql), que es la
// unica forma de tocar las tablas de RomaFinanzas sin abrirlas al publico.

// Archivar es lo contrario de "Borrar Supabase": no toca ni una fila de datos,
// solo saca el negocio de la lista. Para las duenas que se quedaron a medias y
// pueden volver, que es casi todo el atraso (ver sql-archivar-negocios.sql).
async function alternarArchivadoNegocio(id, nombreNegocio, estaArchivado) {
    const accion = estaArchivado ? 'restaurar' : 'archivar';
    if (!confirm(estaArchivado
        ? `↩️ ¿Restaurar "${nombreNegocio}"?\n\nVolverá a aparecer en la lista.`
        : `📦 ¿Archivar "${nombreNegocio}"?\n\nDesaparece de la lista pero NO se borra nada.\nPuedes restaurarlo cuando quieras desde el filtro "Archivados".`)) return;

    const { error } = await window.supabase
        .from('negocios')
        .update({ archivado: !estaArchivado, archivado_at: estaArchivado ? null : new Date().toISOString() })
        .eq('id', id);

    if (error) {
        const falta = esErrorTablaOColumnaInexistente(error);
        alert(falta
            ? '❌ Falta la columna "archivado" en negocios.\n\nEjecuta sql-archivar-negocios.sql en el SQL Editor de Supabase.'
            : `❌ No se pudo ${accion}: ${error.message}`);
        return;
    }

    const negocio = negociosData.find(n => String(n.id) === String(id));
    if (negocio) negocio.archivado = !estaArchivado;
    renderHeader();
    actualizarListaNegocios();
    actualizarBotonesFiltro();
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
        // Misma funcion que el reinicio, pero pidiendole que borre tambien la
        // ficha del negocio. Antes esto se hacia tabla por tabla y las de
        // RomaFinanzas siempre daban "permission denied": el borrado se
        // abortaba a mitad de camino y el salon quedaba vaciado pero presente.
        // Dentro de la funcion todo ocurre de una sola vez y la ficha se
        // elimina al final, cuando ya no queda nada que quede huerfano.
        const { data: conteos, error } = await window.supabase
            .rpc('reiniciar_negocio', { p_negocio_id: id, p_borrar_negocio: true });

        if (error) {
            const faltaLaFuncion = error.code === 'PGRST202'
                || /could not find the function|does not exist/i.test(error.message || '');
            alert(
                faltaLaFuncion
                    ? 'No se completo el borrado.\n\n' +
                      'Falta crear la funcion en Supabase: ejecuta una vez el archivo ' +
                      'sql-reiniciar-negocio.sql en el SQL Editor.'
                    : 'No se completo el borrado.\n\n' + error.message
            );
            return;
        }

        const resultados = Object.entries(conteos || {})
            .filter(([, valor]) => typeof valor === 'number' && valor > 0)
            .map(([tabla, valor]) => ({
                label: ETIQUETAS_TABLAS[tabla] || tabla,
                count: valor,
                status: 'ok'
            }));

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
        // El borrado ocurre dentro de la base, en reiniciar_negocio() (ver
        // sql-reiniciar-negocio.sql). Antes se hacia tabla por tabla desde
        // aqui y las de RomaFinanzas fallaban siempre con "permission denied":
        // guardan la contabilidad de cada salon y estan cerradas a proposito.
        // Abrirlas para que el boton funcionara habria dejado esa contabilidad
        // al alcance de cualquiera con la clave publica; la funcion, en cambio,
        // solo sabe hacer esta operacion y solo la pueden llamar las cuentas
        // que entran al SuperAdmin.
        const { data: conteos, error } = await window.supabase
            .rpc('reiniciar_negocio', { p_negocio_id: id });

        if (error) {
            const faltaLaFuncion = error.code === 'PGRST202'
                || /could not find the function|does not exist/i.test(error.message || '');
            alert(
                faltaLaFuncion
                    ? 'No se completo el reinicio.\n\n' +
                      'Falta crear la funcion en Supabase: ejecuta una vez el archivo ' +
                      'sql-reiniciar-negocio.sql en el SQL Editor.'
                    : 'No se completo el reinicio.\n\n' + error.message
            );
            return;
        }

        const resumen = Object.entries(conteos || {})
            .filter(([, valor]) => typeof valor === 'number' && valor > 0)
            .map(([tabla, valor]) => `${ETIQUETAS_TABLAS[tabla] || tabla}: ${valor}`)
            .join('\n') || 'No habia registros relacionados.';

        alert(`Negocio reiniciado.\n\nAl volver a entrar vera el asistente de configuracion inicial.\n\n${resumen}`);
        location.reload();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// La contrasena del salon se guarda como hash bcrypt en negocios.password_hash
// y admin-login.html la comprueba con bcrypt.compareSync. Los hashes que ya
// existen son $2a$12$, asi que hay que generar con el mismo coste 12: si se
// baja, el salon queda con una contrasena mas debil que el resto sin que se
// note en ningun sitio.
//
// Los hashes nuevos salen con prefijo $2b$ en vez de $2a$ (es la variante
// moderna de bcrypt); conviven sin problema porque compareSync acepta las dos.
// Verificado en tools/test-cambiar-password.js.
const BCRYPT_COSTO = 12;

function getBcrypt() {
    if (typeof bcrypt !== 'undefined') return bcrypt;
    // La build UMD antigua se cuelga de dcodeIO, igual que en admin-login.html.
    if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) return dcodeIO.bcrypt;
    return null;
}

function abrirModalCambiarPassword(id, nombreNegocio) {
    if (!getBcrypt()) {
        alert('No se pudo cargar el cifrado de contrasenas. Recarga la pagina e intenta de nuevo.');
        return;
    }

    const modalExistente = document.getElementById('modal-cambiar-password');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-cambiar-password';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">Cambiar contraseña</h3>
                    <p class="text-sm text-gray-500">${escapeHtml(nombreNegocio)}</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-cambiar-password')?.remove()" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            <label class="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input id="password-nueva" type="password" autocomplete="new-password" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">

            <label class="block text-sm font-medium text-gray-700 mt-4 mb-1">Repetir contraseña</label>
            <input id="password-repetir" type="password" autocomplete="new-password" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">

            <label class="flex items-center gap-2 mt-3 text-sm text-gray-600">
                <input type="checkbox" id="password-ver" class="rounded"> Ver lo que escribo
            </label>

            <p class="text-xs text-gray-500 mt-3">Se guarda cifrada. Anotala antes de cerrar: despues no hay forma de volver a verla, solo de cambiarla otra vez.</p>

            <div class="flex gap-2 mt-5">
                <button type="button" onclick="document.getElementById('modal-cambiar-password')?.remove()" class="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">Cancelar</button>
                <button type="button" id="password-guardar" onclick="window.guardarPasswordNegocio(${jsArg(id)})" class="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700">Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('password-ver').addEventListener('change', (e) => {
        const tipo = e.target.checked ? 'text' : 'password';
        document.getElementById('password-nueva').type = tipo;
        document.getElementById('password-repetir').type = tipo;
    });
    document.getElementById('password-nueva').focus();
}

async function guardarPasswordNegocio(id) {
    const nueva = document.getElementById('password-nueva')?.value || '';
    const repetir = document.getElementById('password-repetir')?.value || '';
    const boton = document.getElementById('password-guardar');

    if (nueva.length < 6) {
        alert('La contrasena debe tener al menos 6 caracteres.');
        return;
    }
    if (nueva !== repetir) {
        alert('Las dos contrasenas no coinciden.');
        return;
    }
    if (!confirm('Cambiar la contrasena de este negocio?\n\nLa anterior deja de servir en cuanto se guarde.')) return;

    const cifrador = getBcrypt();
    if (!cifrador) {
        alert('No se pudo cargar el cifrado de contrasenas. Recarga la pagina e intenta de nuevo.');
        return;
    }

    try {
        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Guardando...';
        }
        // bcrypt con coste 12 bloquea el hilo un par de segundos: hay que dejar
        // que el navegador pinte "Guardando..." antes, o parece que se colgo.
        await new Promise(resolve => setTimeout(resolve, 50));

        const hash = cifrador.hashSync(nueva, BCRYPT_COSTO);

        const { error } = await window.supabase
            .from('negocios')
            .update({ password_hash: hash })
            .eq('id', id);

        if (error) throw error;

        document.getElementById('modal-cambiar-password')?.remove();
        alert('Contrasena actualizada. Enviasela al salon para que pueda entrar.');
    } catch (error) {
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Guardar';
        }
        alert('Error cambiando la contrasena: ' + error.message);
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
                <button type="button" onclick="window.guardarPagadoHasta(${jsArg(id)})" class="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700">Guardar</button>
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

    // Mensaje para UN salon: al canal global lo verian todos los demas.
    const tema = (negocio.ntfy_topic || '').trim();
    if (!tema) {
        alert(`⚠️ ${negocio.nombre} no tiene canal de notificaciones propio. Escríbele por WhatsApp.`);
        return;
    }

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

    // Antes decia siempre "mañana". Ahora, la fecha real de su pago; una
    // fecha anterior al corte es de prueba vieja y no se menciona.
    const fecha = fechaPagoDe(negocio);
    const dias = fecha && !esFechaHeredada(fecha) ? diasHastaPago(fecha) : null;
    const cuando = dias == null ? 'pronto vence tu suscripción mensual'
        : dias < 0 ? `tu suscripción mensual venció el ${_fechaCorta(fecha)}`
        : dias === 0 ? 'hoy vence tu suscripción mensual'
        : dias === 1 ? 'mañana vence tu suscripción mensual'
        : `el ${_fechaCorta(fecha)} vence tu suscripción mensual`;
    const mensaje = `Hola, ${cuando}. Puedes hacer el pago a esta cuenta: ${numeroCuenta}`;
    // Mensaje para UN salon: al canal global lo verian todos los demas.
    const tema = (negocio.ntfy_topic || '').trim();
    if (!tema) {
        alert(`⚠️ ${negocio.nombre} no tiene canal de notificaciones propio. Escríbele por WhatsApp.`);
        return;
    }

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

async function notificarATodos(boton) {
    // Solo salones en uso: antes entraban tambien suspendidos, archivados,
    // bajas y tiendas RomaHub.
    const destinatarios = negociosData.filter(n =>
        n.es_tienda_externa !== true
        && n.archivado !== true
        && ['activa', 'trial'].includes(n.estado_suscripcion)
    );
    const topicsUnicos = Array.from(new Map(
        destinatarios.map(n => [(n.ntfy_topic || NTFY_TOPIC_GLOBAL).trim(), n])
    ).entries()).filter(([tema]) => Boolean(tema));

    if (topicsUnicos.length === 0) {
        alert('⚠️ No hay negocios activos para notificar');
        return;
    }

    const mensaje = prompt(`📢 Notificar a ${destinatarios.length} salones activos o en prueba (${topicsUnicos.length} canales):\n\nEscribe el mensaje que recibirán todos:`, 'Comunicado importante de Rservas');
    if (!mensaje) return;

    if (!confirm(`Enviar este mensaje a ${topicsUnicos.length} canales ntfy?\n\n${mensaje}`)) return;

    let enviados = 0;
    let errores = 0;
    const textoBoton = boton ? boton.innerHTML : '';
    if (boton) boton.disabled = true;

    for (const [tema] of topicsUnicos) {
        if (boton) boton.innerHTML = `⏳ Enviando ${enviados + errores + 1}/${topicsUnicos.length}...`;
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
    if (boton) {
        boton.innerHTML = textoBoton;
        boton.disabled = false;
    }
    alert(`✅ Notificaciones enviadas:\n📨 Enviados: ${enviados}\n❌ Errores: ${errores}\n📊 Canales: ${topicsUnicos.length}`);
}

async function exportarCSV() {
    // Exporta exactamente lo que muestra la lista (mismo filtro, busqueda y
    // embudo). Antes no respetaba "archivados" ni "pendientes".
    const resultados = negociosFiltrados();
    
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
    
    // Un nombre que empieza por = + - @ Excel lo ejecuta como formula: se
    // antepone ' para que quede como texto (los nombres los escriben las duenas).
    const celda = cell => {
        const texto = String(cell);
        return `"${(/^[=+\-@]/.test(texto) ? `'${texto}` : texto).replace(/"/g, '""')}"`;
    };
    const csvContent = [headers, ...rows].map(row => row.map(celda).join(',')).join('\n');
    
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
    textoBuscador = termino;
    filtroBusqueda = termino.toLowerCase().trim();
    actualizarListaNegocios();
}

function limpiarBusqueda() {
    const buscador = document.getElementById('buscador');
    if (buscador) buscador.value = '';
    textoBuscador = '';
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
    renderListaNegocios(ordenarNegocios(negociosFiltrados(), ordenActual));
}

// Lo que la lista muestra con el filtro, la busqueda y el embudo actuales.
// Tambien lo usa exportarCSV, para que el archivo cuadre con la pantalla.
function negociosFiltrados() {
    // Las tiendas RomaHub no son negocios de RservasRoma (sin agenda, sin
    // suscripcion): esta lista y sus filtros son solo para RservasRoma. Las
    // tiendas se ven y aprueban en renderTiendasPorAprobar/renderSeccionRomaHub.
    let resultados = negociosData.filter(n => n.es_tienda_externa !== true);

    // Los archivados solo se ven pidiendolos: en cualquier otro filtro estorban.
    // "archivado" no borra nada, solo los saca de en medio (ver
    // sql-archivar-negocios.sql), asi que siempre se pueden devolver.
    resultados = filtroActual === 'archivados'
        ? resultados.filter(n => n.archivado === true)
        : resultados.filter(n => n.archivado !== true);

    // Primero aplicar el filtro de estado
    if (filtroActual === 'pendiente') {
        resultados = resultados.filter(n => pendientesLocal.includes(n.id));
    } else if (filtroActual === 'eliminados') {
        resultados = resultados.filter(n => eliminadosLocal.includes(n.id));
    } else if (filtroActual !== 'todos' && filtroActual !== 'archivados') {
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
    return resultados;
}

function actualizarBotonesFiltro() {
    const estados = ['todos', 'activa', 'suspendida', 'trial', 'pendiente', 'inactiva', 'eliminados', 'archivados'];
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
                else if (estado === 'archivados') btn.classList.add('bg-slate-600', 'text-white');
            } else {
                if (estado === 'todos') btn.classList.add('bg-gray-200', 'text-gray-700');
                else if (estado === 'activa') btn.classList.add('bg-green-100', 'text-green-700');
                else if (estado === 'suspendida') btn.classList.add('bg-red-100', 'text-red-700');
                else if (estado === 'trial') btn.classList.add('bg-yellow-100', 'text-yellow-700');
                else if (estado === 'pendiente') btn.classList.add('bg-purple-100', 'text-purple-700');
                else if (estado === 'inactiva') btn.classList.add('bg-gray-100', 'text-gray-700');
                else if (estado === 'eliminados') btn.classList.add('bg-pink-100', 'text-pink-700');
                else if (estado === 'archivados') btn.classList.add('bg-slate-100', 'text-slate-700');
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
        // Las tiendas RomaHub son gratis, sin suscripcion que cobrar.
        if (n.es_tienda_externa === true) return;

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
                <div class="font-medium text-gray-800 text-sm truncate">${escapeHtml(n.nombre || '(sin nombre)')}</div>
                <div class="text-xs ${color}">${etiqueta} · ${_fechaCorta(item.fecha)}</div>
            </div>
            <div class="flex gap-1.5 shrink-0">
                ${btnWhats}
                <button onclick="window.abrirModalPagadoHasta(${jsArg(n.id)}, ${jsArg(n.nombre)}, ${jsArg(fechaPagoDe(n))})"
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
        // Las tiendas RomaHub no tienen servicios/horarios de reserva por diseno
        // (venden por WhatsApp): no son un salon "roto", tienen su propia
        // moderacion en renderTiendasPorAprobar/renderSeccionRomaHub.
        if (n.es_tienda_externa === true) return;
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

// ==================== APROBACIÓN ROMAHUB (tiendas nuevas antes de publicarse) ====================
// Una tienda externa nace en romahub_estado='borrador' y no se ve en RomaHub.
// La duena la envia a 'en_revision' desde su panel al subir 3+ articulos.
// Aqui se revisan los productos/cursos reales antes de publicar la tienda.
async function cargarTiendasPorAprobar() {
    erroresCarga.delete('tiendas');
    try {
        const { data: tiendas, error } = await window.supabase
            .from('negocios')
            .select('id,nombre,telefono,especialidad,provincia,municipio,logo_url,imagen_fondo_url,mensaje_bienvenida,romahub_enviado_at')
            .eq('es_tienda_externa', true)
            .eq('romahub_estado', 'en_revision')
            .order('romahub_enviado_at', { ascending: true });
        if (error) {
            console.warn('No se pudieron cargar las tiendas por aprobar:', error.message);
            erroresCarga.add('tiendas');
            return [];
        }
        if (!tiendas || !tiendas.length) return [];

        const ids = tiendas.map(t => t.id);
        const [{ data: productos }, { data: cursos }] = await Promise.all([
            window.supabase.from('productos').select('id,negocio_id,nombre,descripcion,precio,moneda,imagen_url,stock,activo').in('negocio_id', ids),
            window.supabase.from('cursos').select('id,negocio_id,nombre,descripcion,precio,moneda,imagen_url,cupos,activo').in('negocio_id', ids)
        ]);

        return tiendas.map(t => ({
            ...t,
            productos: (productos || []).filter(p => p.negocio_id === t.id && p.activo !== false),
            cursos: (cursos || []).filter(c => c.negocio_id === t.id && c.activo !== false)
        }));
    } catch (error) {
        console.warn('Error cargando tiendas por aprobar:', error);
        erroresCarga.add('tiendas');
        return [];
    }
}

async function aprobarTiendaExterna(id, nombre) {
    if (!confirm(`✅ ¿Aprobar y publicar la tienda "${nombre}" en RomaHub?\n\nSe verá en el directorio con insignia de tienda verificada.`)) return;
    try {
        const { error } = await window.supabase.from('negocios').update({
            configurado: true,
            romahub_estado: 'aprobada',
            romahub_revisado_at: new Date().toISOString(),
            romahub_nota_rechazo: null
        }).eq('id', id);
        if (error) throw error;
        alert(`✅ "${nombre}" ya está publicada en RomaHub.`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function rechazarTiendaExterna(id, nombre) {
    const motivo = prompt(`🚫 Motivo del rechazo para "${nombre}" (lo verá la dueña en su panel):`);
    if (!motivo || !motivo.trim()) return;
    try {
        const { error } = await window.supabase.from('negocios').update({
            romahub_estado: 'rechazada',
            romahub_revisado_at: new Date().toISOString(),
            romahub_nota_rechazo: motivo.trim().slice(0, 600)
        }).eq('id', id);
        if (error) throw error;
        alert(`Tienda "${nombre}" rechazada. La dueña verá el motivo en su panel.`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// La contraseña y el codigo de recuperacion de una tienda RomaHub se
// muestran una sola vez al crearla y nunca se guardan legibles: si la
// duena los pierde, esta es la unica forma de devolverle el acceso.
async function restablecerAccesoTienda(id, nombre) {
    if (!confirm(`🔑 ¿Restablecer el acceso de "${nombre}"?\n\nLa contraseña y el código de recuperación actuales dejan de servir. Vas a recibir unos nuevos para dárselos a la dueña.`)) return;
    try {
        const { data: sessionData } = await window.supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) { alert('❌ Tu sesión expiró. Recarga la página e intenta de nuevo.'); return; }

        const response = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-resetear-acceso-tienda`, {
            method: 'POST',
            headers: { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ negocio_id: id })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo restablecer el acceso.');

        mostrarAccesoRestablecido(nombre, data.acceso);
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

function mostrarAccesoRestablecido(nombre, acceso) {
    const modalExistente = document.getElementById('modal-acceso-restablecido');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-acceso-restablecido';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div class="flex items-start justify-between gap-3 mb-1">
                <h3 class="text-lg font-bold text-gray-900">✅ Acceso restablecido</h3>
                <button type="button" onclick="document.getElementById('modal-acceso-restablecido')?.remove()" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <p class="text-sm text-gray-500 mb-4">${escapeHtml(nombre)} — envíaselo por WhatsApp a la dueña. No vuelve a mostrarse.</p>

            <div class="space-y-2">
                <div class="flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3">
                    <div>
                        <p class="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Usuario (WhatsApp)</p>
                        <p class="text-base font-bold text-gray-900">${escapeHtml(acceso.usuario)}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between gap-3 bg-pink-50 rounded-lg p-3">
                    <div>
                        <p class="text-[11px] uppercase tracking-wide text-pink-500 font-bold">Contraseña nueva</p>
                        <p class="text-base font-bold text-gray-900 font-mono">${escapeHtml(acceso.password)}</p>
                    </div>
                    <button type="button" onclick="navigator.clipboard?.writeText(${jsArg(acceso.password)})" class="text-xs font-semibold text-pink-600 hover:text-pink-700 shrink-0">Copiar</button>
                </div>
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p class="text-[11px] uppercase tracking-wide text-amber-700 font-bold">Código de recuperación nuevo</p>
                    <div class="mt-1 flex items-center justify-between gap-3">
                        <code class="text-sm font-bold tracking-wider text-gray-900">${escapeHtml(acceso.codigo_recuperacion)}</code>
                        <button type="button" onclick="navigator.clipboard?.writeText(${jsArg(acceso.codigo_recuperacion)})" class="text-xs font-semibold text-amber-700 hover:text-amber-800 shrink-0">Copiar</button>
                    </div>
                </div>
            </div>

            <button type="button" onclick="document.getElementById('modal-acceso-restablecido')?.remove()" class="mt-5 w-full px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700">Listo</button>
        </div>
    `;
    document.body.appendChild(modal);
}
window.restablecerAccesoTienda = restablecerAccesoTienda;

// Busca un producto/curso dentro de tiendasPorAprobarData por su id, para
// abrir el modal de detalle sin tener que serializar el objeto en el HTML.
function buscarArticuloPorAprobar(tipo, itemId) {
    for (const t of tiendasPorAprobarData) {
        const lista = tipo === 'curso' ? t.cursos : t.productos;
        const item = (lista || []).find(i => String(i.id) === String(itemId));
        if (item) return { ...item, tiendaNombre: t.nombre, tipo };
    }
    return null;
}

function verArticuloPorAprobar(tipo, itemId) {
    const item = buscarArticuloPorAprobar(tipo, itemId);
    if (!item) return;

    const modalExistente = document.getElementById('modal-articulo-tienda');
    if (modalExistente) modalExistente.remove();

    const disponibilidad = item.tipo === 'curso'
        ? (item.cupos === 0 ? '<span class="text-red-600 font-bold">Sin cupos</span>' : item.cupos != null ? `${item.cupos} cupos` : '')
        : (item.stock === 0 ? '<span class="text-red-600 font-bold">Sin stock</span>' : item.stock != null ? `Stock: ${item.stock}` : '');

    const modal = document.createElement('div');
    modal.id = 'modal-articulo-tienda';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div class="relative aspect-square bg-gray-100">
                ${item.imagen_url ? `<img src="${escapeHtml(item.imagen_url)}" alt="${escapeHtml(item.nombre || '')}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-5xl">🛍️</div>'}
                <button type="button" onclick="document.getElementById('modal-articulo-tienda')?.remove()" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-gray-700 text-xl leading-none">&times;</button>
                ${item.tipo === 'curso' ? '<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gray-900 text-white text-[11px] font-bold">Curso</span>' : ''}
            </div>
            <div class="p-4">
                <p class="text-xs text-gray-400">${escapeHtml(item.tiendaNombre || '')}</p>
                <p class="font-bold text-gray-900 text-lg">${escapeHtml(item.nombre || '(sin nombre)')}</p>
                <div class="flex items-center gap-3 mt-1">
                    <p class="font-bold text-pink-700">${Number(item.precio || 0)} ${escapeHtml(item.moneda || 'CUP')}</p>
                    ${disponibilidad ? `<p class="text-sm text-gray-500">${disponibilidad}</p>` : ''}
                </div>
                ${item.descripcion ? `<p class="text-sm text-gray-600 mt-3 leading-relaxed">${escapeHtml(item.descripcion)}</p>` : '<p class="text-sm text-gray-400 mt-3 italic">Sin descripción.</p>'}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
window.verArticuloPorAprobar = verArticuloPorAprobar;

function renderTiendasPorAprobar() {
    if (!tiendasPorAprobarData.length) return '';

    const tarjetaArticulo = (item, tipo) => `
        <button type="button" onclick="verArticuloPorAprobar(${jsArg(tipo)}, ${jsArg(item.id)})" class="text-left group">
            <div class="relative aspect-square rounded-lg bg-gray-100 overflow-hidden border border-gray-200 group-hover:border-purple-400 transition">
                ${item.imagen_url ? `<img src="${escapeHtml(item.imagen_url)}" alt="${escapeHtml(item.nombre || '')}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-2xl">🛍️</div>'}
                ${(tipo === 'curso' ? item.cupos === 0 : item.stock === 0) ? '<span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-bold">Sin stock</span>' : ''}
            </div>
            <p class="mt-1 text-[11px] text-gray-700 truncate">${escapeHtml(item.nombre || '(sin nombre)')}</p>
            <p class="text-[11px] font-bold text-pink-700">${Number(item.precio || 0)} ${escapeHtml(item.moneda || 'CUP')}</p>
        </button>
    `;

    const tarjetas = tiendasPorAprobarData.map(t => {
        const articulos = [...t.productos.map(p => ({ item: p, tipo: 'producto' })), ...t.cursos.map(c => ({ item: c, tipo: 'curso' }))];
        return `
            <details class="border border-gray-200 rounded-xl mb-3 last:mb-0" open>
                <summary class="p-4 cursor-pointer list-none flex flex-col sm:flex-row sm:items-start gap-3">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                        <div class="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                            ${t.logo_url ? `<img src="${escapeHtml(t.logo_url)}" alt="" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-xl">🏪</div>'}
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="font-bold text-gray-800">${escapeHtml(t.nombre || '(sin nombre)')} <span class="text-gray-400 font-normal text-xs">(${articulos.length} art.)</span></p>
                            <p class="text-xs text-gray-500">${escapeHtml(t.especialidad || 'Belleza')} · ${escapeHtml(t.provincia || '')}${t.municipio ? ' · ' + escapeHtml(t.municipio) : ''} · ${escapeHtml(t.telefono || 'sin WhatsApp')}</p>
                            ${t.mensaje_bienvenida ? `<p class="text-xs text-gray-500 mt-1 italic">"${escapeHtml(t.mensaje_bienvenida)}"</p>` : ''}
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-1.5 shrink-0">
                        <button onclick="event.stopPropagation(); aprobarTiendaExterna(${jsArg(t.id)}, ${jsArg(t.nombre)})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">✅ Aprobar</button>
                        <button onclick="event.stopPropagation(); rechazarTiendaExterna(${jsArg(t.id)}, ${jsArg(t.nombre)})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Rechazar</button>
                        <button onclick="event.stopPropagation(); restablecerAccesoTienda(${jsArg(t.id)}, ${jsArg(t.nombre)})" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold">🔑 Acceso</button>
                    </div>
                </summary>
                <div class="px-4 pb-4">
                    ${t.imagen_fondo_url ? `<div class="h-28 rounded-lg overflow-hidden mb-3"><img src="${escapeHtml(t.imagen_fondo_url)}" alt="Portada" class="w-full h-full object-cover"></div>` : ''}
                    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        ${articulos.length ? articulos.map(a => tarjetaArticulo(a.item, a.tipo)).join('') : '<p class="col-span-full text-xs text-gray-400">Sin productos/cursos activos (no debería poder enviar a revisión).</p>'}
                    </div>
                </div>
            </details>
        `;
    }).join('');

    return `
        <div class="mb-6 bg-white rounded-xl shadow overflow-hidden border-2 border-amber-300">
            <div class="bg-amber-50 px-4 py-2.5 border-b border-amber-100">
                <span class="font-bold text-amber-800 text-sm">⏳ Tiendas por aprobar (${tiendasPorAprobarData.length})</span>
                <p class="text-xs text-amber-700 mt-0.5">Revisa los productos antes de publicar. Se ven en RomaHub solo tras aprobarlas.</p>
            </div>
            <div class="px-4 py-3">${tarjetas}</div>
        </div>
    `;
}

// ==================== MODERACIÓN ROMAHUB (tiendas externas + reportes) ====================
// Las tiendas externas (es_tienda_externa=true) son vendedores sin cuenta
// rservasroma que se auto-registraron gratis en RomaHub (crear-tienda.html).
// Sin control previo, asi que este panel es la barrera de moderacion:
// ocultarlas (configurado=false) o revisar lo que la gente reporto.
async function cargarReportesTienda() {
    erroresCarga.delete('reportes');
    try {
        const { data, error } = await window.supabase
            .from('reportes_tienda')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.warn('No se pudo cargar reportes_tienda (¿corriste el SQL de F5?):', error.message);
            if (!esErrorTablaOColumnaInexistente(error)) erroresCarga.add('reportes');
            return [];
        }
        return data || [];
    } catch (error) {
        console.warn('Error cargando reportes de tienda:', error);
        erroresCarga.add('reportes');
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
        const romahubEstadoBadges = {
            borrador: '<span class="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">Borrador</span>',
            en_revision: '<span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">⏳ En revisión</span>',
            rechazada: '<span class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Rechazada</span>',
            aprobada: '<span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">✓ Verificada</span>'
        };
        const badgeRomahub = romahubEstadoBadges[n.romahub_estado] || '';
        const btnToggle = oculta
            ? `<button onclick="activarTiendaExterna(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium shrink-0">Reactivar</button>`
            : `<button onclick="ocultarTiendaExterna(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium shrink-0">Ocultar</button>`;
        return `
            <div class="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-medium text-gray-800 text-sm truncate">${escapeHtml(n.nombre || '(sin nombre)')}</span>
                        ${badgeEstado}
                        ${badgeRomahub}
                        ${badgeReportes}
                    </div>
                    <div class="text-xs text-gray-400">${escapeHtml(n.provincia || 'sin provincia')}${n.municipio ? ' · ' + escapeHtml(n.municipio) : ''}</div>
                </div>
                <div class="flex gap-1.5 shrink-0">
                    <button onclick="restablecerAccesoTienda(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-medium">🔑 Acceso</button>
                    ${btnToggle}
                </div>
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
                    ${negocio && negocio.es_tienda_externa ? `<button onclick="ocultarTiendaExterna(${jsArg(negocio.id)}, ${jsArg(negocio.nombre)})" class="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-medium">Ocultar</button>` : ''}
                    <button onclick="resolverReporteTienda(${jsArg(r.id)}, 'descartado')" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded text-xs font-medium">Descartar</button>
                    <button onclick="resolverReporteTienda(${jsArg(r.id)}, 'resuelto')" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-xs font-medium">Resuelto</button>
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

// ==================== SOPORTE (tickets del boton de las apps) ====================
// El boton de soporte de las apps guarda el ticket ANTES de abrir WhatsApp
// (rservasroma/utils/soporte.js). Asi que aqui esta TODO lo que la gente
// intento decir, incluido lo que nunca llego a enviarse por el chat: ese es el
// motivo de que exista esta seccion y no baste con mirar WhatsApp.
//
// La foto NO esta aqui: viaja adjunta en el WhatsApp. "con_foto" avisa de que
// hay que abrir el chat para verla.
async function cargarTicketsSoporte() {
    erroresCarga.delete('soporte');
    try {
        const { data, error } = await window.supabase
            .from('soporte_tickets')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) {
            if (esErrorTablaOColumnaInexistente(error)) {
                console.warn('soporte_tickets todavia no existe: corre rservasroma/sql-soporte-tickets.sql');
            } else {
                console.warn('No se pudieron cargar los tickets de soporte:', error.message);
                erroresCarga.add('soporte');
            }
            return [];
        }
        return data || [];
    } catch (error) {
        console.warn('Error cargando tickets de soporte:', error);
        erroresCarga.add('soporte');
        return [];
    }
}

let soporteAbierto = (() => {
    try { return localStorage.getItem('soporteAbierto') === 'true'; } catch (e) { return false; }
})();

window.alternarSoporte = function() {
    soporteAbierto = !soporteAbierto;
    try { localStorage.setItem('soporteAbierto', String(soporteAbierto)); } catch (e) {}
    renderHeader();
};

function fechaSoporte(iso) {
    if (!iso) return '';
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
    if (minutos < 1) return 'ahora mismo';
    if (minutos < 60) return `hace ${minutos} min`;
    if (minutos < 1440) return `hace ${Math.floor(minutos / 60)} h`;
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function marcarTicketSoporte(id, estado) {
    try {
        const cambios = { estado };
        if (estado !== 'nuevo') cambios.atendido_at = new Date().toISOString();
        const { error } = await window.supabase.from('soporte_tickets').update(cambios).eq('id', id);
        if (error) throw error;
        ticketsSoporteData = ticketsSoporteData.map(t => (t.id === id ? { ...t, ...cambios } : t));
        renderHeader();
    } catch (error) {
        alert('No se pudo actualizar el ticket: ' + error.message);
    }
}

// Responder abre el WhatsApp de quien escribio y, de paso, deja el ticket como
// leido: si no, un ticket ya contestado sigue pidiendo atencion en el panel.
function responderTicketSoporte(id) {
    const ticket = ticketsSoporteData.find(t => String(t.id) === String(id));
    if (!ticket) return;
    if (!ticket.contacto) {
        alert('Este ticket no trae telefono de contacto. Busca el negocio en la lista de abajo y escribele desde su tarjeta.');
        return;
    }
    const numero = normalizarTelefonoWhatsApp(ticket.contacto, codigoPaisDeNegocio(ticket.negocio_id));
    const saludo = `Hola, te escribimos desde el soporte de RservasRoma por tu mensaje: "${String(ticket.mensaje || '').slice(0, 120)}"`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(saludo)}`, '_blank');
    if (ticket.estado === 'nuevo') marcarTicketSoporte(id, 'leido');
}

function tarjetaTicketSoporte(ticket) {
    const esNuevo = ticket.estado === 'nuevo';
    const resuelto = ticket.estado === 'resuelto';
    const etiquetaOrigen = ticket.origen === 'clientas'
        ? '<span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">Clienta</span>'
        : '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">Dueña</span>';

    return `
        <div class="border ${esNuevo ? 'border-rose-300 bg-rose-50/60' : 'border-gray-200 bg-white'} rounded-xl p-3 mb-2 last:mb-0">
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
                ${esNuevo ? '<span class="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">NUEVO</span>' : ''}
                ${resuelto ? '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">Resuelto</span>' : ''}
                ${etiquetaOrigen}
                ${ticket.con_foto ? '<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">📷 Con foto en el chat</span>' : ''}
                <span class="text-[11px] text-gray-500">${escapeHtml(fechaSoporte(ticket.created_at))}</span>
            </div>
            <p class="text-sm font-bold text-gray-800">${escapeHtml(ticket.negocio_nombre || '(sin negocio)')}
                <span class="font-normal text-xs text-gray-500">${escapeHtml(ticket.negocio_slug || '')}</span>
            </p>
            <p class="text-[11px] text-gray-500 mb-1.5">${escapeHtml(ticket.quien || '')}${ticket.contacto ? ' · ' + escapeHtml(ticket.contacto) : ' · sin teléfono'}${ticket.plataforma ? ' · ' + escapeHtml(ticket.plataforma) : ''}</p>
            <p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">${escapeHtml(ticket.mensaje || '')}</p>
            <div class="flex flex-wrap gap-1.5 mt-2.5">
                <button onclick="responderTicketSoporte(${jsArg(ticket.id)})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">💬 Responder</button>
                ${resuelto
                    ? `<button onclick="marcarTicketSoporte(${jsArg(ticket.id)}, 'leido')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold">Reabrir</button>`
                    : `<button onclick="marcarTicketSoporte(${jsArg(ticket.id)}, 'resuelto')" class="bg-gray-800 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold">Resuelto</button>`}
            </div>
        </div>
    `;
}

function renderSeccionSoporte() {
    if (!ticketsSoporteData.length) return '';

    const pendientes = ticketsSoporteData.filter(t => t.estado !== 'resuelto');
    const nuevos = ticketsSoporteData.filter(t => t.estado === 'nuevo');
    // Con pendientes se abre sola: un ticket sin leer no puede depender de que
    // uno se acuerde de pulsar un boton.
    const abierto = soporteAbierto || pendientes.length > 0;
    const listado = abierto
        ? (pendientes.length ? pendientes : ticketsSoporteData.slice(0, 10)).map(tarjetaTicketSoporte).join('')
        : '';

    const cabecera = pendientes.length
        ? `<span class="font-bold text-rose-800 text-sm">🆘 Soporte: ${pendientes.length} sin resolver${nuevos.length ? ` (${nuevos.length} sin leer)` : ''}</span>`
        : '<span class="font-bold text-gray-700 text-sm">🆘 Soporte: todo resuelto</span>';

    return `
        <div class="mb-6 bg-white rounded-xl shadow overflow-hidden border-2 ${pendientes.length ? 'border-rose-300' : 'border-gray-200'}">
            <div class="${pendientes.length ? 'bg-rose-50' : 'bg-gray-50'} px-4 py-2.5 border-b ${pendientes.length ? 'border-rose-100' : 'border-gray-100'} flex flex-wrap items-center justify-between gap-2">
                <div>
                    ${cabecera}
                    <p class="text-xs ${pendientes.length ? 'text-rose-700' : 'text-gray-500'} mt-0.5">Mensajes del botón de soporte de las apps. Quedan aquí aunque el WhatsApp no llegue a enviarse.</p>
                </div>
                ${pendientes.length
                    ? ''
                    : `<button onclick="alternarSoporte()" class="bg-gray-800 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold">${soporteAbierto ? 'Ocultar' : 'Ver últimos'}</button>`}
            </div>
            ${listado ? `<div class="px-4 py-3">${listado}</div>` : ''}
        </div>
    `;
}

function renderHeader() {
    // Las tiendas RomaHub tienen su propio conteo en renderTiendasPorAprobar/
    // renderSeccionRomaHub: aqui solo entran negocios de RservasRoma, para que
    // "Todos" y las estadisticas no se inflen con tiendas gratis sin agenda.
    const negociosRservasRoma = negociosData.filter(n => n.es_tienda_externa !== true);
    const stats = calcularEstadisticas(negociosRservasRoma);
    // Los contadores tienen que cuadrar con lo que enseña cada filtro, y los
    // filtros ya no muestran archivados: si no, "Todos (379)" abriria 306.
    const visibles = negociosRservasRoma.filter(n => n.archivado !== true);
    const totalPorEstado = {
        todos: visibles.length,
        activa: visibles.filter(n => n.estado_suscripcion === 'activa').length,
        suspendida: visibles.filter(n => n.estado_suscripcion === 'suspendida').length,
        trial: visibles.filter(n => n.estado_suscripcion === 'trial').length,
        pendiente: visibles.filter(n => pendientesLocal.includes(n.id)).length,
        inactiva: visibles.filter(n => n.estado_suscripcion === 'inactiva').length,
        eliminados: visibles.filter(n => eliminadosLocal.includes(n.id)).length,
        archivados: negociosRservasRoma.filter(n => n.archivado === true).length
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
                                ${reservasDiarias ?? '—'}
                            </div>
                            <p class="text-purple-100 text-sm mt-1">reservas en total</p>
                        </div>
                        <div class="text-right">
                            <p class="text-purple-100 text-xs">📊 Última actualización</p>
                            <p class="text-white text-sm">${datosActualizadosEn ? datosActualizadosEn.toLocaleTimeString() : '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            ${avisoErrorCarga('soporte')}${renderSeccionSoporte()}
            ${avisoErrorCarga('tiendas')}${renderTiendasPorAprobar()}
            ${avisoErrorCarga('reportes')}${renderSeccionRomaHub()}

            ${renderEmbudoPlegable()}

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
                           value="${escapeHtml(textoBuscador)}"
                           aria-label="Buscar salón por nombre o teléfono"
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
                    <button onclick="notificarATodos(this)" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm transition">📢 Notificar a TODOS</button>
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
                <button id="filtro-archivados" onclick="filtrarPorEstado('archivados')" class="px-3 py-1.5 rounded-lg text-sm bg-slate-100 text-slate-700">📦 Archivados (${totalPorEstado.archivados})</button>
            </div>
        </div>
    `;
    
    // renderHeader se repite al terminar cada carga de fondo. Recrear el
    // buscador sin su valor ni su foco borraba lo que se estaba escribiendo
    // (y la lista seguia filtrada con el campo vacio).
    const buscadorActivo = document.activeElement?.id === 'buscador' ? document.activeElement : null;
    const cursor = buscadorActivo ? [buscadorActivo.selectionStart, buscadorActivo.selectionEnd] : null;
    const panelHeader = document.getElementById('panel-header');
    if (panelHeader) {
        panelHeader.innerHTML = headerHtml;
    }
    if (cursor) {
        const buscador = document.getElementById('buscador');
        buscador?.focus();
        buscador?.setSelectionRange(cursor[0], cursor[1]);
    }
}

// ==================== RENDERIZADO DE LISTA ====================
function renderListaNegocios(negocios) {
    let html = `<div class="max-w-7xl mx-auto p-4 md:p-6 pt-0">`;
    
    if (filtroBusqueda) {
        html += `<div class="mb-3 text-sm text-gray-500">🔍 Resultados para: "${escapeHtml(filtroBusqueda)}" (${negocios.length} encontrados)</div>`;
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
        const reservasSemanaNegocio = getReservasSemanaPorNegocio(n.id);
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
        
        // Se escapa ANTES de resaltar: nombre y telefono los escribe la duena,
        // y el <mark> es lo unico que debe llegar como HTML.
        let nombreMostrado = escapeHtml(n.nombre || 'Sin nombre');
        let telefonoMostrado = escapeHtml(n.telefono || 'No registrado');

        if (filtroBusqueda) {
            const regex = new RegExp(`(${escapeHtml(filtroBusqueda).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            nombreMostrado = nombreMostrado.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
            if (n.telefono) {
                telefonoMostrado = telefonoMostrado.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
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
                            ${badgeWizard(n)}
                        </div>
                        <p class="text-sm text-gray-600">📧 ${escapeHtml(n.email || 'No registrado')}</p>
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
                        <div class="font-bold text-lg ${reservasHoy > 0 ? 'text-orange-500' : 'text-gray-400'}">${actividadReservasCargada ? reservasHoy : '—'}</div>
                    </div>
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">Últ. 7 días</div>
                        <div class="font-bold text-lg ${reservasSemanaNegocio > 0 ? 'text-emerald-600' : 'text-gray-400'}">${actividadReservasCargada ? reservasSemanaNegocio : '—'}</div>
                    </div>
                </div>
                
                <div class="flex flex-col md:flex-row justify-between text-xs mt-3 text-gray-500 gap-2 pb-3 border-b">
                    <div>💳 Último pago: ${fechaUltimo}</div>
                    <div class="${diasRestantes <= 3 && n.estado_suscripcion === 'activa' ? 'text-red-600 font-bold' : ''}">⏰ Próximo pago: ${fechaProximo} ${diasRestantes > 0 ? `(faltan ${diasRestantes} días)` : diasRestantes < 0 ? '(VENCIDO)' : ''}</div>
                </div>

                ${window.renderFichaComercial ? window.renderFichaComercial(n) : ''}

                <div class="mt-3 flex flex-wrap gap-2">
                    <button onclick="window.togglePendiente(${jsArg(n.id)})" class="${esPendiente ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">
                        ${esPendiente ? '✔️ Quitar Pendiente' : '👀 Marcar Pendiente'}
                    </button>
                    ${n.estado_suscripcion === 'trial' ? `<button onclick="window.activarDesdeTrial(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">✅ Activar</button>` : ''}
                    ${n.estado_suscripcion === 'suspendida' ? `<button onclick="window.reactivarNegocio(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">▶️ Reactivar</button>` : ''}
                    ${n.estado_suscripcion === 'activa' ? `<button onclick="window.suspenderNegocio(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">⏸️ Suspender</button>` : ''}
                    
                    <button onclick="window.abrirModalPagadoHasta(${jsArg(n.id)}, ${jsArg(n.nombre)}, ${jsArg(n.proximo_pago)})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Pagado hasta</button>

                    <div class="flex flex-col gap-1">
                        <button onclick="window.enviarWhatsApp(${jsArg(n.telefono)}, ${jsArg(n.nombre)}, ${jsArg(n.id)})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">💬 Soporte</button>
                        ${ultimoSoporte ? `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${ultimoSoporte}</span>` : ''}
                    </div>
                    
                    <div class="flex flex-col gap-1">
                        <button onclick="window.enviarWhatsAppSimple(${jsArg(n.telefono)}, ${jsArg(n.nombre)}, ${jsArg(n.id)})" class="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">💚 WhatsApp Hola</button>
                        ${ultimoHola ? `<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">${ultimoHola}</span>` : ''}
                    </div>

                    <button onclick="window.generarMensajeCliente(${jsArg(n)})" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Mensaje cliente</button>
                    
                    <button onclick="window.notificarNegocio(${jsArg(n)})" class="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">🔔 Notificar</button>
                    
                    <button onclick="window.notificarVencimiento(${jsArg(n)})" class="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">⚠️ Avisar Vencimiento</button>
                    
                    <button onclick="window.borrarNegocioCompleto(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Borrar Supabase</button>

                    <button onclick="window.reiniciarNegocioCompleto(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Reiniciar cuenta</button>

                    <button onclick="window.abrirModalCambiarPassword(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">Cambiar contraseña</button>

                    <button onclick="window.alternarArchivadoNegocio(${jsArg(n.id)}, ${jsArg(n.nombre)}, ${n.archivado === true})" class="${n.archivado ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">${n.archivado ? '↩️ Restaurar' : '📦 Archivar'}</button>

                    <button onclick="window.toggleEliminado(${jsArg(n.id)})" class="${esEliminado ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'} px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">
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
            
            // Sin canal propio NO se usa el global: rservas-vencimientos es
            // publico y compartido, y este mensaje lleva nombre y WhatsApp
            // de cada clienta. Se salta el salon y se avisa al final.
            if (!ntfyTopic || ntfyTopic.trim() === '') {
                negociosSinTopic.push(neg.nombre);
                continue;
            }
            ntfyTopic = ntfyTopic.trim();

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
            reporteFinal += `\n\n⚠️ Sin canal propio, no se les envió (${negociosSinTopic.length}):\n${negociosSinTopic.join(', ')}`;
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
window.abrirModalCambiarPassword = abrirModalCambiarPassword;
window.alternarArchivadoNegocio = alternarArchivadoNegocio;
window.marcarTicketSoporte = marcarTicketSoporte;
window.responderTicketSoporte = responderTicketSoporte;
window.guardarPasswordNegocio = guardarPasswordNegocio;
window.enviarWhatsApp = enviarWhatsApp;
window.enviarWhatsAppSimple = enviarWhatsAppSimple;  
window.generarMensajeCliente = generarMensajeCliente;
window.notificarNegocio = notificarNegocio;
window.notificarVencimiento = notificarVencimiento;  
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
// ==================== CARGAS SECUNDARIAS ====================
// Si una falla, su seccion dice "No se pudo cargar · Reintentar". Antes
// desaparecia sin mas: "Soporte fallo" se veia igual que "no hay tickets".
// Que la tabla aun no exista no cuenta como fallo.
const erroresCarga = new Set();
const CARGAS_SECUNDARIAS = {
    soporte: { nombre: 'Soporte', cargar: () => cargarTicketsSoporte(), guardar: d => { ticketsSoporteData = d; } },
    tiendas: { nombre: 'Tiendas por aprobar', cargar: () => cargarTiendasPorAprobar(), guardar: d => { tiendasPorAprobarData = d; } },
    reportes: { nombre: 'Reportes de RomaHub', cargar: () => cargarReportesTienda(), guardar: d => { reportesTiendaData = d; } }
};

async function recargarSeccion(clave) {
    const carga = CARGAS_SECUNDARIAS[clave];
    if (!carga) return;
    carga.guardar(await carga.cargar());
    renderHeader();
}
window.recargarSeccion = recargarSeccion;

function avisoErrorCarga(clave) {
    if (!erroresCarga.has(clave)) return '';
    return `
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-2">
            <span>No se pudo cargar <strong>${CARGAS_SECUNDARIAS[clave].nombre}</strong>.</span>
            <button type="button" onclick="recargarSeccion('${clave}')" class="bg-white border border-red-300 hover:bg-red-100 text-red-800 px-3 py-2 rounded-lg font-semibold">Reintentar</button>
        </div>`;
}

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
    
    // Ordenar por reservas por defecto. Las tiendas RomaHub no entran aqui
    // (ver actualizarListaNegocios): se ven en su propia seccion.
    const negociosOrdenados = ordenarNegocios(negocios.filter(n => n.es_tienda_externa !== true), 'reservas');
    renderListaNegocios(negociosOrdenados);
    actualizarBotonesFiltro();
    actualizarBotonOrden();

    Promise.all([
        obtenerReservasDiarias(),
        obtenerActividadReservas(),
        window.cargarAuditoriaComercial ? window.cargarAuditoriaComercial(negocios) : Promise.resolve(),
        window.cargarSeguimientoComercial ? window.cargarSeguimientoComercial() : Promise.resolve()
    ]).then(([totalDiarias]) => {
        reservasDiarias = totalDiarias || 0;
        datosActualizadosEn = new Date();
        renderHeader();
        actualizarListaNegocios();
        actualizarBotonesFiltro();
        actualizarBotonOrden();
        console.log('✅ Actividad de reservas cargada en segundo plano');
    }).catch(error => {
        console.error('Error cargando actividad en segundo plano:', error);
    });

    // Soporte y RomaHub: en segundo plano, no bloquean el panel si una tabla
    // aun no existe (F5 recien desplegado).
    Object.keys(CARGAS_SECUNDARIAS).forEach(recargarSeccion);
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
