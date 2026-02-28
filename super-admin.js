// super-admin.js - CON REDIRECCIÓN A LOGIN

async function verificarAcceso() {
    const { data: { user } } = await window.supabase.auth.getUser();
    
    // Si no hay usuario o no es el super admin, redirigir al login
    if (!user || user.email !== 'rservasroma@gmail.com') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

async function cargarNegocios() {
    const { data, error } = await window.supabase
        .from('vista_negocios_admin')
        .select('*')
        .order('fecha_registro', { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }
    
    // Eliminar duplicados
    return data.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
    );
}

function renderTabla(negocios) {
    let html = `
        <div class="max-w-7xl mx-auto p-6">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">👑 Super Admin</h1>
                <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                    Cerrar sesión
                </button>
            </div>
            <p class="text-gray-600 mb-6">${negocios.length} negocios</p>
            <div class="grid gap-4">
    `;
    
    negocios.forEach(n => {
        html += `
            <div class="bg-white p-4 rounded-lg shadow">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="font-bold text-lg">${n.nombre}</h2>
                        <p class="text-sm text-gray-600">${n.email}</p>
                        <p class="text-xs text-gray-400 mt-1">ID: ${n.id}</p>
                    </div>
                    <div class="flex gap-2">
                        <span class="px-2 py-1 rounded-full text-xs ${
                            n.estado_suscripcion === 'activa' ? 'bg-green-100 text-green-700' :
                            n.estado_suscripcion === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }">${n.estado_suscripcion}</span>
                        <span class="px-2 py-1 rounded-full text-xs ${
                            n.plan_actual === 'premium' ? 'bg-purple-100 text-purple-700' :
                            n.plan_actual === 'pro' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                        }">${n.plan_actual}</span>
                    </div>
                </div>
                <div class="grid grid-cols-4 gap-4 mt-3 text-sm">
                    <div><span class="text-gray-500">Teléfono:</span> ${n.telefono}</div>
                    <div><span class="text-gray-500">Registro:</span> ${new Date(n.fecha_registro).toLocaleDateString()}</div>
                    <div><span class="text-gray-500">Días activo:</span> ${n.dias_activo}</div>
                    <div><span class="text-gray-500">Profesionales:</span> ${n.profesionales_activas}</div>
                </div>
                <div class="mt-3 text-xs text-gray-400">
                    Próximo pago: ${n.proximo_pago ? new Date(n.proximo_pago).toLocaleDateString() : 'No definido'} 
                    (${n.dias_para_renovar || 0} días)
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    document.getElementById('app').innerHTML = html;
}

// Función de logout
window.logout = async function() {
    await window.supabase.auth.signOut();
    window.location.href = 'login.html';
};

async function init() {
    const acceso = await verificarAcceso();
    if (!acceso) return;
    
    const negocios = await cargarNegocios();
    renderTabla(negocios);
}

init();