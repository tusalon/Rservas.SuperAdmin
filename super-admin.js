// super-admin.js
// ==================== CONFIGURACIÓN ====================
const PRECIO_MENSUAL = 1000;
const DIAS_POR_DEFECTO = 15;
// Debe coincidir con FECHA_CORTE de rservasroma/utils/suscripcion.js: el panel
// de la duena ignora todo vencimiento anterior a esta fecha (habia 250 salones
// con fechas viejas de prueba). Aqui se usa el mismo criterio para que la lista
// de cobros muestre exactamente a quien el sistema esta bloqueando de verdad.
const FECHA_CORTE_COBRO = '2026-07-19';
const WHATSAPP_MENSAJE = "Hola, te escribimos desde el soporte de RservasRoma para saber en qué podemos ayudarte";
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
// Fila de admin_actividad_negocios por salon (vacio si la funcion no existe)
let actividadPorNegocio = {};
let ordenActual = "reservas"; // 'reservas', 'semana' o 'fecha'
let reservasDiarias = null; // null = aun cargando: se muestra "—", no un 0 falso
let datosActualizadosEn = null; // hora en que llegaron los datos, no la del pintado
let reservasHoyPorNegocio = {}; // citas sacadas hoy, por negocio
let reportesTiendaData = [];
let tiendasPorAprobarData = [];
let ticketsSoporteData = [];
let reservasSemanaPorNegocio = {}; // citas con fecha en los ultimos 7 dias, por negocio
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
// Cuenta por negocio a partir de filas sueltas (carga de antes).
function contarPorNegocio(filas) {
    const cuenta = {};
    (filas || []).forEach(f => { cuenta[f.negocio_id] = (cuenta[f.negocio_id] || 0) + 1; });
    return cuenta;
}

async function obtenerReservasDiarias() {
    const actividad = await cargarActividadAdmin();
    if (actividad) {
        reservasHoyPorNegocio = Object.fromEntries(Object.values(actividad).map(f => [f.negocio_id, f.reservas_hoy]));
        return Object.values(reservasHoyPorNegocio).reduce((suma, n) => suma + n, 0);
    }
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

        reservasHoyPorNegocio = contarPorNegocio(data);
        return (data || []).length;
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

// Una fila por negocio con toda su actividad, calculada en la base
// (sql-admin-actividad-negocios.sql): sustituye a bajar reservas, servicios,
// horarios y profesionales enteros. Se pide una sola vez y la comparten el
// panel y el embudo comercial. Si la funcion aun no existe, da null y cada
// parte usa su carga de antes.
// ponytail: PostgREST devuelve como maximo 1000 filas; hoy hay ~400 negocios.
let actividadAdminPromesa = null;
function cargarActividadAdmin() {
    if (!actividadAdminPromesa) {
        actividadAdminPromesa = window.supabase.rpc('admin_actividad_negocios')
            .then(({ data, error }) => {
                if (error || !Array.isArray(data) || data.length === 0) {
                    if (error) console.warn('admin_actividad_negocios no disponible, se usa la carga de antes:', error.message);
                    return null;
                }
                return Object.fromEntries(data.map(fila => [String(fila.negocio_id), fila]));
            })
            .catch(() => null);
    }
    return actividadAdminPromesa;
}
window.cargarActividadAdmin = cargarActividadAdmin;

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
        // Con admin_actividad_negocios no hace falta bajar nada de esto.
        const actividadPromise = cargarActividadAdmin();
        const saludPromise = actividadPromise.then(actividad => actividad ? null : Promise.all([
            traerTodo('servicios', 'negocio_id,id', q => q.eq('activo', true)),
            traerTodo('horarios_profesionales', 'negocio_id,dias'),
            traerTodo('servicios_profesionales', 'negocio_id,servicio_id')
        ]));

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
            const actividad = await actividadPromise;
            if (actividad) {
                actividadPorNegocio = actividad;
                const filas = Object.values(actividad);
                negociosConServicios = new Set(filas.filter(f => f.servicios > 0).map(f => f.negocio_id));
                negociosConHorarios = new Set(filas.filter(f => f.horarios_con_dias > 0).map(f => f.negocio_id));
                serviciosSinProfesionalPorNegocio = Object.fromEntries(
                    filas.filter(f => f.servicios_sin_profesional > 0).map(f => [f.negocio_id, f.servicios_sin_profesional])
                );
            } else {
                // Carga de antes, si aun no se corrio sql-admin-actividad-negocios.sql.
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
            }
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
    return reservasHoyPorNegocio[negocioId] || 0;
}

async function obtenerActividadReservas() {
    const actividad = await cargarActividadAdmin();
    if (actividad) {
        reservasSemanaPorNegocio = Object.fromEntries(Object.values(actividad).map(f => [f.negocio_id, f.reservas_7d]));
        actividadReservasCargada = true;
        return;
    }
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
        reservasSemanaPorNegocio = contarPorNegocio(semana);
        actividadReservasCargada = true;
    } catch (error) {
        console.error('Error obteniendo actividad de reservas:', error);
        reservasSemanaPorNegocio = {};
        actividadReservasCargada = true;
    }
}

function getReservasSemanaPorNegocio(negocioId) {
    if (!negocioId) return 0;
    return reservasSemanaPorNegocio[negocioId] || 0;
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
            <div class="max-w-6xl mx-auto p-4">
                <div role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                    <p class="font-semibold">No se pudieron cargar los salones</p>
                    <p class="text-sm mt-1">Revisa la conexión. Si sigue fallando, comprueba que exista la vista vista_negocios_admin en Supabase.</p>
                    <button type="button" onclick="location.reload()" class="${BTN_SEC} mt-3">Reintentar</button>
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
    limiteLista = PAGINA_LISTA;
    actualizarListaNegocios();
    actualizarBotonOrden();
}

function actualizarBotonOrden() {
    const selector = document.getElementById('orden');
    if (selector) selector.value = ordenActual;
}

// ==================== ACCIONES ====================
// Despues de una accion se vuelve a leer SOLO ese negocio y se repinta. Antes
// era location.reload(): con internet de Cuba bajaba todo el panel otra vez y
// se perdian el scroll, el filtro y la busqueda.
const CAMPOS_EXTRA_NEGOCIO = ['sitio_web', 'ntfy_topic', 'es_tienda_externa', 'archivado', 'romahub_estado', 'romahub_nota_rechazo', 'configurado'];

function repintarPanel() {
    renderHeader();
    actualizarListaNegocios();
    actualizarBotonesFiltro();
    actualizarBotonOrden();
}

async function refrescarNegocio(id, cambiosLocales = {}) {
    const i = negociosData.findIndex(n => String(n.id) === String(id));
    try {
        const { data } = await window.supabase.from('vista_negocios_admin').select('*').eq('id', id).limit(1);
        const fila = data?.[0];
        if (fila && i !== -1) {
            // Los extras no vienen en la vista (ver cargarNegocios): se conservan.
            const extras = Object.fromEntries(CAMPOS_EXTRA_NEGOCIO.map(c => [c, negociosData[i][c]]));
            negociosData[i] = aplicarRectificacionNegocio({ ...negociosData[i], ...fila, ...extras, ...cambiosLocales });
        } else if (i !== -1) {
            negociosData[i] = { ...negociosData[i], ...cambiosLocales };
        }
    } catch (error) {
        console.warn('No se pudo releer el negocio; pulsa Recargar para ver el cambio:', error);
        if (i !== -1) negociosData[i] = { ...negociosData[i], ...cambiosLocales };
    }
    repintarPanel();
}

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
        await refrescarNegocio(id);
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
        await refrescarNegocio(id);
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
        await refrescarNegocio(id);
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
        await refrescarNegocio(id);
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}



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
        ? chip('Configurado', 'verde')
        : chip('Sin terminar la configuración', 'ambar');
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
        negociosData = negociosData.filter(n => String(n.id) !== String(id));
        repintarPanel();
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
        await refrescarNegocio(id, { configurado: false });
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
        alert('No se pudo cargar el cifrado de contraseñas. Recarga la página e inténtalo de nuevo.');
        return;
    }

    const modalExistente = document.getElementById('modal-cambiar-password');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-cambiar-password';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">Cambiar contraseña</h3>
                    <p class="text-sm text-gray-500">${escapeHtml(nombreNegocio)}</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-cambiar-password')?.remove()" aria-label="Cerrar" class="-mr-2 -mt-1 inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-md text-gray-600 hover:bg-gray-100 text-2xl leading-none">&times;</button>
            </div>

            <label class="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input id="password-nueva" type="password" autocomplete="new-password" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">

            <label class="block text-sm font-medium text-gray-700 mt-4 mb-1">Repetir contraseña</label>
            <input id="password-repetir" type="password" autocomplete="new-password" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">

            <label class="flex items-center gap-2 mt-3 text-sm text-gray-600">
                <input type="checkbox" id="password-ver" class="rounded"> Ver lo que escribo
            </label>

            <p class="text-xs text-gray-500 mt-3">Se guarda cifrada. Anótala antes de cerrar: después no hay forma de volver a verla, solo de cambiarla otra vez.</p>

            <div class="flex gap-2 mt-5">
                <button type="button" onclick="document.getElementById('modal-cambiar-password')?.remove()" class="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">Cancelar</button>
                <button type="button" id="password-guardar" onclick="window.guardarPasswordNegocio(${jsArg(id)})" class="flex-1 px-4 py-2 rounded-lg bg-purple-700 text-white font-medium hover:bg-purple-800">Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    prepararModal(modal, 'Cambiar contraseña');

    document.getElementById('password-ver').addEventListener('change', (e) => {
        const tipo = e.target.checked ? 'text' : 'password';
        document.getElementById('password-nueva').type = tipo;
        document.getElementById('password-repetir').type = tipo;
    });
}

async function guardarPasswordNegocio(id) {
    const nueva = document.getElementById('password-nueva')?.value || '';
    const repetir = document.getElementById('password-repetir')?.value || '';
    const boton = document.getElementById('password-guardar');

    if (nueva.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    if (nueva !== repetir) {
        alert('Las dos contraseñas no coinciden.');
        return;
    }
    if (!confirm('¿Cambiar la contraseña de este salón?\n\nLa anterior deja de servir en cuanto se guarde.')) return;

    const cifrador = getBcrypt();
    if (!cifrador) {
        alert('No se pudo cargar el cifrado de contraseñas. Recarga la página e inténtalo de nuevo.');
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
        alert('Contraseña actualizada. Envíasela al salón para que pueda entrar.');
    } catch (error) {
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Guardar';
        }
        alert('No se pudo cambiar la contraseña: ' + error.message);
    }
}

