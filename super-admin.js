// ==================== CONFIGURACIÓN ====================
const PRECIO_MENSUAL = 1000;
const DIAS_POR_DEFECTO = 15;
const WHATSAPP_MENSAJE = "Hola, escribimos desde el soporte de Rservas.Roma para saber en qué podemos ayudarle";
const NTFY_TOPIC_GLOBAL = "rservas-vencimientos";
const ADMIN_EMAIL = "rservasroma@gmail.com";

let filtroActual = "todos";
let filtroBusqueda = "";
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
    if (!confirm(`⏸️ ¿Suspender ${nombreNegocio}?`)) return;
    
    try {
        await window.supabase
            .from('suscripciones')
            .update({ estado: 'suspendida' })
            .eq('negocio_id', id);
        alert('✅ Suspendido');
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function reactivarNegocio(id, nombreNegocio) {
    if (!confirm(`▶️ ¿Reactivar ${nombreNegocio}?`)) return;
    
    const nuevaFecha = calcularFechaMasDias(DIAS_POR_DEFECTO);
    
    try {
        await window.supabase
            .from('suscripciones')
            .update({ 
                estado: 'activa',
                fecha_renovacion: nuevaFecha,
                monto_ultimo_pago: PRECIO_MENSUAL,
                fecha_ultimo_pago: new Date().toISOString()
            })
            .eq('negocio_id', id);
        alert(`✅ Reactivado. Próximo pago: ${nuevaFecha}`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function inactivarNegocio(id, nombreNegocio) {
    if (!confirm(`⚠️ ¿Dar de baja DEFINITIVAMENTE a ${nombreNegocio}?`)) return;
    if (!confirm('Última oportunidad. ¿Seguro?')) return;
    
    try {
        await window.supabase
            .from('suscripciones')
            .update({ estado: 'inactiva' })
            .eq('negocio_id', id);
        alert('✅ Dado de baja');
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

async function extenderFechaPago(id, nombreNegocio) {
    const diasExtras = prompt(`📅 Extender pago de ${nombreNegocio}\n\nDías a extender:`, DIAS_POR_DEFECTO);
    if (!diasExtras) return;
    
    const diasNum = parseInt(diasExtras);
    if (isNaN(diasNum) || diasNum <= 0) {
        alert('Ingrese un número válido');
        return;
    }
    
    const nuevaFecha = calcularFechaMasDias(diasNum);
    const nuevoMonto = prompt(`💰 Monto del pago (CUP):`, PRECIO_MENSUAL);
    if (!nuevoMonto) return;
    
    const montoNum = parseFloat(nuevoMonto);
    if (isNaN(montoNum)) {
        alert('Monto inválido');
        return;
    }
    
    try {
        await window.supabase
            .from('suscripciones')
            .update({ 
                fecha_renovacion: nuevaFecha,
                monto_ultimo_pago: montoNum,
                fecha_ultimo_pago: new Date().toISOString()
            })
            .eq('negocio_id', id);
        alert(`✅ Actualizado: ${nuevaFecha} - ${montoNum} CUP`);
        location.reload();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

function enviarWhatsApp(telefono, nombreNegocio) {
    if (!telefono || telefono === 'No registrado') {
        alert(`${nombreNegocio} no tiene teléfono`);
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
    const mensaje = prompt(`Mensaje para ${negocio.nombre}:`, WHATSAPP_MENSAJE);
    if (!mensaje) return;
    
    const tema = negocio.ntfy_topic || NTFY_TOPIC_GLOBAL;
    
    try {
        const response = await fetch(`https://ntfy.sh/${tema}`, {
            method: 'POST',
            body: mensaje,
            headers: {
                'Title': `Mensaje para ${negocio.nombre}`,
                'Priority': 'default'
            }
        });
        
        alert(response.ok ? '✅ Enviado' : '❌ Error');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function notificarATodos() {
    const activos = negociosData.filter(n => n.estado_suscripcion === 'activa');
    
    if (activos.length === 0) {
        alert('No hay activos');
        return;
    }
    
    const mensaje = prompt(`Notificar a ${activos.length} negocios:`, 'Comunicado Rservas');
    if (!mensaje) return;
    
    let enviados = 0;
    for (const neg of activos) {
        const tema = neg.ntfy_topic || NTFY_TOPIC_GLOBAL;
        try {
            const response = await fetch(`https://ntfy.sh/${tema}`, {
                method: 'POST',
                body: mensaje,
                headers: { 'Title': 'Comunicado Rservas' }
            });
            if (response.ok) enviados++;
            await new Promise(r => setTimeout(r, 300));
        } catch(e) {}
    }
    alert(`✅ Enviados: ${enviados}/${activos.length}`);
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
    
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Estado', 'Reservas', 'Profesionales', 'Días', 'Próximo Pago', 'Monto'];
    const rows = resultados.map(n => [
        n.id, n.nombre, n.email || '', n.telefono || '',
        n.estado_suscripcion, n.reservas_mes || 0, n.profesionales_activas || 0,
        n.dias_activo || 0, n.proximo_pago || '', n.monto_ultimo_pago || PRECIO_MENSUAL
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `negocios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    alert(`📥 ${resultados.length} negocios exportados`);
}

// ==================== FILTROS ====================
function buscarNegocio(termino) {
    filtroBusqueda = termino.toLowerCase().trim();
    aplicarFiltros();
}

function limpiarBusqueda() {
    const buscador = document.getElementById('buscador');
    if (buscador) buscador.value = '';
    filtroBusqueda = '';
    aplicarFiltros();
}

function filtrarPorEstado(estado) {
    filtroActual = estado;
    aplicarFiltros();
}

function aplicarFiltros() {
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
    
    renderTabla(resultados);
}

// ==================== RENDERIZADO ====================
function renderTabla(negocios) {
    const stats = calcularEstadisticas(negocios);
    const totalPorEstado = {
        todos: negociosData.length,
        activa: negociosData.filter(n => n.estado_suscripcion === 'activa').length,
        suspendida: negociosData.filter(n => n.estado_suscripcion === 'suspendida').length,
        trial: negociosData.filter(n => n.estado_suscripcion === 'trial').length
    };
    
    let html = `
        <div class="max-w-7xl mx-auto p-4 md:p-6">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 class="text-2xl font-bold">👑 Super Admin Panel</h1>
                    <p class="text-gray-600 text-sm">Gestión de negocios Rservas</p>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <button onclick="exportarCSV()" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">📥 CSV</button>
                    <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">🔄 Actualizar</button>
                    <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm">🚪 Salir</button>
                </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <div class="bg-white p-3 rounded-lg shadow text-center"><div class="text-xl font-bold">${stats.total}</div><div class="text-gray-600 text-xs">Total</div></div>
                <div class="bg-white p-3 rounded-lg shadow text-center"><div class="text-xl font-bold text-green-600">${stats.activos}</div><div class="text-gray-600 text-xs">🟢 Activos</div></div>
                <div class="bg-white p-3 rounded-lg shadow text-center"><div class="text-xl font-bold text-red-600">${stats.suspendidos}</div><div class="text-gray-600 text-xs">🔴 Suspendidos</div></div>
                <div class="bg-white p-3 rounded-lg shadow text-center"><div class="text-xl font-bold text-yellow-600">${stats.trial}</div><div class="text-gray-600 text-xs">🟡 Prueba</div></div>
                <div class="bg-white p-3 rounded-lg shadow text-center"><div class="text-xl font-bold text-purple-600">${stats.reservasMes}</div><div class="text-gray-600 text-xs">📅 Reservas</div></div>
                <div class="bg-white p-3 rounded-lg shadow text-center"><div class="text-xl font-bold text-orange-600">${stats.porVencer}</div><div class="text-gray-600 text-xs">⚠️ Vencen 7d</div></div>
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
                           class="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-base"
                           oninput="buscarNegocio(this.value)"
                           autocomplete="off">
                    ${filtroBusqueda ? `<button onclick="limpiarBusqueda()" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">✖️</button>` : ''}
                </div>
                <p class="text-xs text-gray-400 mt-1">💡 Busca por nombre o cualquier parte del teléfono</p>
            </div>
            
            <div class="mb-6 flex flex-wrap gap-3 items-center">
                <button onclick="notificarATodos()" class="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm">📢 Notificar a TODOS</button>
                <span class="text-xs text-gray-500">💰 ${PRECIO_MENSUAL} CUP/mes | ⏱️ +${DIAS_POR_DEFECTO} días</span>
            </div>
            
            <div class="flex gap-2 flex-wrap mb-6 border-b pb-4">
                <button onclick="filtrarPorEstado('todos')" class="px-3 py-1.5 rounded-lg text-sm ${filtroActual === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-200'}">📋 Todos (${totalPorEstado.todos})</button>
                <button onclick="filtrarPorEstado('activa')" class="px-3 py-1.5 rounded-lg text-sm ${filtroActual === 'activa' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}">🟢 Activos (${totalPorEstado.activa})</button>
                <button onclick="filtrarPorEstado('suspendida')" class="px-3 py-1.5 rounded-lg text-sm ${filtroActual === 'suspendida' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}">🔴 Suspendidos (${totalPorEstado.suspendida})</button>
                <button onclick="filtrarPorEstado('trial')" class="px-3 py-1.5 rounded-lg text-sm ${filtroActual === 'trial' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700'}">🟡 Prueba (${totalPorEstado.trial})</button>
            </div>
            
            ${filtroBusqueda ? `<div class="mb-3 text-sm text-gray-500">🔍 Resultados: "${filtroBusqueda}" (${negocios.length})</div>` : ''}
            
            <div class="grid gap-4">
    `;
    
    if (negocios.length === 0) {
        html += `<div class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    <div class="text-4xl mb-2">🔍</div>
                    <p>No se encontraron negocios</p>
                    <button onclick="limpiarBusqueda()" class="mt-3 text-purple-600 underline">Limpiar búsqueda</button>
                </div>`;
    }
    
    negocios.forEach(n => {
        const fechaProximo = n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido';
        const fechaUltimo = n.fecha_ultimo_pago ? new Date(n.fecha_ultimo_pago).toLocaleDateString() : 'No registrado';
        const diasRestantes = n.dias_para_renovar || 0;
        
        const estadoConfig = {
            'activa': { color: 'border-green-500', text: '🟢 Activo', bg: 'bg-green-100 text-green-700' },
            'suspendida': { color: 'border-red-500', text: '🔴 Suspendido', bg: 'bg-red-100 text-red-700' },
            'trial': { color: 'border-yellow-500', text: '🟡 Prueba', bg: 'bg-yellow-100 text-yellow-700' }
        };
        const ec = estadoConfig[n.estado_suscripcion] || estadoConfig.activa;
        
        let nombreMostrado = n.nombre;
        let telefonoMostrado = n.telefono || 'No registrado';
        
        if (filtroBusqueda) {
            const regex = new RegExp(`(${filtroBusqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            nombreMostrado = nombreMostrado.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
            if (n.telefono) {
                telefonoMostrado = n.telefono.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
            }
        }
        
        html += `
            <div class="bg-white rounded-lg shadow border-l-4 ${ec.color} p-4">
                <div class="flex flex-col md:flex-row justify-between items-start gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 class="font-bold text-lg">🏢 ${nombreMostrado}</h2>
                            <span class="px-2 py-1 rounded-full text-xs ${ec.bg}">${ec.text}</span>
                        </div>
                        <p class="text-sm text-gray-600">📧 ${n.email || 'No registrado'}</p>
                        <p class="text-sm text-gray-600">📱 ${telefonoMostrado}</p>
                    </div>
                    <div class="relative">
                        <button onclick="toggleMenu('menu-${n.id}')" class="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm">⚙️ Acciones ▼</button>
                        <div id="menu-${n.id}" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-10 border overflow-hidden">
                            <div class="py-1">
                                ${n.estado_suscripcion === 'trial' ? `<button onclick="activarDesdeTrial('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-green-50 text-green-600 text-sm">✅ Activar (pasar a pago)</button>` : ''}
                                ${n.estado_suscripcion === 'suspendida' ? `<button onclick="reactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-green-50 text-green-600 text-sm">▶️ Reactivar</button>` : ''}
                                ${n.estado_suscripcion === 'activa' ? `<button onclick="suspenderNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600 text-sm">⏸️ Suspender</button>` : ''}
                                <button onclick="extenderFechaPago('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">📅 Extender pago</button>
                                <button onclick="enviarWhatsApp('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">💬 WhatsApp</button>
                                <button onclick="notificarNegocio(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">🔔 Notificar</button>
                                <hr class="my-1">
                                <button onclick="inactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm">🗑️ Dar de baja</button>
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
window.toggleMenu = toggleMenu;
window.logout = logout;

// Inicializar
async function init() {
    document.getElementById('app').innerHTML = `<div class="text-center p-8">Cargando...</div>`;
    const acceso = await verificarAcceso();
    if (!acceso) return;
    const negocios = await cargarNegocios();
    if (negocios.length === 0) {
        document.getElementById('app').innerHTML = `<div class="text-center p-8 text-red-600">Error al cargar negocios</div>`;
        return;
    }
    negociosData = negocios;
    renderTabla(negocios);
}

init();