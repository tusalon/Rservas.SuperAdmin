// super-admin.js
// ==================== CONFIGURACIÓN ====================
const PRECIO_MENSUAL = 1000;
const DIAS_POR_DEFECTO = 15;
const WHATSAPP_MENSAJE = "Hola, escribimos desde el soporte de Rservas.Roma para saber en qué podemos ayudarle";
const NTFY_TOPIC_GLOBAL = "rservas-vencimientos";
const ADMIN_EMAIL = "rservasroma@gmail.com";

let filtroActual = "todos";
let filtroBusqueda = "";
let negociosData = [];
let ordenActual = "reservas"; // 'reservas' o 'fecha'
let reservasDiarias = 0;
let reservasDiariasData = [];

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
        
        const { data, error } = await window.supabase
            .from('reservas')
            .select('fecha_hora, negocio_id')
            .gte('fecha_hora', hoyISO);

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
        const unique = data.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
        );
        
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
    const ingresos = negocios.filter(n => n.estado_suscripcion === 'activa').reduce((sum, n) => sum + PRECIO_MENSUAL, 0);
    const porVencer = negocios.filter(n => {
        const dias = n.dias_para_renovar;
        return dias !== null && dias <= 7 && dias > 0 && n.estado_suscripcion === 'activa';
    }).length;
    
    return { total, activos, suspendidos, trial, reservasMes, ingresos, porVencer };
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
    const btnReservas = document.getElementById('order-reservas');
    const btnFecha = document.getElementById('order-fecha');
    
    if (btnReservas && btnFecha) {
        if (ordenActual === 'reservas') {
            btnReservas.classList.add('active', 'bg-purple-600', 'text-white');
            btnReservas.classList.remove('bg-gray-200', 'text-gray-700');
            btnFecha.classList.remove('active', 'bg-purple-600', 'text-white');
            btnFecha.classList.add('bg-gray-200', 'text-gray-700');
        } else {
            btnFecha.classList.add('active', 'bg-purple-600', 'text-white');
            btnFecha.classList.remove('bg-gray-200', 'text-gray-700');
            btnReservas.classList.remove('active', 'bg-purple-600', 'text-white');
            btnReservas.classList.add('bg-gray-200', 'text-gray-700');
        }
    }
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

function enviarWhatsApp(telefono, nombreNegocio) {
    if (!telefono || telefono === 'No registrado' || telefono === '') {
        alert(`⚠️ ${nombreNegocio} no tiene número de teléfono registrado`);
        return;
    }
    
    let numeroLimpio = telefono.replace(/\D/g, '');
    if (!numeroLimpio.startsWith('53') && numeroLimpio.length === 8) {
        numeroLimpio = '53' + numeroLimpio;
    }
    
    const mensajeCodificado = encodeURIComponent(WHATSAPP_MENSAJE);
    window.open(`https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`, '_blank');
}

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

