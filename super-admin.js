// ==================== CONFIGURACIÓN ====================
const PRECIO_MENSUAL = 1000; // CUP - Precio fijo mensual
const DIAS_POR_DEFECTO = 15; // Días para próximo pago (cambia a 30 si quieres)
const WHATSAPP_MENSAJE = "Hola, escribimos desde el soporte de Rservas.Roma para saber en qué podemos ayudarle";
const NTFY_TOPIC_GLOBAL = "rservas-vencimientos";
const ADMIN_EMAIL = "rservasroma@gmail.com"; // Email del super admin

// Estado actual del filtro
let filtroActual = "todos";
let negociosData = [];

// ==================== VERIFICAR ACCESO ====================
async function verificarAcceso() {
    const { data: { user } } = await window.supabase.auth.getUser();
    
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ==================== CARGAR NEGOCIOS ====================
async function cargarNegocios() {
    try {
        const { data, error } = await window.supabase
            .from('vista_negocios_admin')
            .select('*')
            .order('fecha_registro', { ascending: false });

        if (error) throw error;
        
        const unique = data.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
        );
        
        negociosData = unique;
        return unique;
    } catch (error) {
        console.error('Error cargando negocios:', error);
        return [];
    }
}

// ==================== ESTADÍSTICAS ====================
function calcularEstadisticas(negocios) {
    const total = negocios.length;
    const activos = negocios.filter(n => n.estado_suscripcion === 'activa').length;
    const suspendidos = negocios.filter(n => n.estado_suscripcion === 'suspendida').length;
    const trial = negocios.filter(n => n.estado_suscripcion === 'trial').length;
    
    const reservasMes = negocios.reduce((sum, n) => sum + (Number(n.reservas_mes) || 0), 0);
    
    const ingresos = negocios
        .filter(n => n.estado_suscripcion === 'activa')
        .reduce((sum, n) => sum + PRECIO_MENSUAL, 0);
    
    const porVencer = negocios.filter(n => {
        const dias = n.dias_para_renovar;
        return dias !== null && dias <= 7 && dias > 0 && n.estado_suscripcion === 'activa';
    }).length;
    
    return { total, activos, suspendidos, trial, reservasMes, ingresos, porVencer };
}

// ==================== FUNCIÓN PARA CALCULAR FECHA + DIAS ====================
function calcularFechaMasDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split('T')[0];
}

// ==================== ACCIONES CRUD ====================

// Cambiar de TRIAL a ACTIVO (agregado)
async function activarDesdeTrial(id, nombreNegocio) {
    if (!confirm(`✅ ¿Activar negocio?\n\nNegocio: ${nombreNegocio}\n\nPasará de "Período de prueba" a "ACTIVO".\n\nSe establecerá próximo pago en ${DIAS_POR_DEFECTO} días.`)) return;
    
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
        
        alert(`✅ Negocio activado correctamente\n\n📅 Próximo pago: ${nuevaFecha} (${DIAS_POR_DEFECTO} días)\n💰 Monto: ${PRECIO_MENSUAL} CUP`);
        location.reload();
    } catch (error) {
        alert('❌ Error al activar: ' + error.message);
    }
}

// Suspender negocio
async function suspenderNegocio(id, nombreNegocio) {
    if (!confirm(`⏸️ ¿Suspender este negocio?\n\nNegocio: ${nombreNegocio}\n\nNo podrá acceder al sistema hasta que se reactive manualmente.`)) return;
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ estado: 'suspendida' })
            .eq('negocio_id', id);
        
        if (error) throw error;
        
        alert('✅ Negocio suspendido correctamente');
        location.reload();
    } catch (error) {
        alert('❌ Error al suspender: ' + error.message);
    }
}

// Reactivar negocio (para suspendidos)
async function reactivarNegocio(id, nombreNegocio) {
    if (!confirm(`▶️ ¿Reactivar este negocio?\n\nNegocio: ${nombreNegocio}\n\nVolverá a tener acceso normal.\n\nSe establecerá próximo pago en ${DIAS_POR_DEFECTO} días.`)) return;
    
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
        
        alert(`✅ Negocio reactivado correctamente\n\n📅 Próximo pago: ${nuevaFecha} (${DIAS_POR_DEFECTO} días)\n💰 Monto: ${PRECIO_MENSUAL} CUP`);
        location.reload();
    } catch (error) {
        alert('❌ Error al reactivar: ' + error.message);
    }
}

