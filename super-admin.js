// ==================== CONFIGURACIÓN ====================
const PRECIO_MENSUAL = 1000; // CUP - Precio fijo mensual
const WHATSAPP_MENSAJE = "Hola, escribimos desde el soporte de Rservas.Roma para saber en qué podemos ayudarle";
const NTFY_TOPIC_GLOBAL = "rservas-vencimientos";
const ADMIN_EMAIL = "rservasroma@gmail.com"; // Email del super admin

// Estado actual del filtro
let filtroActual = "todos"; // todos, activa, suspendida, trial
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
        
        // Eliminar duplicados por ID
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

// ==================== ACCIONES CRUD ====================
async function suspenderNegocio(id) {
    if (!confirm('⏸️ ¿Suspender este negocio?\n\nNo podrá acceder al sistema hasta que se reactive manualmente.')) return;
    
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

async function reactivarNegocio(id) {
    if (!confirm('▶️ ¿Reactivar este negocio?\n\nVolverá a tener acceso normal al sistema.')) return;
    
    try {
        const { error } = await window.supabase
            .from('suscripciones')
            .update({ estado: 'activa' })
            .eq('negocio_id', id);
        
        if (error) throw error;
        
        alert('✅ Negocio reactivado correctamente');
        location.reload();
    } catch (error) {
        alert('❌ Error al reactivar: ' + error.message);
    }
}

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

async function cambiarFechaPago(id, fechaActual, nombreNegocio) {
    const nuevaFecha = prompt(`📅 CAMBIAR FECHA DE PAGO\n\nNegocio: ${nombreNegocio}\n\nIngrese la NUEVA fecha de próximo pago (formato: YYYY-MM-DD):\nEjemplo: 2026-05-15`, fechaActual);
    if (!nuevaFecha) return;
    
    // Validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
        alert('❌ Formato inválido. Use YYYY-MM-DD (ejemplo: 2026-05-15)');
        return;
    }
    
    const nuevoMonto = prompt(`💰 MONTO DEL PAGO\n\nNegocio: ${nombreNegocio}\n\nIngrese el MONTO del último pago (en CUP):\nPrecio actual sugerido: ${PRECIO_MENSUAL} CUP`, PRECIO_MENSUAL);
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
        
        alert(`✅ Fecha y monto actualizados\n\n📅 Nueva fecha: ${nuevaFecha}\n💰 Monto: ${montoNum} CUP`);
        location.reload();
    } catch (error) {
        alert('❌ Error al actualizar: ' + error.message);
    }
}

function enviarWhatsApp(telefono, nombreNegocio) {
    if (!telefono || telefono === 'No registrado') {
        alert(`❌ El negocio "${nombreNegocio}" no tiene número de teléfono registrado.\n\nNo se puede enviar WhatsApp.`);
        return;
    }
    
    // Limpiar número (solo dígitos)
    let numeroLimpio = telefono.replace(/\D/g, '');
    
    // Agregar código de Cuba si no tiene
    if (!numeroLimpio.startsWith('53') && numeroLimpio.length === 8) {
        numeroLimpio = '53' + numeroLimpio;
    }
    
    const mensajeCodificado = encodeURIComponent(WHATSAPP_MENSAJE);
    window.open(`https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`, '_blank');
}