// Todos los modales se anuncian como dialogo, se cierran con Esc (ver
// instalarAtajos) o tocando fuera, y al cerrarse devuelven el foco a donde
// estaba (si no, con teclado se volvia al principio de la pagina).
function prepararModal(modal, titulo) {
    // Si se abrio desde un menu, el menu ya se cerro: el foco vuelve a su boton.
    const focoPrevio = document.activeElement?.closest?.('details[data-menu]')?.querySelector('summary')
        || document.activeElement;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', titulo);
    modal.dataset.modal = '';
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    const observador = new MutationObserver(() => {
        if (modal.isConnected) return;
        observador.disconnect();
        if (focoPrevio?.isConnected) focoPrevio.focus();
    });
    observador.observe(document.body, { childList: true });
    (modal.querySelector('input, select, textarea') || modal.querySelector('button'))?.focus();
}
window.prepararModal = prepararModal;

function abrirModalPagadoHasta(id, nombreNegocio, fechaActual = '') {
    const fechaBase = String(fechaActual || calcularFechaMasDias(DIAS_POR_DEFECTO)).slice(0, 10);
    const modalExistente = document.getElementById('modal-pagado-hasta');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-pagado-hasta';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">Pagado hasta</h3>
                    <p class="text-sm text-gray-500">${escapeHtml(nombreNegocio)}</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-pagado-hasta')?.remove()" aria-label="Cerrar" class="-mr-2 -mt-1 inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-md text-gray-600 hover:bg-gray-100 text-2xl leading-none">&times;</button>
            </div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
            <input id="pagado-hasta-fecha" type="date" value="${fechaBase}" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            <label class="block text-sm font-medium text-gray-700 mt-4 mb-1">Monto pagado CUP</label>
            <input id="pagado-hasta-monto" type="number" min="1" step="1" value="${PRECIO_MENSUAL}" class="w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
            <p class="text-xs text-gray-500 mt-2">Ejemplo: si eliges el 25 de septiembre, el salón queda pagado hasta ese día.</p>
            <div class="flex gap-2 mt-5">
                <button type="button" onclick="document.getElementById('modal-pagado-hasta')?.remove()" class="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">Cancelar</button>
                <button type="button" onclick="window.guardarPagadoHasta(${jsArg(id)})" class="flex-1 px-4 py-2 rounded-lg bg-purple-700 text-white font-medium hover:bg-purple-800">Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    prepararModal(modal, 'Pagado hasta');
}