// Dar de baja definitivo
async function inactivarNegocio(id, nombreNegocio) {
    if (!confirm(`⚠️ ¿DAR DE BAJA DEFINITIVAMENTE?\n\nNegocio: ${nombreNegocio}\n\nEsta acción NO se puede deshacer.\nEl negocio no podrá volver a activarse.`)) return;
    if (!confirm('Última oportunidad. ¿Estás 100% seguro de dar de baja este negocio?')) return;
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ estado: 'inactiva' })
            .eq('negocio_id', id);
        
        if (error) throw error;
        
        alert('✅ Negocio dado de baja correctamente');
        location.reload();
    } catch (error) {
        alert('❌ Error al dar de baja: ' + error.message);
    }
}

// Cambiar fecha de pago (ahora usa +días en lugar de fecha manual)
async function extenderFechaPago(id, nombreNegocio) {
    const diasExtras = prompt(`📅 EXTENDER FECHA DE PAGO\n\nNegocio: ${nombreNegocio}\n\nIngrese la cantidad de DÍAS a extender:\nEjemplo: 15, 30, 45\n\nValor actual sugerido: ${DIAS_POR_DEFECTO} días`, DIAS_POR_DEFECTO);
    if (!diasExtras) return;
    
    const diasNum = parseInt(diasExtras);
    if (isNaN(diasNum) || diasNum <= 0) {
        alert('❌ Ingrese un número de días válido (mayor a 0)');
        return;
    }
    
    const nuevaFecha = calcularFechaMasDias(diasNum);
    const nuevoMonto = prompt(`💰 MONTO DEL PAGO\n\nNegocio: ${nombreNegocio}\n\nIngrese el MONTO del pago (en CUP):\nPrecio actual: ${PRECIO_MENSUAL} CUP`, PRECIO_MENSUAL);
    if (!nuevoMonto) return;
    
    const montoNum = parseFloat(nuevoMonto);
    if (isNaN(montoNum)) {
        alert('❌ Monto inválido. Ingrese un número.');
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
        
        alert(`✅ Fecha extendida ${diasNum} días\n\n📅 Nueva fecha: ${nuevaFecha}\n💰 Monto: ${montoNum} CUP`);
        location.reload();
    } catch (error) {
        alert('❌ Error al actualizar: ' + error.message);
    }
}

// Enviar WhatsApp
function enviarWhatsApp(telefono, nombreNegocio) {
    if (!telefono || telefono === 'No registrado') {
        alert(`❌ El negocio "${nombreNegocio}" no tiene número de teléfono registrado.`);
        return;
    }
    
    let numeroLimpio = telefono.replace(/\D/g, '');
    if (!numeroLimpio.startsWith('53') && numeroLimpio.length === 8) {
        numeroLimpio = '53' + numeroLimpio;
    }
    
    const mensajeCodificado = encodeURIComponent(WHATSAPP_MENSAJE);
    window.open(`https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`, '_blank');
}

// Notificar individual
async function notificarNegocio(negocio) {
    const mensajePersonalizado = prompt(`🔔 NOTIFICACIÓN PARA: ${negocio.nombre}\n\nEscriba el mensaje que desea enviar:`, 
        `📢 MENSAJE DE RSERVAS\n\nEstimado(a) ${negocio.nombre},\n\n${WHATSAPP_MENSAJE}`);
    
    if (!mensajePersonalizado) return;
    
    const tema = negocio.ntfy_topic || NTFY_TOPIC_GLOBAL;
    
    try {
        const response = await fetch(`https://ntfy.sh/${tema}`, {
            method: 'POST',
            body: mensajePersonalizado,
            headers: {
                'Title': `📢 Mensaje para ${negocio.nombre}`,
                'Priority': 'default',
                'Tags': 'memo,chat'
            }
        });
        
        if (response.ok) {
            alert(`✅ Notificación enviada a ${negocio.nombre}`);
        } else {
            alert(`❌ Error al enviar notificación a ${negocio.nombre}`);
        }
    } catch (error) {
        alert('❌ Error de conexión: ' + error.message);
    }
}