async function notificarNegocio(negocio) {
    const mensajePersonalizado = prompt(`🔔 NOTIFICACIÓN PARA: ${negocio.nombre}\n\nEscriba el mensaje que desea enviar:`, 
        `📢 MENSAJE DE RSERVAS\n\nEstimado(a) ${negocio.nombre},\n\n${WHATSAPP_MENSAJE}\n\n---\nEste es un mensaje automático del panel de administración.`);
    
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

async function notificarATodos() {
    const negociosActivos = negociosData.filter(n => n.estado_suscripcion === 'activa');
    
    if (negociosActivos.length === 0) {
        alert('No hay negocios activos para notificar');
        return;
    }
    
    const mensaje = prompt(`📢 NOTIFICACIÓN MASIVA\n\nNegocios a notificar: ${negociosActivos.length}\n\nEscriba el mensaje que se enviará a TODOS los negocios activos:`, 
        `📢 COMUNICADO OFICIAL RSERVAS\n\nEstimados clientes,\n\nLes informamos que el sistema se encuentra en óptimas condiciones.\n\nRecordamos mantener sus datos actualizados para recibir nuestras comunicaciones.\n\nAtentamente,\nEquipo Rservas`);
    
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
                    'Tags': 'mega,notification'
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
        
        // Pequeña pausa para no saturar el servicio
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    alert(`✅ NOTIFICACIONES ENVIADAS\n\n📤 Enviados: ${enviados}\n❌ Errores: ${errores}\n📱 Total: ${negociosActivos.length}`);
}

async function exportarCSV() {
    const negocios = filtroActual === 'todos' ? negociosData : negociosData.filter(n => n.estado_suscripcion === filtroActual);
    
    const headers = [
        'ID', 
        'Nombre', 
        'Email', 
        'Teléfono', 
        'Estado', 
        'Plan', 
        'Reservas Mes', 
        'Profesionales', 
        'Días Activo', 
        'Fecha Registro',
        'Próximo Pago', 
        'Días para Renovar',
        'Último Pago', 
        'Monto (CUP)'
    ];
    
    const rows = negocios.map(n => [
        n.id,
        n.nombre,
        n.email || 'No registrado',
        n.telefono || 'No registrado',
        n.estado_suscripcion === 'activa' ? 'Activo' : (n.estado_suscripcion === 'suspendida' ? 'Suspendido' : 'Prueba'),
        n.plan_actual || 'Único',
        n.reservas_mes || 0,
        n.profesionales_activas || 0,
        n.dias_activo || 0,
        n.fecha_registro ? new Date(n.fecha_registro).toLocaleDateString() : 'No registrado',
        n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido',
        n.dias_para_renovar || 0,
        n.fecha_ultimo_pago ? new Date(n.fecha_ultimo_pago).toLocaleDateString() : 'No registrado',
        n.monto_ultimo_pago || PRECIO_MENSUAL
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `negocios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`📥 Exportación completada\n\n${negocios.length} negocios exportados`);
}

function filtrarPorEstado(estado) {
    filtroActual = estado;
    let filtrados;
    
    if (estado === 'todos') {
        filtrados = negociosData;
    } else {
        filtrados = negociosData.filter(n => n.estado_suscripcion === estado);
    }
    
    renderTabla(filtrados);
    actualizarBotonesFiltro(estado);
}

function actualizarBotonesFiltro(activo) {
    const buttons = document.querySelectorAll('.filtro-btn');
    buttons.forEach(btn => {
        const estado = btn.getAttribute('data-estado');
        if (estado === activo) {
            btn.classList.add('active-filter');
        } else {
            btn.classList.remove('active-filter');
        }
    });
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
                    <button onclick="exportarCSV()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                        📥 Exportar CSV
                    </button>
                    <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                        🔄 Actualizar
                    </button>
                    <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                        🚪 Cerrar sesión
                    </button>
                </div>
            </div>
            
            <!-- Tarjetas de Estadísticas -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-gray-800">${stats.total}</div>
                    <div class="text-gray-600 text-sm">Total Negocios</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-green-600">${stats.activos}</div>
                    <div class="text-gray-600 text-sm">🟢 Activos</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-red-600">${stats.suspendidos}</div>
                    <div class="text-gray-600 text-sm">🔴 Suspendidos</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-yellow-600">${stats.trial}</div>
                    <div class="text-gray-600 text-sm">🟡 Prueba</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-purple-600">${stats.reservasMes}</div>
                    <div class="text-gray-600 text-sm">📅 Reservas mes</div>
                </div>
                <div class="bg-white p-4 rounded-lg shadow text-center">
                    <div class="text-2xl font-bold text-orange-600">${stats.porVencer}</div>
                    <div class="text-gray-600 text-sm">⚠️ Vencen 7d</div>
                </div>
            </div>
            
            <!-- Botones de acción global -->
            <div class="mb-6 flex flex-wrap gap-3">
                <button onclick="notificarATodos()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                    📢 Notificar a TODOS los activos
                </button>
                <div class="text-sm text-gray-500 self-center">
                    💰 Precio mensual: ${PRECIO_MENSUAL} CUP
                </div>
            </div>
            
            <!-- Filtros -->
            <div class="flex gap-2 flex-wrap mb-6 border-b pb-4">
                <button data-estado="todos" onclick="filtrarPorEstado('todos')" class="filtro-btn px-4 py-2 rounded-lg transition ${filtroActual === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                    📋 Todos (${negociosData.length})
                </button>
                <button data-estado="activa" onclick="filtrarPorEstado('activa')" class="filtro-btn px-4 py-2 rounded-lg transition ${filtroActual === 'activa' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}">
                    🟢 Activos (${negociosData.filter(n => n.estado_suscripcion === 'activa').length})
                </button>
                <button data-estado="suspendida" onclick="filtrarPorEstado('suspendida')" class="filtro-btn px-4 py-2 rounded-lg transition ${filtroActual === 'suspendida' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}">
                    🔴 Suspendidos (${negociosData.filter(n => n.estado_suscripcion === 'suspendida').length})
                </button>
                <button data-estado="trial" onclick="filtrarPorEstado('trial')" class="filtro-btn px-4 py-2 rounded-lg transition ${filtroActual === 'trial' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}">
                    🟡 Prueba (${negociosData.filter(n => n.estado_suscripcion === 'trial').length})
                </button>
            </div>
            
            <!-- Lista de negocios -->
            <div class="grid gap-4">
    `;
    
    if (negocios.length === 0) {
        html += `
            <div class="bg-white rounded-lg shadow p-8 text-center">
                <div class="text-4xl mb-3">📭</div>
                <p class="text-gray-500">No hay negocios en esta categoría</p>
            </div>
        `;
    }
    
    negocios.forEach(n => {
        const fechaProximo = n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido';
        const fechaUltimo = n.fecha_ultimo_pago ? new Date(n.fecha_ultimo_pago).toLocaleDateString() : 'No registrado';
        const fechaRegistro = n.fecha_registro ? new Date(n.fecha_registro).toLocaleDateString() : 'No registrado';
        const diasRestantes = n.dias_para_renovar || 0;
        const alertaClase = diasRestantes <= 3 && n.estado_suscripcion === 'activa' ? 'border-red-400 bg-red-50' : '';
        
        const estadoConfig = {
            'activa': { color: 'bg-green-100 text-green-700', texto: '🟢 Activo' },
            'suspendida': { color: 'bg-red-100 text-red-700', texto: '🔴 Suspendido' },
            'trial': { color: 'bg-yellow-100 text-yellow-700', texto: '🟡 Período de prueba' }
        };
        const estadoStyle = estadoConfig[n.estado_suscripcion] || { color: 'bg-gray-100 text-gray-700', texto: n.estado_suscripcion };
        
        html += `
            <div class="bg-white rounded-lg shadow border-l-4 ${n.estado_suscripcion === 'activa' ? 'border-green-500' : n.estado_suscripcion === 'suspendida' ? 'border-red-500' : 'border-yellow-500'} ${alertaClase} p-4 fade-in">
                <div class="flex flex-col md:flex-row justify-between items-start gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 class="font-bold text-lg">🏢 ${n.nombre}</h2>
                            <span class="px-2 py-1 rounded-full text-xs ${estadoStyle.color}">${estadoStyle.texto}</span>
                            ${diasRestantes <= 3 && n.estado_suscripcion === 'activa' ? '<span class="px-2 py-1 rounded-full text-xs bg-red-200 text-red-700 animate-pulse">⚠️ Vence pronto</span>' : ''}
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <p class="text-gray-600">📧 ${n.email || 'No registrado'}</p>
                            <p class="text-gray-600">📱 ${n.telefono || 'No registrado'}</p>
                            <p class="text-xs text-gray-400">ID: ${n.id.substring(0, 8)}...</p>
                            <p class="text-xs text-gray-400">📅 Registro: ${fechaRegistro}</p>
                        </div>
                    </div>
                    <div class="relative">
                        <button onclick="toggleMenu('menu-${n.id}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg transition flex items-center gap-2">
                            ⚙️ Acciones
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        <div id="menu-${n.id}" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-10 border overflow-hidden">
                            <div class="py-1">
                                <button onclick="cambiarFechaPago('${n.id}', '${n.proximo_pago ? n.proximo_pago.split('T')[0] : ''}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm transition">
                                    📅 Cambiar fecha de pago
                                </button>
                                <button onclick="enviarWhatsApp('${n.telefono || ''}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm transition">
                                    💬 WhatsApp
                                </button>
                                <button onclick="notificarNegocio(${JSON.stringify(n).replace(/"/g, '&quot;')})" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm transition">
                                    🔔 Notificar ahora
                                </button>
                                <hr class="my-1 border-gray-200">
                        `;
        
        if (n.estado_suscripcion === 'activa') {
            html += `<button onclick="suspenderNegocio('${n.id}')" class="block w-full text-left px-4 py-2 hover:bg-orange-50 text-sm text-orange-600 transition">
                        ⏸️ Suspender (temporal)
                    </button>`;
        } else if (n.estado_suscripcion === 'suspendida') {
            html += `<button onclick="reactivarNegocio('${n.id}')" class="block w-full text-left px-4 py-2 hover:bg-green-50 text-sm text-green-600 transition">
                        ▶️ Reactivar
                    </button>`;
        }
        
        if (n.estado_suscripcion !== 'inactiva') {
            html += `<button onclick="inactivarNegocio('${n.id}', '${n.nombre.replace(/'/g, "\\'")}')" class="block w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 transition">
                        🗑️ Dar de baja (definitivo)
                    </button>`;
        }
        
        html += `
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Métricas -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm border-t pt-3">
                    <div class="bg-gray-50 rounded p-2 text-center">
                        <div class="text-gray-500 text-xs">📊 Reservas mes</div>
                        <div class="font-bold text-lg">${n.reservas_mes || 0}</div>
                    </div>
                    <div class="bg-gray-50 rounded p-2 text-center">
                        <div class="text-gray-500 text-xs">👥 Profesionales</div>
                        <div class="font-bold text-lg">${n.profesionales_activas || 0}</div>
                    </div>
                    <div class="bg-gray-50 rounded p-2 text-center">
                        <div class="text-gray-500 text-xs">📅 Antigüedad</div>
                        <div class="font-bold text-lg">${n.dias_activo || 0} d</div>
                    </div>
                    <div class="bg-gray-50 rounded p-2 text-center">
                        <div class="text-gray-500 text-xs">💰 Último pago</div>
                        <div class="font-bold text-lg">${n.monto_ultimo_pago || PRECIO_MENSUAL} CUP</div>
                    </div>
                </div>
                
                <!-- Fechas -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs">
                    <div class="text-gray-500">💳 Último pago: ${fechaUltimo}</div>
                    <div class="${diasRestantes <= 3 && n.estado_suscripcion === 'activa' ? 'text-red-600 font-bold' : 'text-gray-500'}">
                        ⏰ Próximo pago: ${fechaProximo} 
                        ${diasRestantes > 0 ? `(faltan ${diasRestantes} días)` : diasRestantes === 0 ? '(VENCE HOY)' : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    document.getElementById('app').innerHTML = html;
}

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (menu) {
        const isHidden = menu.classList.contains('hidden');
        // Cerrar todos los menús primero
        document.querySelectorAll('[id^="menu-"]').forEach(m => m.classList.add('hidden'));
        // Abrir el actual si estaba cerrado
        if (isHidden) {
            menu.classList.remove('hidden');
        }
    }
}

// Cerrar menús al hacer click fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('[onclick*="toggleMenu"]') && !e.target.closest('[id^="menu-"]')) {
        document.querySelectorAll('[id^="menu-"]').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});

// ==================== LOGOUT ====================
window.logout = async function() {
    if (confirm('¿Cerrar sesión?')) {
        await window.supabase.auth.signOut();
        window.location.href = 'login.html';
    }
};

// Exponer funciones globalmente
window.filtrarPorEstado = filtrarPorEstado;
window.cambiarFechaPago = cambiarFechaPago;
window.suspenderNegocio = suspenderNegocio;
window.reactivarNegocio = reactivarNegocio;
window.inactivarNegocio = inactivarNegocio;
window.enviarWhatsApp = enviarWhatsApp;
window.notificarNegocio = notificarNegocio;
window.notificarATodos = notificarATodos;
window.exportarCSV = exportarCSV;
window.toggleMenu = toggleMenu;
window.logout = logout;

// ==================== INICIALIZACIÓN ====================
async function init() {
    // Mostrar loading
    document.getElementById('app').innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="text-3xl mb-4">⏳</div>
                <p class="text-gray-600">Cargando panel de administración...</p>
            </div>
        </div>
    `;
    
    const acceso = await verificarAcceso();
    if (!acceso) return;
    
    const negocios = await cargarNegocios();
    if (negocios.length === 0) {
        document.getElementById('app').innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center bg-white rounded-lg shadow p-8">
                    <div class="text-4xl mb-3">⚠️</div>
                    <p class="text-gray-600">No se pudieron cargar los negocios.</p>
                    <p class="text-sm text-gray-400 mt-2">Verifica tu conexión a Supabase</p>
                    <button onclick="location.reload()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">Reintentar</button>
                </div>
            </div>
        `;
        return;
    }
    
    renderTabla(negocios);
}

// Iniciar
init();