async function notificarATodos() {
    const activos = negociosData.filter(n => n.estado_suscripcion === 'activa');
    
    if (activos.length === 0) {
        alert('⚠️ No hay negocios activos para notificar');
        return;
    }
    
    const mensaje = prompt(`📢 Notificar a ${activos.length} negocios activos:\n\nEscribe el mensaje que recibirán todos:`, 'Comunicado importante de Rservas');
    if (!mensaje) return;
    
    let enviados = 0;
    let errores = 0;
    
    for (const neg of activos) {
        const tema = neg.ntfy_topic || NTFY_TOPIC_GLOBAL;
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
        resultados = resultados.filter(n => n.estado_suscripcion === filtroActual);
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
    
    if (filtroActual !== 'todos') {
        resultados = resultados.filter(n => n.estado_suscripcion === filtroActual);
    }
    
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
    const estados = ['todos', 'activa', 'suspendida', 'trial'];
    estados.forEach(estado => {
        const btn = document.getElementById(`filtro-${estado}`);
        if (btn) {
            if (filtroActual === estado) {
                btn.classList.remove('bg-gray-200', 'bg-green-100', 'bg-red-100', 'bg-yellow-100');
                btn.classList.remove('text-gray-700', 'text-green-700', 'text-red-700', 'text-yellow-700');
                if (estado === 'todos') btn.classList.add('bg-gray-800', 'text-white');
                if (estado === 'activa') btn.classList.add('bg-green-600', 'text-white');
                if (estado === 'suspendida') btn.classList.add('bg-red-600', 'text-white');
                if (estado === 'trial') btn.classList.add('bg-yellow-600', 'text-white');
            } else {
                btn.classList.remove('bg-gray-800', 'bg-green-600', 'bg-red-600', 'bg-yellow-600', 'text-white');
                if (estado === 'todos') btn.classList.add('bg-gray-200', 'text-gray-700');
                if (estado === 'activa') btn.classList.add('bg-green-100', 'text-green-700');
                if (estado === 'suspendida') btn.classList.add('bg-red-100', 'text-red-700');
                if (estado === 'trial') btn.classList.add('bg-yellow-100', 'text-yellow-700');
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
        trial: negociosData.filter(n => n.estado_suscripcion === 'trial').length
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
            
            <!-- CONTADOR DE RESERVAS DIARIAS DESTACADO -->
            <div class="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg overflow-hidden">
                <div class="px-6 py-5">
                    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div class="flex items-center gap-3">
                            <div class="text-4xl md:text-5xl">📅</div>
                            <div>
                                <p class="text-purple-100 text-sm">RESERVAS REALIZADAS HOY</p>
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
                           placeholder="🔍 Buscar por nombre o teléfono..." 
                           class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-base"
                           oninput="buscarNegocio(this.value)"
                           autocomplete="off">
                </div>
                <p class="text-xs text-gray-400 mt-1">💡 Busca por nombre o cualquier parte del teléfono</p>
            </div>
            
            <!-- BOTONES DE ORDENAMIENTO -->
            <div class="mb-4 flex flex-wrap gap-3 items-center">
                <span class="text-sm text-gray-500 font-medium">Ordenar por:</span>
                <button id="order-reservas" onclick="cambiarOrden('reservas')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-purple-600 text-white">🏆 Más reservas</button>
                <button id="order-fecha" onclick="cambiarOrden('fecha')" class="order-btn px-4 py-2 rounded-lg text-sm transition bg-gray-200 text-gray-700">📅 Más recientes</button>
            </div>
            
            <div class="mb-6 flex flex-wrap gap-3 items-center justify-between">
                <button onclick="notificarATodos()" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm transition">📢 Notificar a TODOS</button>
                <span class="text-xs text-gray-500">💰 ${PRECIO_MENSUAL} CUP/mes | ⏱️ +${DIAS_POR_DEFECTO} días</span>
            </div>
            
            <div class="flex gap-2 flex-wrap mb-6 border-b pb-4">
                <button id="filtro-todos" onclick="filtrarPorEstado('todos')" class="px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-white">📋 Todos (${totalPorEstado.todos})</button>
                <button id="filtro-activa" onclick="filtrarPorEstado('activa')" class="px-3 py-1.5 rounded-lg text-sm bg-green-100 text-green-700">🟢 Activos (${totalPorEstado.activa})</button>
                <button id="filtro-suspendida" onclick="filtrarPorEstado('suspendida')" class="px-3 py-1.5 rounded-lg text-sm bg-red-100 text-red-700">🔴 Suspendidos (${totalPorEstado.suspendida})</button>
                <button id="filtro-trial" onclick="filtrarPorEstado('trial')" class="px-3 py-1.5 rounded-lg text-sm bg-yellow-100 text-yellow-700">🟡 Prueba (${totalPorEstado.trial})</button>
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
    
    negocios.forEach(n => {
        const fechaProximo = n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido';
        const fechaUltimo = n.fecha_ultimo_pago ? new Date(n.fecha_ultimo_pago).toLocaleDateString() : 'No registrado';
        const diasRestantes = n.dias_para_renovar || 0;
        const reservasHoy = getReservasDiariasPorNegocio(n.id);
        
        const estadoConfig = {
            'activa': { color: 'border-green-500', text: '🟢 Activo', bg: 'bg-green-100 text-green-700' },
            'suspendida': { color: 'border-red-500', text: '🔴 Suspendido', bg: 'bg-red-100 text-red-700' },
            'trial': { color: 'border-yellow-500', text: '🟡 Prueba', bg: 'bg-yellow-100 text-yellow-700' },
            'inactiva': { color: 'border-gray-500', text: '⚫ Inactivo', bg: 'bg-gray-100 text-gray-700' }
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
        const esTopReservas = ordenActual === 'reservas' && negocios.indexOf(n) < 3 && Number(n.reservas_mes) > 0;
        const medallaTop = esTopReservas ? (negocios.indexOf(n) === 0 ? '🥇 ' : (negocios.indexOf(n) === 1 ? '🥈 ' : '🥉 ')) : '';
        
        html += `
            <div class="bg-white rounded-lg shadow border-l-4 ${ec.color} p-4 fade-in flex flex-col">
                <div class="flex flex-col md:flex-row justify-between items-start gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 class="font-bold text-lg">${medallaTop}🏢 ${nombreMostrado}</h2>
                            <span class="px-2 py-1 rounded-full text-xs ${ec.bg} font-medium">${ec.text}</span>
                            ${reservasHoy > 0 ? `<span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">📅 +${reservasHoy} hoy</span>` : ''}
                        </div>
                        <p class="text-sm text-gray-600">📧 ${n.email || 'No registrado'}</p>
                        <p class="text-sm text-gray-600">📱 ${telefonoMostrado}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm border-t pt-3">
                    <div class="text-center">
                        <div class="text-gray-500 text-xs">📊 Reservas (mes)</div>
                        <div class="font-bold text-lg ${Number(n.reservas_mes) > 0 ? 'text-purple-600' : 'text-gray-400'}">${n.reservas_mes || 0}</div>
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
                </div>
                
                <div class="flex flex-col md:flex-row justify-between text-xs mt-3 text-gray-500 gap-2 pb-3 border-b">
                    <div>💳 Último pago: ${fechaUltimo}</div>
                    <div class="${diasRestantes <= 3 && n.estado_suscripcion === 'activa' ? 'text-red-600 font-bold' : ''}">⏰ Próximo pago: ${fechaProximo} ${diasRestantes > 0 ? `(faltan ${diasRestantes} días)` : diasRestantes < 0 ? '(VENCIDO)' : ''}</div>
                </div>

                <div class="mt-3 flex flex-wrap gap-2">
                    ${n.estado_suscripcion === 'trial' ? `<button onclick="window.activarDesdeTrial('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">✅ Activar</button>` : ''}
                    ${n.estado_suscripcion === 'suspendida' ? `<button onclick="window.reactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">▶️ Reactivar</button>` : ''}
                    ${n.estado_suscripcion === 'activa' ? `<button onclick="window.suspenderNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">⏸️ Suspender</button>` : ''}
                    
                    <button onclick="window.extenderFechaPago('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">📅 Extender</button>
                    <button onclick="window.enviarWhatsApp('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">💬 WhatsApp</button>
                    <button onclick="window.notificarNegocio(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">🔔 Notificar</button>
                    <button onclick="window.inactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition flex-1 md:flex-none text-center">🗑️ Baja</button>
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
window.notificarNegocio = notificarNegocio;
window.notificarATodos = notificarATodos;
window.exportarCSV = exportarCSV;
window.logout = logout;
window.cambiarOrden = cambiarOrden;

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