// Notificar a todos
async function notificarATodos() {
    const negociosActivos = negociosData.filter(n => n.estado_suscripcion === 'activa');
    
    if (negociosActivos.length === 0) {
        alert('No hay negocios activos para notificar');
        return;
    }
    
    const mensaje = prompt(`📢 NOTIFICACIÓN MASIVA\n\nNegocios a notificar: ${negociosActivos.length}\n\nEscriba el mensaje para TODOS:`, 
        `📢 COMUNICADO RSERVAS\n\nEstimados clientes,\n\nRecordamos mantener sus datos actualizados.\n\nAtentamente,\nEquipo Rservas`);
    
    if (!mensaje) return;
    
    let enviados = 0;
    let errores = 0;
    
    for (const neg of negociosActivos) {
        const tema = neg.ntfy_topic || NTFY_TOPIC_GLOBAL;
        try {
            const response = await fetch(`https://ntfy.sh/${tema}`, {
                method: 'POST',
                body: mensaje,
                headers: {
                    'Title': `📢 Comunicado Rservas`,
                    'Priority': 'default',
                    'Tags': 'mega'
                }
            });
            
            if (response.ok) {
                enviados++;
            } else {
                errores++;
            }
        } catch (error) {
            errores++;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    alert(`✅ Enviados: ${enviados}\n❌ Errores: ${errores}`);
}

// Exportar CSV
async function exportarCSV() {
    const negocios = filtroActual === 'todos' ? negociosData : negociosData.filter(n => n.estado_suscripcion === filtroActual);
    
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Estado', 'Reservas Mes', 'Profesionales', 'Días Activo', 'Próximo Pago', 'Monto'];
    
    const rows = negocios.map(n => [
        n.id,
        n.nombre,
        n.email || 'No registrado',
        n.telefono || 'No registrado',
        n.estado_suscripcion === 'activa' ? 'Activo' : (n.estado_suscripcion === 'suspendida' ? 'Suspendido' : 'Prueba'),
        n.reservas_mes || 0,
        n.profesionales_activas || 0,
        n.dias_activo || 0,
        n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido',
        n.monto_ultimo_pago || PRECIO_MENSUAL
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `negocios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`📥 ${negocios.length} negocios exportados`);
}

// Filtros
function filtrarPorEstado(estado) {
    filtroActual = estado;
    let filtrados = estado === 'todos' ? negociosData : negociosData.filter(n => n.estado_suscripcion === estado);
    renderTabla(filtrados);
}

// ==================== RENDERIZADO PRINCIPAL ====================
function renderTabla(negocios) {
    const stats = calcularEstadisticas(negocios);
    
    let html = `
        <div class="max-w-7xl mx-auto p-6">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 class="text-2xl font-bold">👑 Super Admin Panel</h1>
                    <p class="text-gray-600 mt-1">Gestión completa de todos los negocios</p>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <button onclick="exportarCSV()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">📥 Exportar CSV</button>
                    <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">🔄 Actualizar</button>
                    <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">🚪 Cerrar sesión</button>
                </div>
            </div>
            
            <!-- Estadísticas -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg shadow text-center"><div class="text-2xl font-bold">${stats.total}</div><div class="text-gray-600 text-sm">Total</div></div>
                <div class="bg-white p-4 rounded-lg shadow text-center"><div class="text-2xl font-bold text-green-600">${stats.activos}</div><div class="text-gray-600 text-sm">🟢 Activos</div></div>
                <div class="bg-white p-4 rounded-lg shadow text-center"><div class="text-2xl font-bold text-red-600">${stats.suspendidos}</div><div class="text-gray-600 text-sm">🔴 Suspendidos</div></div>
                <div class="bg-white p-4 rounded-lg shadow text-center"><div class="text-2xl font-bold text-yellow-600">${stats.trial}</div><div class="text-gray-600 text-sm">🟡 Prueba</div></div>
                <div class="bg-white p-4 rounded-lg shadow text-center"><div class="text-2xl font-bold text-purple-600">${stats.reservasMes}</div><div class="text-gray-600 text-sm">📅 Reservas</div></div>
                <div class="bg-white p-4 rounded-lg shadow text-center"><div class="text-2xl font-bold text-orange-600">${stats.porVencer}</div><div class="text-gray-600 text-sm">⚠️ Vencen 7d</div></div>
            </div>
            
            <!-- Botones globales -->
            <div class="mb-6 flex flex-wrap gap-3 items-center">
                <button onclick="notificarATodos()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">📢 Notificar a TODOS</button>
                <span class="text-sm text-gray-500">💰 ${PRECIO_MENSUAL} CUP/mes | ⏱️ +${DIAS_POR_DEFECTO} días por defecto</span>
            </div>
            
            <!-- Filtros -->
            <div class="flex gap-2 flex-wrap mb-6 border-b pb-4">
                <button onclick="filtrarPorEstado('todos')" class="px-4 py-2 rounded-lg ${filtroActual === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-200'}">📋 Todos (${negociosData.length})</button>
                <button onclick="filtrarPorEstado('activa')" class="px-4 py-2 rounded-lg ${filtroActual === 'activa' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}">🟢 Activos (${negociosData.filter(n => n.estado_suscripcion === 'activa').length})</button>
                <button onclick="filtrarPorEstado('suspendida')" class="px-4 py-2 rounded-lg ${filtroActual === 'suspendida' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}">🔴 Suspendidos (${negociosData.filter(n => n.estado_suscripcion === 'suspendida').length})</button>
                <button onclick="filtrarPorEstado('trial')" class="px-4 py-2 rounded-lg ${filtroActual === 'trial' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700'}">🟡 Prueba (${negociosData.filter(n => n.estado_suscripcion === 'trial').length})</button>
            </div>
            
            <div class="grid gap-4">
    `;
    
    if (negocios.length === 0) {
        html += `<div class="bg-white rounded-lg shadow p-8 text-center text-gray-500">No hay negocios en esta categoría</div>`;
    }
    
    negocios.forEach(n => {
        const fechaProximo = n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido';
        const fechaUltimo = n.fecha_ultimo_pago ? new Date(n.fecha_ultimo_pago).toLocaleDateString() : 'No registrado';
        const diasRestantes = n.dias_para_renovar || 0;
        
        const estadoText = {
            'activa': '🟢 Activo',
            'suspendida': '🔴 Suspendido',
            'trial': '🟡 Período de prueba'
        };
        
        html += `
            <div class="bg-white rounded-lg shadow border-l-4 ${n.estado_suscripcion === 'activa' ? 'border-green-500' : n.estado_suscripcion === 'suspendida' ? 'border-red-500' : 'border-yellow-500'} p-4">
                <div class="flex flex-col md:flex-row justify-between items-start gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 class="font-bold text-lg">🏢 ${n.nombre}</h2>
                            <span class="px-2 py-1 rounded-full text-xs ${n.estado_suscripcion === 'activa' ? 'bg-green-100 text-green-700' : n.estado_suscripcion === 'suspendida' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">${estadoText[n.estado_suscripcion]}</span>
                        </div>
                        <p class="text-sm text-gray-600">📧 ${n.email || 'No registrado'}</p>
                        <p class="text-sm text-gray-600">📱 ${n.telefono || 'No registrado'}</p>
                    </div>
                    <div class="relative">
                        <button onclick="toggleMenu('menu-${n.id}')" class="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg">⚙️ Acciones ▼</button>
                        <div id="menu-${n.id}" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-10 border overflow-hidden">
                            <div class="py-1">
                                ${n.estado_suscripcion === 'trial' ? `
                                    <button onclick="activarDesdeTrial('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-green-50 text-green-600 text-sm">
                                        ✅ Activar (pasar a pago)
                                    </button>
                                ` : ''}
                                ${n.estado_suscripcion === 'suspendida' ? `
                                    <button onclick="reactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-green-50 text-green-600 text-sm">
                                        ▶️ Reactivar
                                    </button>
                                ` : ''}
                                ${n.estado_suscripcion === 'activa' ? `
                                    <button onclick="suspenderNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600 text-sm">
                                        ⏸️ Suspender
                                    </button>
                                ` : ''}
                                <button onclick="extenderFechaPago('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
                                    📅 + Extender pago (días)
                                </button>
                                <button onclick="enviarWhatsApp('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
                                    💬 WhatsApp
                                </button>
                                <button onclick="notificarNegocio(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
                                    🔔 Notificar ahora
                                </button>
                                <hr class="my-1">
                                <button onclick="inactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm">
                                    🗑️ Dar de baja
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm border-t pt-3">
                    <div class="text-center"><div class="text-gray-500 text-xs">📊 Reservas</div><div class="font-bold">${n.reservas_mes || 0}</div></div>
                    <div class="text-center"><div class="text-gray-500 text-xs">👥 Profesionales</div><div class="font-bold">${n.profesionales_activas || 0}</div></div>
                    <div class="text-center"><div class="text-gray-500 text-xs">📅 Antigüedad</div><div class="font-bold">${n.dias_activo || 0} d</div></div>
                    <div class="text-center"><div class="text-gray-500 text-xs">💰 Monto</div><div class="font-bold">${n.monto_ultimo_pago || PRECIO_MENSUAL} CUP</div></div>
                </div>
                
                <div class="flex justify-between text-xs mt-2 text-gray-500">
                    <div>💳 Último pago: ${fechaUltimo}</div>
                    <div class="${diasRestantes <= 3 && n.estado_suscripcion === 'activa' ? 'text-red-600 font-bold' : ''}">⏰ Próximo: ${fechaProximo} ${diasRestantes > 0 ? `(faltan ${diasRestantes} d)` : ''}</div>
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    document.getElementById('app').innerHTML = html;
}

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (menu) menu.classList.toggle('hidden');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('[onclick*="toggleMenu"]') && !e.target.closest('[id^="menu-"]')) {
        document.querySelectorAll('[id^="menu-"]').forEach(menu => menu.classList.add('hidden'));
    }
});

window.logout = async function() {
    if (confirm('¿Cerrar sesión?')) {
        await window.supabase.auth.signOut();
        window.location.href = 'login.html';
    }
};

// Exponer funciones
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
window.toggleMenu = toggleMenu;
window.logout = logout;

// Inicializar
async function init() {
    document.getElementById('app').innerHTML = `<div class="text-center p-8">Cargando...</div>`;
    const acceso = await verificarAcceso();
    if (!acceso) return;
    const negocios = await cargarNegocios();
    renderTabla(negocios);
}

init();