async function guardarPagadoHasta(id) {
    const fecha = document.getElementById('pagado-hasta-fecha')?.value;
    const monto = parseFloat(document.getElementById('pagado-hasta-monto')?.value || PRECIO_MENSUAL);

    if (!fecha) {
        alert('Elige una fecha válida.');
        return;
    }
    if (Number.isNaN(monto) || monto <= 0) {
        alert('Escribe un monto válido.');
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
        await refrescarNegocio(id);
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
        // La contrasena nunca va en este mensaje: se reenvia, se reenvia...
        'La contraseña te la enviamos en un mensaje aparte.',
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
    
    const fecha = registro[tipo];
    return fecha ? `Último WhatsApp: ${fecha}` : '';
    
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

// A quien va un aviso masivo. Nunca a suspendidos, archivados, bajas ni
// tiendas RomaHub.
const enUso = n => ['activa', 'trial'].includes(n.estado_suscripcion);
const SEGMENTOS_AVISO = {
    en_uso: ['los salones activos y en prueba', enUso],
    activos: ['los salones que pagan', n => n.estado_suscripcion === 'activa'],
    prueba: ['los salones en prueba', n => n.estado_suscripcion === 'trial'],
    sin_configurar: ['los que no terminaron la configuración', n => enUso(n) && n.configurado !== true],
    nuevos: ['los que entraron en los últimos 30 días', n => enUso(n) && Number(n.dias_activo) <= 30],
};

async function notificarATodos(boton, segmento = 'en_uso') {
    const [nombreSegmento, perteneceAlSegmento] = SEGMENTOS_AVISO[segmento] || SEGMENTOS_AVISO.en_uso;
    const destinatarios = negociosData.filter(n =>
        n.es_tienda_externa !== true && n.archivado !== true && perteneceAlSegmento(n));
    // El canal global lo comparten todos los salones sin canal propio: para un
    // grupo concreto no se usa, o le llegaria tambien a los de fuera del grupo.
    const temaDe = n => (n.ntfy_topic || (segmento === 'en_uso' ? NTFY_TOPIC_GLOBAL : '')).trim();
    const topicsUnicos = Array.from(new Map(
        destinatarios.map(n => [temaDe(n), n])
    ).entries()).filter(([tema]) => Boolean(tema));

    if (topicsUnicos.length === 0) {
        alert('⚠️ No hay negocios activos para notificar');
        return;
    }

    const mensaje = prompt(`Aviso para ${nombreSegmento}: ${destinatarios.length} salones (${topicsUnicos.length} canales).\n\nEscribe el mensaje que recibirán todos:`, 'Comunicado importante de Rservas');
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
    
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Estado suscripción', 'Segmento', 'Prioridad', 'Diagnóstico', 'Acción recomendada', 'Estado comercial', 'Última actividad', 'Última cita', 'Próxima cita', 'Reservas históricas', 'Reservas Mes', 'Profesionales', 'Próximo Pago', 'Monto', 'Próximo seguimiento', 'Responsable', 'Objeción', 'Notas', 'Usa Finanzas (cobros 30 días)', 'Recomendada por', 'Puede dar testimonio'];
    const rows = resultados.map(n => {
        const audit = window.obtenerAuditoriaComercial?.(n.id) || {};
        const tracking = window.obtenerSeguimientoComercial?.(n.id) || {};
        return [
            n.id, n.nombre || '', n.email || '', n.telefono || '', n.estado_suscripcion || '',
            audit.segment || '', tracking.prioridad_manual || audit.priority || '', audit.diagnosis || '', audit.action || '',
            tracking.estado || 'sin_contactar', audit.lastActivity || '', audit.lastPastAppointment || '', audit.nextAppointment || '',
            audit.total || 0, n.reservas_mes || 0, audit.professionalCount ?? n.profesionales_activas ?? 0,
            n.proximo_pago || '', n.monto_ultimo_pago || PRECIO_MENSUAL, tracking.proximo_seguimiento || '',
            tracking.responsable || '', tracking.objecion || '', tracking.notas || '',
            actividadPorNegocio[n.id]?.finanzas_cobros_30 ?? '', tracking.referido_por || '', tracking.testimonio ? 'Sí' : ''
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
    limiteLista = PAGINA_LISTA;
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
    limiteLista = PAGINA_LISTA;
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

const CHIP_FILTRO_ON = ['bg-gray-900', 'text-white', 'border-gray-900'];
const CHIP_FILTRO_OFF = ['bg-white', 'text-gray-800', 'border-gray-300', 'hover:bg-gray-50'];

function actualizarBotonesFiltro() {
    document.querySelectorAll('[data-filtro]').forEach(boton => {
        const activo = boton.dataset.filtro === filtroActual;
        boton.setAttribute('aria-pressed', String(activo));
        boton.classList.remove(...CHIP_FILTRO_ON, ...CHIP_FILTRO_OFF);
        boton.classList.add(...(activo ? CHIP_FILTRO_ON : CHIP_FILTRO_OFF));
    });
}

// ==================== ESTILO DEL PANEL ====================
// Un solo vocabulario para todo el panel: el morado de marca solo en la accion
// principal; rojo, ambar y verde solo para estados. Los botones miden 44 px en
// el movil (se usan con el pulgar) y 36 px en el PC, donde cabe mas.
const UI = {
    btn: 'inline-flex items-center justify-center gap-1.5 rounded-md px-3 min-h-11 md:min-h-9 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:opacity-50 disabled:cursor-wait',
    panel: 'bg-white border border-gray-200 rounded-lg',
};
const BTN_PRI = `${UI.btn} bg-purple-700 text-white hover:bg-purple-800`;
const BTN_SEC = `${UI.btn} bg-white text-gray-800 border border-gray-300 hover:bg-gray-50`;
const BTN_PELIGRO = `${UI.btn} bg-white text-red-700 border border-red-200 hover:bg-red-50`;
const BTN_TEXTO = `${UI.btn} text-purple-800 hover:bg-purple-50`;
const ITEM_MENU = 'w-full text-left px-3 min-h-11 md:min-h-9 text-sm text-gray-800 hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none';

const TONOS = {
    rojo: 'bg-red-50 text-red-800 ring-red-200',
    ambar: 'bg-amber-50 text-amber-900 ring-amber-200',
    verde: 'bg-green-50 text-green-800 ring-green-200',
    morado: 'bg-purple-50 text-purple-800 ring-purple-200',
    gris: 'bg-gray-100 text-gray-700 ring-gray-200',
};

// texto: HTML ya seguro (los datos de la base se escapan antes de llegar aqui)
function chip(texto, tono = 'gris') {
    return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${TONOS[tono] || TONOS.gris}">${texto}</span>`;
}

const ESTADO_SUSCRIPCION = {
    activa: ['Activo', 'verde'],
    trial: ['En prueba', 'ambar'],
    suspendida: ['Suspendido', 'rojo'],
    inactiva: ['Baja', 'gris'],
};

const ICONO_FLECHA = '<svg aria-hidden="true" class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" clip-rule="evenodd"/></svg>';

// Menu desplegable con <details>: se cierra al tocar fuera, al elegir una
// opcion o con Esc (ver instalarAtajos).
function menuDesplegable(etiqueta, items, { alinear = 'right', ancho = 'w-64' } = {}) {
    return `
        <details class="relative" data-menu>
            <summary class="${BTN_SEC} cursor-pointer list-none [&::-webkit-details-marker]:hidden">${etiqueta}${ICONO_FLECHA}</summary>
            <div role="menu" class="absolute ${alinear === 'left' ? 'left-0' : 'right-0'} z-30 mt-1 ${ancho} ${UI.panel} shadow-lg py-1">${items}</div>
        </details>`;
}

function itemMenu(texto, onclick, clases = '') {
    return `<button type="button" role="menuitem" onclick="${onclick}" class="${ITEM_MENU} ${clases}">${texto}</button>`;
}

// Secciones plegables del panel. Recuerdan si se dejaron abiertas.
const SECCIONES_KEY = 'secciones_abiertas_admin';
let seccionesAbiertas = (() => {
    try { return JSON.parse(localStorage.getItem(SECCIONES_KEY)) || {}; } catch (e) { return {}; }
})();

function recordarSeccion(clave, abierta) {
    if (Boolean(seccionesAbiertas[clave]) === abierta) return;
    seccionesAbiertas[clave] = abierta;
    try { localStorage.setItem(SECCIONES_KEY, JSON.stringify(seccionesAbiertas)); } catch (e) {}
}
window.recordarSeccion = recordarSeccion;

function abrirSeccion(clave) {
    recordarSeccion(clave, true);
    renderHeader();
    document.getElementById(`seccion-${clave}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.abrirSeccion = abrirSeccion;

function panelPlegable(clave, titulo, resumen, contenido, urgente = false) {
    return `
        <details id="seccion-${clave}" class="${UI.panel} mb-2 scroll-mt-4 group" ${seccionesAbiertas[clave] ? 'open' : ''} ontoggle="recordarSeccion('${clave}', this.open)">
            <summary class="flex items-center gap-3 px-4 min-h-12 py-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden rounded-lg hover:bg-gray-50">
                <span class="font-semibold text-gray-900 shrink-0">${titulo}</span>
                <span class="text-sm ${urgente ? 'text-red-700 font-medium' : 'text-gray-600'} flex-1 min-w-0 truncate">${resumen}</span>
                <span class="text-gray-500 transition-transform group-open:rotate-180">${ICONO_FLECHA}</span>
            </summary>
            <div class="border-t border-gray-200 px-4 py-2">${contenido}</div>
        </details>`;
}

function recorte(texto, max) {
    const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
    return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

function enlaceWhatsApp(n, texto = 'WhatsApp', plantilla = '') {
    if (!normalizarTelefonoWhatsApp(n.telefono, n.codigo_pais)) return '';
    return `<button type="button" onclick="abrirWhatsAppConPlantilla(${jsArg(n.id)}, ${jsArg(plantilla)})" class="${BTN_SEC}">${texto}</button>`;
}

function botonRegistrarPago(n, clases = BTN_PRI) {
    return `<button type="button" onclick="window.abrirModalPagadoHasta(${jsArg(n.id)}, ${jsArg(n.nombre)}, ${jsArg(fechaPagoDe(n))})" class="${clases}">Registrar pago</button>`;
}

// ==================== ALERTA DE ACTIVIDAD ====================
// Un salon "bajo" si esta semana saco menos de la mitad de citas que su media
// de las 3 semanas anteriores. Con menos de 3 citas por semana de media no se
// avisa: con tan poco volumen cualquier semana floja parece una caida.
function bajaActividad(n) {
    const fila = actividadPorNegocio[n?.id];
    if (!fila || fila.reservas_creadas_7d == null) return null;
    const media = Math.max(0, (fila.reservas_28 || 0) - fila.reservas_creadas_7d) / 3;
    if (media < 3 || fila.reservas_creadas_7d >= media * 0.5) return null;
    return { semana: fila.reservas_creadas_7d, media: Math.round(media) };
}
window.bajaActividad = bajaActividad;

// ==================== PLANTILLAS DE WHATSAPP ====================
// Un mensaje por situacion, en tuteo. Ninguna menciona el precio y ninguna
// lleva contrasenas. Se pueden editar antes de enviar.
function cuandoVencePago(n) {
    const fecha = fechaPagoDe(n);
    const dias = fecha && !esFechaHeredada(fecha) ? diasHastaPago(fecha) : null;
    if (dias == null) return 'pronto';
    if (dias < 0) return `el ${_fechaCorta(fecha)} (ya pasó)`;
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    return `el ${_fechaCorta(fecha)}`;
}

const PLANTILLAS = {
    saludo: {
        titulo: 'Saludo de soporte',
        texto: n => `Hola, te escribimos desde el soporte de RservasRoma. ¿Cómo te va con la app de ${n.nombre || 'tu salón'}? ¿Hay algo en lo que te podamos ayudar?`,
    },
    configurar: {
        titulo: 'Terminar la configuración',
        texto: n => `Hola, te escribimos desde RservasRoma. A ${n.nombre || 'tu salón'} todavía le faltan servicios o profesionales, y sin eso tus clientas no pueden reservar. ¿Te acompañamos a dejarlo listo? Son unos 10 minutos.`,
    },
    sin_horarios: {
        titulo: 'Faltan los horarios',
        texto: n => `Hola, te escribimos desde RservasRoma. A ${n.nombre || 'tu salón'} solo le faltan los horarios de trabajo para que tus clientas puedan reservar solas. ¿Te acompañamos a ponerlos ahora? Son unos minutos.`,
    },
    servicio_sin_profesional: {
        titulo: 'Servicios sin profesional',
        texto: n => `Hola, te escribimos desde RservasRoma. En ${n.nombre || 'tu salón'} hay servicios que ninguna profesional tiene asignados: tus clientas los ven pero no pueden reservarlos. ¿Te ayudamos a asignarlos?`,
    },
    primera_reserva: {
        titulo: 'Conseguir la primera reserva',
        texto: n => {
            const enlace = obtenerUrlPublicaNegocio(n);
            return `Hola, te escribimos desde RservasRoma. ${n.nombre || 'Tu salón'} ya está listo para recibir reservas, pero todavía no llegó la primera.${enlace ? ` Este es tu enlace para compartirlo con tus clientas: ${enlace}` : ''} ¿Quieres que te preparemos un mensaje para enviárselo?`;
        },
    },
    vence: {
        titulo: 'Vence la suscripción',
        texto: n => `Hola, te escribimos desde RservasRoma. Tu suscripción de ${n.nombre || 'tu salón'} vence ${cuandoVencePago(n)}. Cuando hagas el pago, avísanos por aquí y lo registramos enseguida para que no se te bloquee el panel.`,
    },
    bajo_actividad: {
        titulo: 'Bajó su actividad',
        texto: n => `Hola, te escribimos desde RservasRoma. Vimos que esta semana ${n.nombre || 'tu salón'} recibió menos reservas que de costumbre. ¿Todo bien con la app? Si algo no te funciona, lo revisamos contigo.`,
    },
    finanzas: {
        titulo: 'Probar Roma Finanzas',
        texto: () => 'Hola, te escribimos desde RservasRoma. ¿Ya probaste Roma Finanzas en tu panel? Te dice cuánto te deja cada servicio después de pagar los materiales. Si quieres, te enseñamos a usarla en 5 minutos.',
    },
    referido: {
        titulo: 'Pedir un referido',
        texto: n => `Hola, te escribimos desde RservasRoma. Nos alegra ver que ${n.nombre || 'tu salón'} va muy bien con las reservas. ¿Conoces a otra dueña de salón a la que le pueda servir la app? Si nos pasas su contacto, la ayudamos a empezar.`,
    },
};

function nombrePlantilla(clave) {
    return PLANTILLAS[clave]?.titulo || '';
}
window.nombrePlantilla = nombrePlantilla;

// La plantilla que mejor encaja con lo que le pasa a este salon.
function sugerirPlantilla(n) {
    const fecha = fechaPagoDe(n);
    const dias = fecha && !esFechaHeredada(fecha) ? diasHastaPago(fecha) : null;
    if (dias != null && dias <= 3 && dias >= -7) return 'vence';
    const problemas = diagnosticarNegocio(n);
    if (problemas.length === 1 && problemas[0] === 'sin horarios') return 'sin_horarios';
    if (problemas.length === 1 && problemas[0].includes('sin profesional') && /^\d/.test(problemas[0])) return 'servicio_sin_profesional';
    if (problemas.length) return 'configurar';
    const auditoria = window.obtenerAuditoriaComercial?.(n.id);
    if (auditoria?.segment === 'Sin estrenar') return 'primera_reserva';
    if (bajaActividad(n)) return 'bajo_actividad';
    const fila = actividadPorNegocio[n.id];
    if (n.estado_suscripcion === 'activa' && fila && 'finanzas_cobros_30' in fila && !fila.finanzas_cobros_30) return 'finanzas';
    if (n.estado_suscripcion === 'activa' && auditoria?.segment === 'Activa') return 'referido';
    return 'saludo';
}

function abrirWhatsAppConPlantilla(negocioId, clave) {
    const n = negociosData.find(x => String(x.id) === String(negocioId));
    if (!n) return;
    const tel = normalizarTelefonoWhatsApp(n.telefono, n.codigo_pais);
    if (!tel) {
        alert(`${n.nombre || 'Este salón'} no tiene teléfono registrado.`);
        return;
    }
    const sugerida = sugerirPlantilla(n);
    const elegida = PLANTILLAS[clave] ? clave : sugerida;

    document.getElementById('modal-whatsapp')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-whatsapp';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div class="flex items-start justify-between gap-3 mb-4">
                <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-gray-900">Escribir por WhatsApp</h3>
                    <p class="text-sm text-gray-600 break-words">${escapeHtml(n.nombre || '')} · ${escapeHtml(n.telefono || '')}</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-whatsapp')?.remove()" aria-label="Cerrar" class="-mr-2 -mt-1 inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-md text-gray-600 hover:bg-gray-100 text-2xl leading-none">&times;</button>
            </div>
            <label for="wa-plantilla" class="block text-sm font-medium text-gray-800 mb-1">Mensaje</label>
            <select id="wa-plantilla" class="w-full rounded-md border border-gray-300 bg-white px-3 min-h-11 text-base md:text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200">
                ${Object.entries(PLANTILLAS).map(([k, pl]) => `<option value="${k}" ${k === elegida ? 'selected' : ''}>${pl.titulo}${k === sugerida ? ' (sugerido)' : ''}</option>`).join('')}
            </select>
            <label for="wa-texto" class="block text-sm font-medium text-gray-800 mt-3 mb-1">Texto (puedes cambiarlo)</label>
            <textarea id="wa-texto" rows="6" class="w-full rounded-md border border-gray-300 px-3 py-2 text-base md:text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200">${escapeHtml(PLANTILLAS[elegida].texto(n))}</textarea>
            <p class="mt-1 text-sm text-gray-600">Queda anotado en el historial de contactos del salón.</p>
            <div class="flex gap-2 mt-4">
                <button type="button" onclick="document.getElementById('modal-whatsapp')?.remove()" class="${BTN_SEC} flex-1">Cancelar</button>
                <button type="button" id="wa-enviar" class="${BTN_PRI} flex-1">Abrir WhatsApp</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    prepararModal(modal, 'Escribir por WhatsApp');

    const selector = document.getElementById('wa-plantilla');
    const texto = document.getElementById('wa-texto');
    selector.addEventListener('change', () => { texto.value = PLANTILLAS[selector.value].texto(n); });
    document.getElementById('wa-enviar').addEventListener('click', () => {
        // window.open primero, dentro del clic: si no, el navegador lo bloquea.
        window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto.value)}`, '_blank', 'noopener');
        const plantilla = selector.value;
        modal.remove();
        registrarUltimoContacto(n.id, 'soporte');
        Promise.resolve(window.registrarContactoComercial?.(n.id, { canal: 'whatsapp', plantilla }))
            .finally(() => repintarPanel());
    });
}
window.abrirWhatsAppConPlantilla = abrirWhatsAppConPlantilla;

// ==================== RENDERIZADO DEL HEADER ====================
// ==================== COBROS DE LA SEMANA ====================
// Igual que parseFechaLocal de rservasroma/utils/suscripcion.js: el dia
// AAAA-MM-DD se lee como fecha LOCAL. new Date('2026-09-29') lo toma como
// medianoche UTC, que en Cuba (UTC-4) es el dia anterior: el panel decia
// "Vence hoy" a quien la app de la duena aun no bloqueaba.
function fechaLocal(fecha) {
    const match = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(fecha);
}

function _medianocheCobro(fecha) {
    const d = fechaLocal(fecha);
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
        return fechaLocal(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) { return String(f).slice(0, 10); }
}

function _filaCobro(item, tipo) {
    const n = item.n;
    let etiqueta;
    if (item.motivo === 'suspendida') etiqueta = 'Suspendido a mano';
    else if (item.dias === 0) etiqueta = 'Vence hoy';
    else if (item.dias < 0) etiqueta = `Venció hace ${Math.abs(item.dias)} d`;
    else if (item.dias === 1) etiqueta = 'Vence mañana';
    else etiqueta = `En ${item.dias} días`;

    return `
        <li class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5">
            <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-900 truncate">${escapeHtml(n.nombre || '(sin nombre)')}</div>
                <div class="text-sm ${tipo === 'bloqueado' ? 'text-red-700' : 'text-amber-800'}">${etiqueta} · ${_fechaCorta(item.fecha)}</div>
            </div>
            <div class="flex flex-wrap gap-2 sm:shrink-0">
                ${enlaceWhatsApp(n)}
                ${botonRegistrarPago(n, BTN_SEC)}
            </div>
        </li>
    `;
}

function renderSeccionCobros() {
    const { bloqueados, porCobrar, heredados } = calcularCobros(negociosData.filter(n => n.archivado !== true));
    const grupo = (titulo, nota, filas, vacio) => `
        <div class="py-2">
            <h3 class="text-sm font-semibold text-gray-900">${titulo}</h3>
            <p class="text-sm text-gray-600">${nota}</p>
            ${filas.length ? `<ul class="divide-y divide-gray-200">${filas.join('')}</ul>` : `<p class="py-2 text-sm text-gray-600">${vacio}</p>`}
        </div>`;
    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 lg:gap-6 divide-y divide-gray-200 lg:divide-y-0">
            ${grupo(`Bloqueados ahora (${bloqueados.length})`, 'No pueden entrar a su panel. Sus clientas sí reservan.',
                bloqueados.map(i => _filaCobro(i, 'bloqueado')), 'Ninguno.')}
            ${grupo(`Por cobrar esta semana (${porCobrar.length})`, 'La app ya les avisa 3, 2 y 1 día antes.',
                porCobrar.map(i => _filaCobro(i, 'porcobrar')), 'Nadie vence en 7 días.')}
        </div>
        ${heredados ? `<p class="py-2 text-sm text-gray-600">${heredados} salones tienen fechas anteriores al ${_fechaCorta(FECHA_CORTE_COBRO)} (pruebas viejas): el sistema los ignora y no los bloquea hasta que les registres un pago.</p>` : ''}
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
    const { criticos } = calcularSalud(negociosData.filter(n => n.archivado !== true));
    const filas = criticos.map(({ n, problemas, dias }) => `
        <li class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="font-medium text-gray-900 truncate">${escapeHtml(n.nombre || '(sin nombre)')}</span>
                    ${n.estado_suscripcion === 'activa' ? chip('Paga', 'verde') : chip(`${dias} d`, 'gris')}
                </div>
                <div class="text-sm text-red-700">${problemas.map(escapeHtml).join(' · ')}</div>
            </div>
            <div class="flex flex-wrap gap-2 sm:shrink-0">${enlaceWhatsApp(n)}</div>
        </li>`).join('');

    return `
        <p class="py-2 text-sm text-gray-600">No pueden recibir reservas hasta resolverlo. Salen los que pagan y los que entraron hace menos de 30 días.</p>
        ${filas ? `<ul class="divide-y divide-gray-200">${filas}</ul>` : '<p class="py-2 text-sm text-gray-600">Ninguno urgente.</p>'}
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
        tiendasPorAprobarData = tiendasPorAprobarData.filter(t => String(t.id) !== String(id));
        await refrescarNegocio(id, { configurado: true, romahub_estado: 'aprobada', romahub_nota_rechazo: '' });
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
        tiendasPorAprobarData = tiendasPorAprobarData.filter(t => String(t.id) !== String(id));
        await refrescarNegocio(id, { romahub_estado: 'rechazada', romahub_nota_rechazo: motivo.trim().slice(0, 600) });
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
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div class="flex items-start justify-between gap-3 mb-1">
                <h3 class="text-lg font-semibold text-gray-900">Acceso restablecido</h3>
                <button type="button" onclick="document.getElementById('modal-acceso-restablecido')?.remove()" aria-label="Cerrar" class="-mr-2 -mt-1 inline-flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-md text-gray-600 hover:bg-gray-100 text-2xl leading-none">&times;</button>
            </div>
            <p class="text-sm text-gray-600 mb-4">${escapeHtml(nombre)}: envíaselo por WhatsApp a la dueña. No vuelve a mostrarse.</p>

            <dl class="divide-y divide-gray-200 rounded-md border border-gray-200">
                <div class="px-3 py-2.5">
                    <dt class="text-sm text-gray-600">Usuario (WhatsApp)</dt>
                    <dd class="text-base font-semibold text-gray-900 break-all">${escapeHtml(acceso.usuario)}</dd>
                </div>
                <div class="px-3 py-2.5 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <dt class="text-sm text-gray-600">Contraseña nueva</dt>
                        <dd class="text-base font-semibold text-gray-900 font-mono break-all">${escapeHtml(acceso.password)}</dd>
                    </div>
                    <button type="button" onclick="navigator.clipboard?.writeText(${jsArg(acceso.password)})" class="${BTN_SEC} shrink-0">Copiar</button>
                </div>
                <div class="px-3 py-2.5 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <dt class="text-sm text-gray-600">Código de recuperación nuevo</dt>
                        <dd class="text-base font-semibold text-gray-900 font-mono break-all">${escapeHtml(acceso.codigo_recuperacion)}</dd>
                    </div>
                    <button type="button" onclick="navigator.clipboard?.writeText(${jsArg(acceso.codigo_recuperacion)})" class="${BTN_SEC} shrink-0">Copiar</button>
                </div>
            </dl>

            <button type="button" onclick="document.getElementById('modal-acceso-restablecido')?.remove()" class="${BTN_PRI} mt-5 w-full">Listo</button>
        </div>
    `;
    document.body.appendChild(modal);
    prepararModal(modal, 'Acceso restablecido');
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
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div class="relative aspect-square bg-gray-100">
                ${item.imagen_url ? `<img src="${escapeHtml(item.imagen_url)}" alt="${escapeHtml(item.nombre || '')}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-sm text-gray-600">Sin foto</div>'}
                <button type="button" onclick="document.getElementById('modal-articulo-tienda')?.remove()" aria-label="Cerrar" class="absolute top-2 right-2 w-11 h-11 rounded-full bg-white/90 text-gray-800 text-2xl leading-none">&times;</button>
                ${item.tipo === 'curso' ? '<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gray-900 text-white text-[11px] font-bold">Curso</span>' : ''}
            </div>
            <div class="p-4">
                <p class="text-sm text-gray-600">${escapeHtml(item.tiendaNombre || '')}</p>
                <p class="font-semibold text-gray-900 text-lg break-words">${escapeHtml(item.nombre || '(sin nombre)')}</p>
                <div class="flex items-center gap-3 mt-1">
                    <p class="font-semibold text-gray-900 tabular-nums">${Number(item.precio || 0)} ${escapeHtml(item.moneda || 'CUP')}</p>
                    ${disponibilidad ? `<p class="text-sm text-gray-600">${disponibilidad}</p>` : ''}
                </div>
                ${item.descripcion ? `<p class="text-sm text-gray-800 mt-3 leading-relaxed break-words">${escapeHtml(item.descripcion)}</p>` : '<p class="text-sm text-gray-600 mt-3">Sin descripción.</p>'}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    prepararModal(modal, item.nombre || 'Artículo');
}
window.verArticuloPorAprobar = verArticuloPorAprobar;

function renderTiendasPorAprobar() {
    if (!tiendasPorAprobarData.length) return '';

    const tarjetaArticulo = (item, tipo) => `
        <button type="button" onclick="verArticuloPorAprobar(${jsArg(tipo)}, ${jsArg(item.id)})" class="text-left group rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600">
            <div class="relative aspect-square rounded-md bg-gray-100 overflow-hidden border border-gray-200 group-hover:border-purple-500">
                ${item.imagen_url ? `<img src="${escapeHtml(item.imagen_url)}" alt="${escapeHtml(item.nombre || '')}" loading="lazy" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-xs text-gray-500">Sin foto</div>'}
                ${(tipo === 'curso' ? item.cupos === 0 : item.stock === 0) ? '<span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-gray-900 text-white text-[10px] font-semibold">Sin stock</span>' : ''}
            </div>
            <p class="mt-1 text-xs text-gray-800 truncate">${escapeHtml(item.nombre || '(sin nombre)')}</p>
            <p class="text-xs font-semibold text-gray-900 tabular-nums">${Number(item.precio || 0)} ${escapeHtml(item.moneda || 'CUP')}</p>
        </button>
    `;

    const tiendas = tiendasPorAprobarData.map(t => {
        const articulos = [...t.productos.map(p => ({ item: p, tipo: 'producto' })), ...t.cursos.map(c => ({ item: c, tipo: 'curso' }))];
        return `
            <li class="py-3">
                <div class="flex items-start gap-3">
                    <div class="w-12 h-12 rounded-md bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                        ${t.logo_url ? `<img src="${escapeHtml(t.logo_url)}" alt="" loading="lazy" class="w-full h-full object-cover">` : ''}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-medium text-gray-900 break-words">${escapeHtml(t.nombre || '(sin nombre)')} <span class="font-normal text-sm text-gray-600">· ${articulos.length} artículos</span></p>
                        <p class="text-sm text-gray-600 break-words">${escapeHtml(t.especialidad || 'Belleza')} · ${escapeHtml(t.provincia || '')}${t.municipio ? ' · ' + escapeHtml(t.municipio) : ''} · ${escapeHtml(t.telefono || 'sin WhatsApp')}</p>
                        ${t.mensaje_bienvenida ? `<p class="text-sm text-gray-600 mt-1 italic break-words">"${escapeHtml(t.mensaje_bienvenida)}"</p>` : ''}
                    </div>
                </div>
                ${t.imagen_fondo_url ? `<div class="h-28 rounded-md overflow-hidden mt-3"><img src="${escapeHtml(t.imagen_fondo_url)}" alt="Portada de la tienda" loading="lazy" class="w-full h-full object-cover"></div>` : ''}
                <div class="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    ${articulos.length ? articulos.map(a => tarjetaArticulo(a.item, a.tipo)).join('') : '<p class="col-span-full text-sm text-gray-600">Sin productos ni cursos activos: no debería haber podido enviarse a revisión.</p>'}
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" onclick="aprobarTiendaExterna(${jsArg(t.id)}, ${jsArg(t.nombre)})" class="${BTN_PRI}">Aprobar y publicar</button>
                    <button type="button" onclick="rechazarTiendaExterna(${jsArg(t.id)}, ${jsArg(t.nombre)})" class="${BTN_PELIGRO}">Rechazar</button>
                    <button type="button" onclick="restablecerAccesoTienda(${jsArg(t.id)}, ${jsArg(t.nombre)})" class="${BTN_SEC}">Restablecer acceso</button>
                </div>
            </li>
        `;
    }).join('');

    return `
        <p class="py-2 text-sm text-gray-600">Revisa los productos antes de publicar. Solo se ven en RomaHub después de aprobarlas.</p>
        <ul class="divide-y divide-gray-200">${tiendas}</ul>
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
        await refrescarNegocio(id, { configurado: false });
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function activarTiendaExterna(id, nombre) {
    try {
        const { error } = await window.supabase.from('negocios').update({ configurado: true }).eq('id', id);
        if (error) throw error;
        alert(`✅ "${nombre}" vuelve a verse en RomaHub.`);
        await refrescarNegocio(id, { configurado: true });
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
    const ESTADO_ROMAHUB = {
        borrador: ['Borrador', 'gris'],
        en_revision: ['En revisión', 'ambar'],
        rechazada: ['Rechazada', 'rojo'],
        aprobada: ['Verificada', 'verde'],
    };

    const filasTiendas = tiendasExternas.slice(0, 30).map(n => {
        const numReportes = reportesPorNegocio[n.id] || 0;
        const oculta = n.configurado === false;
        const [estadoTexto, estadoTono] = ESTADO_ROMAHUB[n.romahub_estado] || ['', 'gris'];
        return `
            <li class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-medium text-gray-900 break-words">${escapeHtml(n.nombre || '(sin nombre)')}</span>
                        ${oculta ? chip('Oculta', 'gris') : chip('Visible', 'verde')}
                        ${estadoTexto ? chip(estadoTexto, estadoTono) : ''}
                        ${numReportes ? chip(`${numReportes} ${numReportes === 1 ? 'reporte' : 'reportes'}`, 'rojo') : ''}
                    </div>
                    <div class="text-sm text-gray-600">${escapeHtml(n.provincia || 'Sin provincia')}${n.municipio ? ' · ' + escapeHtml(n.municipio) : ''}</div>
                </div>
                <div class="flex flex-wrap gap-2 sm:shrink-0">
                    <button type="button" onclick="restablecerAccesoTienda(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="${BTN_SEC}">Restablecer acceso</button>
                    ${oculta
                        ? `<button type="button" onclick="activarTiendaExterna(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="${BTN_SEC}">Volver a mostrar</button>`
                        : `<button type="button" onclick="ocultarTiendaExterna(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="${BTN_PELIGRO}">Ocultar</button>`}
                </div>
            </li>
        `;
    }).join('');

    const filasReportes = pendientes.slice(0, 20).map(r => {
        const negocio = negocioPorId[r.negocio_id];
        return `
            <li class="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-2.5">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-medium text-gray-900">${escapeHtml(negocio ? negocio.nombre : '(tienda eliminada)')}</span>
                        ${chip(escapeHtml(r.motivo), 'ambar')}
                    </div>
                    ${r.detalle ? `<p class="text-sm text-gray-700 mt-0.5 break-words">${escapeHtml(r.detalle)}</p>` : ''}
                    <p class="text-sm text-gray-600 mt-0.5">${new Date(r.created_at).toLocaleString('es-ES')}</p>
                </div>
                <div class="flex flex-wrap gap-2 sm:shrink-0">
                    ${negocio && negocio.es_tienda_externa ? `<button type="button" onclick="ocultarTiendaExterna(${jsArg(negocio.id)}, ${jsArg(negocio.nombre)})" class="${BTN_PELIGRO}">Ocultar tienda</button>` : ''}
                    <button type="button" onclick="resolverReporteTienda(${jsArg(r.id)}, 'descartado')" class="${BTN_SEC}">Descartar</button>
                    <button type="button" onclick="resolverReporteTienda(${jsArg(r.id)}, 'resuelto')" class="${BTN_PRI}">Resuelto</button>
                </div>
            </li>
        `;
    }).join('');

    return `
        <p class="py-2 text-sm text-gray-600">Vendedoras sin cuenta de RservasRoma que se registraron gratis en RomaHub.</p>
        ${filasReportes ? `
            <h3 class="pt-2 text-sm font-semibold text-gray-900">Reportes sin revisar</h3>
            <ul class="divide-y divide-gray-200 mb-2">${filasReportes}</ul>
        ` : ''}
        <h3 class="pt-2 text-sm font-semibold text-gray-900">Tiendas</h3>
        <ul class="divide-y divide-gray-200">${filasTiendas || '<li class="py-2 text-sm text-gray-600">Ninguna tienda externa todavía.</li>'}</ul>
        ${tiendasExternas.length > 30 ? `<p class="py-2 text-sm text-gray-600">y ${tiendasExternas.length - 30} más…</p>` : ''}
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
    return `
        <li class="py-3">
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
                ${esNuevo ? chip('Sin leer', 'rojo') : ''}
                ${resuelto ? chip('Resuelto', 'verde') : ''}
                ${chip(ticket.origen === 'clientas' ? 'Clienta' : 'Dueña', 'gris')}
                ${ticket.con_foto ? chip('Trae foto en el chat', 'ambar') : ''}
                <span class="text-sm text-gray-600">${escapeHtml(fechaSoporte(ticket.created_at))}</span>
            </div>
            <p class="font-medium text-gray-900 break-words">${escapeHtml(ticket.negocio_nombre || '(sin salón)')}
                <span class="font-normal text-sm text-gray-600">${escapeHtml(ticket.negocio_slug || '')}</span>
            </p>
            <p class="text-sm text-gray-600 mb-1.5 break-words">${escapeHtml(ticket.quien || '')}${ticket.contacto ? ' · ' + escapeHtml(ticket.contacto) : ' · sin teléfono'}${ticket.plataforma ? ' · ' + escapeHtml(ticket.plataforma) : ''}</p>
            <p class="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">${escapeHtml(ticket.mensaje || '')}</p>
            <div class="flex flex-wrap gap-2 mt-2.5">
                <button type="button" onclick="responderTicketSoporte(${jsArg(ticket.id)})" class="${BTN_PRI}">Responder</button>
                ${resuelto
                    ? `<button type="button" onclick="marcarTicketSoporte(${jsArg(ticket.id)}, 'leido')" class="${BTN_SEC}">Reabrir</button>`
                    : `<button type="button" onclick="marcarTicketSoporte(${jsArg(ticket.id)}, 'resuelto')" class="${BTN_SEC}">Marcar resuelto</button>`}
            </div>
        </li>
    `;
}

function renderSeccionSoporte() {
    if (!ticketsSoporteData.length) return '';
    const pendientes = ticketsSoporteData.filter(t => t.estado !== 'resuelto');
    const resueltos = ticketsSoporteData.filter(t => t.estado === 'resuelto').slice(0, 10);
    return `
        <p class="py-2 text-sm text-gray-600">Mensajes del botón de soporte de las apps. Quedan aquí aunque el WhatsApp no llegue a enviarse.</p>
        ${pendientes.length ? `<ul class="divide-y divide-gray-200">${pendientes.map(tarjetaTicketSoporte).join('')}</ul>` : ''}
        ${resueltos.length ? `
            <h3 class="pt-3 text-sm font-semibold text-gray-900">Resueltos hace poco</h3>
            <ul class="divide-y divide-gray-200">${resueltos.map(tarjetaTicketSoporte).join('')}</ul>` : ''}
    `;
}

// ==================== BANDEJA "HOY" ====================
// Lo que hay que atender hoy, junto y en filas iguales. Antes estaba repartido
// en cinco secciones con formatos distintos, y en el movil habia que bajar
// mucho para verlo. Un salon sale una sola vez, con su motivo mas urgente.
let bandejaCompleta = false;
window.verBandejaCompleta = function() {
    bandejaCompleta = !bandejaCompleta;
    renderHeader();
};

function calcularBandejaHoy() {
    const filas = [];
    const vistos = new Set();
    const agregar = fila => {
        if (fila.negocioId) {
            if (vistos.has(fila.negocioId)) return;
            vistos.add(fila.negocioId);
        }
        filas.push(fila);
    };
    const salones = negociosData.filter(n =>
        n.es_tienda_externa !== true && n.archivado !== true && !eliminadosLocal.includes(n.id));

    ticketsSoporteData.filter(t => t.estado !== 'resuelto').forEach(t => agregar({
        peso: t.estado === 'nuevo' ? 0 : 1,
        tipo: 'Soporte', tono: 'rojo',
        titulo: t.negocio_nombre || '(sin salón)',
        detalle: `${t.estado === 'nuevo' ? 'Sin leer · ' : ''}${fechaSoporte(t.created_at)} · ${recorte(t.mensaje, 110)}`,
        acciones: [
            `<button type="button" onclick="marcarTicketSoporte(${jsArg(t.id)}, 'resuelto')" class="${BTN_SEC}">Resuelto</button>`,
            `<button type="button" onclick="responderTicketSoporte(${jsArg(t.id)})" class="${BTN_PRI}">Responder</button>`,
        ],
    }));

    // Cobros: solo lo de hoy y mañana, y lo que vencio esta semana (aun se
    // recupera). Lo mas viejo sigue en la seccion Cobros.
    const { bloqueados, porCobrar } = calcularCobros(salones);
    bloqueados.filter(i => i.motivo === 'vencida' && i.dias >= -7).forEach(i => agregar({
        peso: 2, tipo: 'Cobro', tono: 'rojo', negocioId: i.n.id, titulo: i.n.nombre,
        detalle: i.dias === 0
            ? 'Vence hoy: ya no puede entrar a su panel'
            : `Venció hace ${-i.dias} ${-i.dias === 1 ? 'día' : 'días'}: no puede entrar a su panel`,
        acciones: [enlaceWhatsApp(i.n, 'WhatsApp', 'vence'), botonRegistrarPago(i.n)],
    }));
    porCobrar.filter(i => i.dias === 1).forEach(i => agregar({
        peso: 3, tipo: 'Cobro', tono: 'ambar', negocioId: i.n.id, titulo: i.n.nombre,
        detalle: 'Vence mañana',
        acciones: [enlaceWhatsApp(i.n, 'WhatsApp', 'vence'), botonRegistrarPago(i.n)],
    }));

    // Seguimientos que tocan hoy o se pasaron (la fecha la pones en el modal
    // de seguimiento). Antes se guardaba y no la miraba nadie.
    salones.forEach(n => {
        const seguimiento = window.obtenerSeguimientoComercial?.(n.id);
        if (!seguimiento?.proximo_seguimiento) return;
        const dias = diasHastaPago(seguimiento.proximo_seguimiento);
        if (dias == null || dias > 0) return;
        agregar({
            peso: 3.5, tipo: 'Seguimiento', tono: 'morado', negocioId: n.id, titulo: n.nombre,
            detalle: `${dias === 0 ? 'Toca hoy' : `Tocaba hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`}${seguimiento.notas ? ` · ${recorte(seguimiento.notas, 90)}` : ''}`,
            acciones: [
                enlaceWhatsApp(n),
                `<button type="button" onclick="abrirSeguimientoComercial(${jsArg(n.id)})" class="${BTN_PRI}">Seguimiento</button>`,
            ],
        });
    });

    calcularSalud(salones).criticos.filter(c => c.n.estado_suscripcion === 'activa').forEach(c => agregar({
        peso: 4, tipo: 'No recibe citas', tono: 'rojo', negocioId: c.n.id, titulo: c.n.nombre,
        detalle: `Paga y no puede recibir reservas: ${c.problemas.join(', ')}`,
        acciones: [enlaceWhatsApp(c.n)],
    }));

    // Salones que pagan y esta semana sacaron menos de la mitad de lo normal.
    salones.filter(n => n.estado_suscripcion === 'activa').forEach(n => {
        const baja = bajaActividad(n);
        if (!baja) return;
        agregar({
            peso: 4.5, tipo: 'Bajó su actividad', tono: 'ambar', negocioId: n.id, titulo: n.nombre,
            detalle: `Esta semana sacó ${baja.semana} ${baja.semana === 1 ? 'cita' : 'citas'}; lo normal son unas ${baja.media}.`,
            acciones: [enlaceWhatsApp(n, 'WhatsApp', 'bajo_actividad')],
        });
    });

    salones.forEach(n => {
        const auditoria = window.obtenerAuditoriaComercial?.(n.id);
        if (!auditoria || auditoria.isExternalStore) return;
        const seguimiento = window.obtenerSeguimientoComercial?.(n.id) || {};
        if ((seguimiento.prioridad_manual || auditoria.priority) !== 'P0') return;
        agregar({
            peso: 5, tipo: 'Retención', tono: 'morado', negocioId: n.id, titulo: n.nombre,
            detalle: `${auditoria.diagnosis}. ${auditoria.action}.`,
            acciones: [
                enlaceWhatsApp(n),
                `<button type="button" onclick="abrirSeguimientoComercial(${jsArg(n.id)})" class="${BTN_PRI}">Seguimiento</button>`,
            ],
        });
    });

    // A quien escribir hoy: los que estan a punto de pagar (P1) y no tienen
    // contacto en 14 dias. Cinco al dia, primero los que tienen mas citas
    // futuras: es una cola, no una lista para escribirle a todos a la vez.
    const hace14 = Date.now() - 14 * 86400000;
    salones
        .map(n => ({ n, auditoria: window.obtenerAuditoriaComercial?.(n.id), seguimiento: window.obtenerSeguimientoComercial?.(n.id) || {} }))
        .filter(({ auditoria, seguimiento }) => auditoria && !auditoria.isExternalStore
            && (seguimiento.prioridad_manual || auditoria.priority) === 'P1'
            && !['pago_confirmado', 'no_interesado'].includes(seguimiento.estado)
            && (!seguimiento.ultimo_contacto || fechaLocal(seguimiento.ultimo_contacto).getTime() < hace14))
        .sort((a, b) => (b.auditoria.futureAppointments || 0) - (a.auditoria.futureAppointments || 0))
        .slice(0, 5)
        .forEach(({ n, auditoria }) => agregar({
            peso: 5.5, tipo: 'Escribir hoy', tono: 'morado', negocioId: n.id, titulo: n.nombre,
            detalle: `${auditoria.diagnosis}. ${auditoria.action}.`,
            acciones: [
                enlaceWhatsApp(n),
                `<button type="button" onclick="abrirSeguimientoComercial(${jsArg(n.id)})" class="${BTN_PRI}">Seguimiento</button>`,
            ],
        }));

    tiendasPorAprobarData.forEach(t => agregar({
        peso: 6, tipo: 'RomaHub', tono: 'ambar', titulo: t.nombre,
        detalle: `Tienda esperando aprobación · ${(t.productos || []).length + (t.cursos || []).length} artículos`,
        acciones: [`<button type="button" onclick="abrirSeccion('tiendas')" class="${BTN_PRI}">Revisar</button>`],
    }));

    return filas.sort((a, b) => a.peso - b.peso);
}

function filaBandeja(fila) {
    return `
        <li class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                    ${chip(fila.tipo, fila.tono)}
                    <span class="font-medium text-gray-900 truncate">${escapeHtml(fila.titulo || '(sin nombre)')}</span>
                </div>
                <p class="mt-1 text-sm text-gray-600 break-words">${escapeHtml(fila.detalle)}</p>
            </div>
            <div class="flex flex-wrap gap-2 sm:shrink-0">${fila.acciones.filter(Boolean).join('')}</div>
        </li>`;
}

function renderBandejaHoy() {
    const filas = calcularBandejaHoy();
    const LIMITE = 8;
    const mostradas = bandejaCompleta ? filas : filas.slice(0, LIMITE);
    const cargando = !actividadReservasCargada;
    const cuerpo = filas.length
        ? `<ul class="divide-y divide-gray-200">${mostradas.map(filaBandeja).join('')}</ul>
           ${filas.length > LIMITE ? `<button type="button" onclick="verBandejaCompleta()" class="${BTN_TEXTO} mt-1 -ml-3">${bandejaCompleta ? 'Ver menos' : `Ver las ${filas.length}`}</button>` : ''}`
        : `<p class="py-3 text-sm text-gray-600">${cargando
            ? 'Cargando lo pendiente…'
            : 'Nada urgente: no hay mensajes sin responder, cobros de hoy ni salones de pago sin funcionar.'}</p>`;
    return `
        <section class="${UI.panel} mb-4" aria-labelledby="titulo-hoy">
            <div class="flex items-baseline justify-between gap-3 px-4 pt-3">
                <h2 id="titulo-hoy" class="text-base font-semibold text-gray-900">Hoy</h2>
                <span class="text-sm text-gray-600">${filas.length ? `${filas.length} por atender` : ''}</span>
            </div>
            <div class="px-4 pb-3">${cuerpo}</div>
        </section>`;
}

function renderHeader() {
    // Las tiendas RomaHub tienen su propia seccion: aqui solo entran negocios de
    // RservasRoma, para que los numeros no se inflen con tiendas gratis.
    const negociosRservasRoma = negociosData.filter(n => n.es_tienda_externa !== true);
    const stats = calcularEstadisticas(negociosRservasRoma.filter(n => n.archivado !== true));
    // Los contadores tienen que cuadrar con lo que ensena cada filtro, y los
    // filtros no muestran archivados.
    const visibles = negociosRservasRoma.filter(n => n.archivado !== true);
    const totalPorEstado = {
        todos: visibles.length,
        activa: visibles.filter(n => n.estado_suscripcion === 'activa').length,
        trial: visibles.filter(n => n.estado_suscripcion === 'trial').length,
        suspendida: visibles.filter(n => n.estado_suscripcion === 'suspendida').length,
        pendiente: visibles.filter(n => pendientesLocal.includes(n.id)).length,
        inactiva: visibles.filter(n => n.estado_suscripcion === 'inactiva').length,
        eliminados: visibles.filter(n => eliminadosLocal.includes(n.id)).length,
        archivados: negociosRservasRoma.filter(n => n.archivado === true).length
    };

    const fechaActual = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const horaDatos = datosActualizadosEn
        ? `datos de las ${datosActualizadosEn.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
        : 'cargando datos…';

    const kpi = (valor, etiqueta) => `
        <div class="bg-white px-3 py-2.5">
            <dt class="text-xs text-gray-600">${etiqueta}</dt>
            <dd class="mt-0.5 text-lg font-semibold text-gray-900 tabular-nums">${valor}</dd>
        </div>`;

    const filtro = (clave, etiqueta) => `
        <button type="button" data-filtro="${clave}" aria-pressed="${filtroActual === clave}" onclick="filtrarPorEstado('${clave}')"
            class="inline-flex items-center gap-1 shrink-0 rounded-full border px-3 min-h-11 md:min-h-9 text-sm font-medium ${filtroActual === clave ? CHIP_FILTRO_ON.join(' ') : CHIP_FILTRO_OFF.join(' ')}">
            ${etiqueta} <span class="tabular-nums opacity-80">${totalPorEstado[clave]}</span>
        </button>`;

    const filtroComercialActivo = window.hayFiltroComercialActivo ? window.hayFiltroComercialActivo() : false;

    const { bloqueados, porCobrar } = calcularCobros(visibles);
    const salud = calcularSalud(visibles);
    const ticketsPendientes = ticketsSoporteData.filter(t => t.estado !== 'resuelto').length;
    const reportesPendientes = reportesTiendaData.filter(r => r.estado === 'pendiente').length;
    const tiendasExternas = negociosData.filter(n => n.es_tienda_externa === true).length;

    const headerHtml = `
        <header class="bg-white border-b border-gray-200">
            <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                    <h1 class="text-lg font-semibold text-gray-900">SuperAdmin RservasRoma</h1>
                    <p class="text-sm text-gray-600">${fechaActual} · ${horaDatos}</p>
                </div>
                <div class="flex gap-2">
                    <button type="button" onclick="location.reload()" class="${BTN_SEC}">Recargar</button>
                    ${menuDesplegable('Más', `
                        <p class="px-3 pt-1 text-xs font-semibold text-gray-600">Avisos a las apps</p>
                        ${itemMenu('Aviso a activos y en prueba', "notificarATodos(this, 'en_uso')")}
                        ${itemMenu('Aviso solo a los que pagan', "notificarATodos(this, 'activos')")}
                        ${itemMenu('Aviso solo a los que están en prueba', "notificarATodos(this, 'prueba')")}
                        ${itemMenu('Aviso a los que no terminaron la configuración', "notificarATodos(this, 'sin_configurar')")}
                        ${itemMenu('Aviso a los nuevos (30 días)', "notificarATodos(this, 'nuevos')")}
                        <button type="button" role="menuitem" onclick="notificarTurnosHoy()" class="${ITEM_MENU}">Enviar a cada salón sus citas de hoy</button>
                        <button type="button" role="menuitem" onclick="notificarTurnosManana()" class="${ITEM_MENU}">Enviar a cada salón sus citas de mañana</button>
                        <div role="separator" class="my-1 border-t border-gray-200"></div>
                        ${itemMenu('Exportar lista a CSV', 'exportarCSV()')}
                        ${itemMenu('Cerrar sesión', 'logout()')}
                    `, { ancho: 'w-72' })}
                </div>
            </div>
        </header>

        <div class="max-w-6xl mx-auto px-4 pt-4">
            <dl class="mb-4 grid grid-cols-3 md:grid-cols-6 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200">
                ${kpi(reservasDiarias ?? '—', 'Citas sacadas hoy')}
                ${kpi(stats.reservasMes, 'Citas este mes')}
                ${kpi(stats.activos, 'Activos')}
                ${kpi(stats.trial, 'En prueba')}
                ${kpi(stats.suspendidos, 'Suspendidos')}
                ${kpi(stats.porVencer, 'Vencen en 7 días')}
            </dl>

            ${renderBandejaHoy()}

            ${avisoErrorCarga('soporte')}${avisoErrorCarga('tiendas')}${avisoErrorCarga('reportes')}

            <div class="mb-4">
                ${ticketsSoporteData.length ? panelPlegable('soporte', 'Soporte',
                    ticketsPendientes ? `${ticketsPendientes} sin resolver` : 'Todo resuelto',
                    renderSeccionSoporte(), ticketsPendientes > 0) : ''}
                ${tiendasPorAprobarData.length ? panelPlegable('tiendas', 'Tiendas por aprobar',
                    `${tiendasPorAprobarData.length} esperando revisión`, renderTiendasPorAprobar(), true) : ''}
                ${panelPlegable('cobros', 'Cobros',
                    `${bloqueados.length} bloqueados · ${porCobrar.length} por cobrar esta semana`,
                    renderSeccionCobros(), bloqueados.length > 0)}
                ${salud.totalConProblemas ? panelPlegable('salud', 'Salones que necesitan ayuda',
                    `${salud.criticos.length} urgentes · ${salud.totalConProblemas} con algo pendiente`,
                    renderSeccionSalud()) : ''}
                ${(tiendasExternas || reportesPendientes) ? panelPlegable('romahub', 'RomaHub',
                    `${tiendasExternas} tiendas${reportesPendientes ? ` · ${reportesPendientes} reportes sin revisar` : ''}`,
                    renderSeccionRomaHub(), reportesPendientes > 0) : ''}
                ${panelPlegable('embudo', 'Embudo comercial', 'Retención, cierre y activación',
                    window.renderEmbudoComercial ? window.renderEmbudoComercial() : '')}
            </div>

            <section aria-label="Buscar y filtrar salones" class="mb-3">
                <div class="flex flex-col md:flex-row gap-2">
                    <div class="relative flex-1">
                        <label for="buscador" class="sr-only">Buscar salón por nombre o teléfono</label>
                        <svg aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="search" id="buscador" value="${escapeHtml(textoBuscador)}"
                               placeholder="Buscar por nombre o teléfono (tecla /)"
                               class="w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 min-h-11 md:min-h-10 text-base md:text-sm text-gray-900 placeholder:text-gray-500 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                               oninput="buscarNegocio(this.value)" autocomplete="off">
                    </div>
                    <label for="orden" class="sr-only">Ordenar por</label>
                    <select id="orden" onchange="cambiarOrden(this.value)"
                        class="rounded-md border border-gray-300 bg-white px-3 min-h-11 md:min-h-10 text-sm text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200">
                        <option value="reservas" ${ordenActual === 'reservas' ? 'selected' : ''}>Más citas este mes</option>
                        <option value="semana" ${ordenActual === 'semana' ? 'selected' : ''}>Más citas en 7 días</option>
                        <option value="comercial" ${ordenActual === 'comercial' ? 'selected' : ''}>Prioridad comercial</option>
                        <option value="fecha" ${ordenActual === 'fecha' ? 'selected' : ''}>Más recientes</option>
                    </select>
                </div>
                <div role="group" aria-label="Filtrar por estado" class="mt-2 -mx-4 px-4 flex gap-2 overflow-x-auto pb-1 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
                    ${filtro('todos', 'Todos')}
                    ${filtro('activa', 'Activos')}
                    ${filtro('trial', 'En prueba')}
                    ${filtro('suspendida', 'Suspendidos')}
                    ${filtro('pendiente', 'Marcados')}
                    ${filtro('inactiva', 'Bajas')}
                    ${filtro('eliminados', 'Ocultos')}
                    ${filtro('archivados', 'Archivados')}
                </div>
                ${filtroComercialActivo ? `
                    <p class="mt-2 text-sm text-purple-800">Mostrando un grupo del embudo comercial.
                        <button type="button" onclick="limpiarFiltroComercial()" class="underline underline-offset-2 font-medium">Ver todos</button>
                    </p>` : ''}
            </section>
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
// La lista se pinta de 30 en 30: con ~450 salones de golpe el movil se
// arrastraba y habia unos 5.000 puntos de tabulacion.
const PAGINA_LISTA = 30;
let limiteLista = PAGINA_LISTA;
window.verMasNegocios = function() {
    limiteLista += PAGINA_LISTA;
    actualizarListaNegocios();
};

function tarjetaNegocio(n, posicion) {
    const [estadoTexto, estadoTono] = ESTADO_SUSCRIPCION[n.estado_suscripcion] || ESTADO_SUSCRIPCION.activa;
    const reservasHoy = getReservasDiariasPorNegocio(n.id);
    const reservasSemana = getReservasSemanaPorNegocio(n.id);
    const esPendiente = pendientesLocal.includes(n.id);
    const esEliminado = eliminadosLocal.includes(n.id);
    const seguimiento = window.obtenerSeguimientoComercial?.(n.id);
    const ultimoContacto = seguimiento?.ultimo_contacto
        ? `Último contacto: ${_fechaCorta(seguimiento.ultimo_contacto)}`
        : getUltimaVezTexto(n.id, 'ultima');
    const fila = actividadPorNegocio[n.id];
    const finanzasTexto = !fila || !('finanzas_cobros_30' in fila) ? '—'
        : fila.finanzas_cobros_30 > 0 ? `Sí · ${_fechaCorta(fila.finanzas_ultimo_cobro)}`
        : fila.finanzas_ultimo_cobro ? `Dejó el ${_fechaCorta(fila.finanzas_ultimo_cobro)}`
        : 'No';
    const urlNegocio = normalizarUrlNegocio(n);

    // Se escapa ANTES de resaltar: nombre y telefono los escribe la duena,
    // y el <mark> es lo unico que debe llegar como HTML.
    let nombreMostrado = escapeHtml(n.nombre || 'Sin nombre');
    let telefonoMostrado = escapeHtml(n.telefono || 'Sin teléfono');
    if (filtroBusqueda) {
        const regex = new RegExp(`(${escapeHtml(filtroBusqueda).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        nombreMostrado = nombreMostrado.replace(regex, '<mark class="bg-yellow-200 text-yellow-950 rounded px-0.5">$1</mark>');
        if (n.telefono) telefonoMostrado = telefonoMostrado.replace(regex, '<mark class="bg-yellow-200 text-yellow-950 rounded px-0.5">$1</mark>');
    }

    const fechaPago = fechaPagoDe(n);
    const dias = fechaPago && !esFechaHeredada(fechaPago) ? diasHastaPago(fechaPago) : null;
    const pagoTexto = !fechaPago ? 'Sin fecha'
        : dias == null ? _fechaCorta(fechaPago)
        : dias < 0 ? `Venció hace ${-dias} d`
        : dias === 0 ? 'Vence hoy'
        : `${_fechaCorta(fechaPago)} · ${dias} d`;

    const dato = (etiqueta, valor, clase = 'text-gray-900') => `
        <div>
            <dt class="text-xs text-gray-600">${etiqueta}</dt>
            <dd class="text-sm font-semibold tabular-nums ${clase}">${valor}</dd>
        </div>`;
    const cargando = !actividadReservasCargada;

    // Accion principal segun el estado; el resto, en "Mas".
    const principal = n.estado_suscripcion === 'trial'
        ? `<button type="button" onclick="window.activarDesdeTrial(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="${BTN_PRI}">Activar</button>`
        : n.estado_suscripcion === 'suspendida'
            ? `<button type="button" onclick="window.reactivarNegocio(${jsArg(n.id)}, ${jsArg(n.nombre)})" class="${BTN_PRI}">Reactivar</button>`
            : '';
    const pagadoHasta = `<button type="button" onclick="window.abrirModalPagadoHasta(${jsArg(n.id)}, ${jsArg(n.nombre)}, ${jsArg(fechaPago || '')})" class="${principal ? BTN_SEC : BTN_PRI}">Pagado hasta</button>`;

    const mas = menuDesplegable('Más', `
        ${itemMenu('Mensaje de bienvenida', `window.generarMensajeCliente(${jsArg(n)})`)}
        ${itemMenu('Enviar notificación a la app', `window.notificarNegocio(${jsArg(n)})`)}
        ${itemMenu('Aviso de vencimiento', `window.notificarVencimiento(${jsArg(n)})`)}
        ${itemMenu(esPendiente ? 'Quitar marca' : 'Marcar para revisar', `window.togglePendiente(${jsArg(n.id)})`)}
        ${itemMenu('Cambiar contraseña', `window.abrirModalCambiarPassword(${jsArg(n.id)}, ${jsArg(n.nombre)})`)}
        ${n.estado_suscripcion === 'activa' ? itemMenu('Suspender', `window.suspenderNegocio(${jsArg(n.id)}, ${jsArg(n.nombre)})`) : ''}
        ${itemMenu(n.archivado ? 'Restaurar de archivados' : 'Archivar', `window.alternarArchivadoNegocio(${jsArg(n.id)}, ${jsArg(n.nombre)}, ${n.archivado === true})`)}
        ${itemMenu(esEliminado ? 'Volver a mostrar' : 'Ocultar de la lista', `window.toggleEliminado(${jsArg(n.id)})`)}
        <div role="separator" class="my-1 border-t border-gray-200"></div>
        <p class="px-3 pt-1 text-xs font-semibold text-gray-600">Zona de peligro</p>
        ${itemMenu('Reiniciar cuenta', `window.reiniciarNegocioCompleto(${jsArg(n.id)}, ${jsArg(n.nombre)})`, 'text-red-700')}
        ${itemMenu('Borrar salón', `window.borrarNegocioCompleto(${jsArg(n.id)}, ${jsArg(n.nombre)})`, 'text-red-700')}
    `);

    return `
        <article class="${UI.panel} p-4">
            <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base font-semibold text-gray-900 break-words min-w-0">${nombreMostrado}</h2>
                ${chip(estadoTexto, estadoTono)}
                ${badgeWizard(n)}
                ${reservasHoy > 0 ? chip(`+${reservasHoy} hoy`, 'morado') : ''}
                ${esPendiente ? chip('Marcado', 'morado') : ''}
                ${esEliminado ? chip('Oculto', 'gris') : ''}
            </div>
            <p class="mt-1 text-sm text-gray-600 break-words">
                ${telefonoMostrado} · ${escapeHtml(n.email || 'Sin email')}
                ${urlNegocio ? ` · <a href="${escapeHtml(urlNegocio)}" target="_blank" rel="noopener noreferrer" class="inline-block py-3 -my-3 text-purple-800 underline underline-offset-2 hover:text-purple-900">Abrir app</a>` : ''}
            </p>

            <dl class="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2">
                ${dato('Citas este mes', `${n.reservas_mes || 0}${ordenActual === 'reservas' && Number(n.reservas_mes) > 0 ? ` <span class="font-normal text-gray-600">#${posicion}</span>` : ''}`)}
                ${dato('Últimos 7 días', cargando ? '—' : reservasSemana)}
                ${dato('Usa Finanzas', finanzasTexto)}
                ${dato('Profesionales', n.profesionales_activas || 0)}
                ${dato('Antigüedad', `${n.dias_activo || 0} d`)}
                ${dato('Próximo pago', pagoTexto, dias != null && dias <= 3 ? 'text-red-700' : 'text-gray-900')}
            </dl>

            ${window.renderFichaComercial ? window.renderFichaComercial(n) : ''}

            <div class="mt-3 flex flex-wrap items-center gap-2">
                ${principal}
                ${pagadoHasta}
                <button type="button" onclick="abrirWhatsAppConPlantilla(${jsArg(n.id)})" class="${BTN_SEC}">WhatsApp</button>
                ${mas}
                ${ultimoContacto ? `<span class="text-xs text-gray-600">${escapeHtml(ultimoContacto)}</span>` : ''}
            </div>
        </article>
    `;
}

function renderListaNegocios(negocios) {
    const mostrados = negocios.slice(0, limiteLista);
    const quedan = negocios.length - mostrados.length;
    let html = `<div class="max-w-6xl mx-auto px-4 pb-10">`;

    html += `<p class="mb-2 text-sm text-gray-600" aria-live="polite">${negocios.length} ${negocios.length === 1 ? 'salón' : 'salones'}${filtroBusqueda ? ` para "${escapeHtml(textoBuscador.trim())}"` : ''}</p>`;

    if (negocios.length === 0) {
        html += `
            <div class="${UI.panel} p-8 text-center">
                <p class="text-base font-medium text-gray-900">No hay salones con este filtro</p>
                <p class="mt-1 text-sm text-gray-600">Prueba con otra parte del nombre o del teléfono, o cambia el filtro de arriba.</p>
                ${filtroBusqueda ? `<button type="button" onclick="limpiarBusqueda()" class="${BTN_SEC} mt-3">Limpiar búsqueda</button>` : ''}
            </div>`;
    }

    html += `<div class="grid gap-3">${mostrados.map((n, i) => tarjetaNegocio(n, i + 1)).join('')}</div>`;

    if (quedan > 0) {
        html += `
            <div class="mt-4 flex justify-center">
                <button type="button" onclick="verMasNegocios()" class="${BTN_SEC}">Ver ${Math.min(PAGINA_LISTA, quedan)} más (quedan ${quedan})</button>
            </div>`;
    }

    html += `</div>`;

    const listaNegocios = document.getElementById('lista-negocios');
    if (listaNegocios) listaNegocios.innerHTML = html;
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
    if (index > -1) pendientesLocal.splice(index, 1);
    else pendientesLocal.push(id);
    localStorage.setItem('pendientes_admin', JSON.stringify(pendientesLocal));
    if (window.marcasEnSupabase?.()) window.actualizarSeguimientoComercial(id, { marcado: pendientesLocal.includes(id) });
    actualizarListaNegocios();
    renderHeader();
}

function toggleEliminado(id) {
    const index = eliminadosLocal.indexOf(id);
    if (index > -1) eliminadosLocal.splice(index, 1);
    else eliminadosLocal.push(id);
    localStorage.setItem('eliminados_admin', JSON.stringify(eliminadosLocal));
    if (window.marcasEnSupabase?.()) window.actualizarSeguimientoComercial(id, { oculto: eliminadosLocal.includes(id) });

    // Si estamos en la vista de ocultos y quitamos el ultimo, volver a todos
    if (filtroActual === 'eliminados' && eliminadosLocal.length === 0) {
        filtroActual = 'todos';
    }

    actualizarListaNegocios();
    renderHeader();
}

// "Marcados" y "Ocultos" se guardan en el seguimiento de cada salon, en
// Supabase: antes vivian solo en este navegador y en el movil no se veian.
// Lo que ya estaba marcado aqui se sube una vez; despues manda Supabase.
async function sincronizarMarcas() {
    if (!window.marcasEnSupabase?.()) return;
    const seguimiento = id => window.obtenerSeguimientoComercial(id);
    const subir = [
        ...pendientesLocal.filter(id => !seguimiento(id).marcado).map(id => [id, { marcado: true }]),
        ...eliminadosLocal.filter(id => !seguimiento(id).oculto).map(id => [id, { oculto: true }]),
    ];
    for (const [id, cambios] of subir) await window.actualizarSeguimientoComercial(id, cambios);
    pendientesLocal = negociosData.filter(n => seguimiento(n.id).marcado === true).map(n => n.id);
    eliminadosLocal = negociosData.filter(n => seguimiento(n.id).oculto === true).map(n => n.id);
    localStorage.setItem('pendientes_admin', JSON.stringify(pendientesLocal));
    localStorage.setItem('eliminados_admin', JSON.stringify(eliminadosLocal));
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
    const textoBotonFallback = esHoy ? 'Enviar a cada salón sus citas de hoy' : 'Enviar a cada salón sus citas de mañana';

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
            alert(`No hay ninguna cita reservada para ${etiquetaDia} en todo el sistema.`);
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
            alert(`Ningún salón activo tiene citas para ${etiquetaDia}.`);
            return;
        }

        if (!confirm(`¿Enviar sus citas de ${etiquetaDia} a los ${negociosConTurnos.length} salones que tienen alguna?\n\nLos que tienen la agenda vacía no reciben nada.`)) return;

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

            const tituloMensaje = `${neg.nombre}: ${turnosNegocio.length} citas para ${etiquetaDia}`;
            
            const porProfesional = {};
            const porServicio = {};
            
            turnosNegocio.forEach(turno => {
                const profesional = turno.profesional_nombre || 'No asignado';
                const servicio = turno.servicio || 'No especificado';
                porProfesional[profesional] = (porProfesional[profesional] || 0) + 1;
                porServicio[servicio] = (porServicio[servicio] || 0) + 1;
            });

            let cuerpoMensaje = `🌟 *${neg.nombre}*\n📅 ${fechaLegible}\n📊 Total: ${turnosNegocio.length} cita${turnosNegocio.length !== 1 ? 's' : ''}\n━━━━━━━━━━━━━━━━━━━━━\n`;
            
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
        <div role="alert" class="mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 flex flex-wrap items-center justify-between gap-2">
            <span>No se pudo cargar <strong>${CARGAS_SECUNDARIAS[clave].nombre}</strong>.</span>
            <button type="button" onclick="recargarSeccion('${clave}')" class="${BTN_SEC}">Reintentar</button>
        </div>`;
}

// ==================== ATAJOS ====================
// "/" lleva al buscador. Esc cierra primero un menu abierto y, si no hay, el
// modal de arriba. Tocar fuera de un menu, o elegir una opcion, lo cierra.
function instalarAtajos() {
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const menus = document.querySelectorAll('details[data-menu][open]');
            if (menus.length) {
                menus.forEach(menu => { menu.open = false; menu.querySelector('summary')?.focus(); });
                return;
            }
            const modales = document.querySelectorAll('[data-modal]');
            modales[modales.length - 1]?.remove();
            return;
        }
        const escribiendo = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
        if (e.key === '/' && !escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            document.getElementById('buscador')?.focus();
        }
    });
    document.addEventListener('click', e => {
        document.querySelectorAll('details[data-menu][open]').forEach(menu => {
            if (!menu.contains(e.target) || e.target.closest('[role="menuitem"]')) menu.open = false;
        });
    });
}

// ==================== INICIALIZACIÓN ====================
async function init() {
    instalarAtajos();
    console.log('🚀 Inicializando panel Super Admin...');
    
    // Mostrar loading
    const panelHeader = document.getElementById('panel-header');
    const listaNegocios = document.getElementById('lista-negocios');
    
    if (panelHeader) {
        panelHeader.innerHTML = `<p class="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-600" role="status">Comprobando acceso…</p>`;
    }
    if (listaNegocios) {
        listaNegocios.innerHTML = `<p class="max-w-6xl mx-auto px-4 text-sm text-gray-600" role="status">Cargando salones…</p>`;
    }
    
    // Verificar acceso
    const acceso = await verificarAcceso();
    if (!acceso) return;
    
    // Cargar negocios primero para mostrar el panel rapido.
    const negocios = await cargarNegocios();
    
    if (negocios.length === 0) {
        if (panelHeader) {
            panelHeader.innerHTML = `
                <div class="max-w-6xl mx-auto p-4">
                    <div role="alert" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                        <p class="font-semibold">No llegó ningún salón</p>
                        <p class="text-sm mt-1">Comprueba que la vista vista_negocios_admin exista en Supabase y tenga datos.</p>
                        <button type="button" onclick="location.reload()" class="${BTN_SEC} mt-3">Reintentar</button>
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
        return sincronizarMarcas().catch(error => console.warn('No se pudieron sincronizar las marcas:', error));
    }).then(() => {
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
