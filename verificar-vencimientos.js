// verificar-vencimientos.js
// Script para ejecutar desde consola del navegador en el Super Admin Panel

async function verificarVencimientosManana() {
    console.log('🔍 Verificando negocios que vencen mañana...');
    
    try {
        // Calcular fecha de mañana
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        const mananaStr = manana.toISOString().split('T')[0];
        
        console.log('📅 Fecha de mañana:', mananaStr);
        
        // Buscar negocios que vencen mañana
        const { data: negocios, error } = await window.supabase
            .from('vista_negocios_admin')
            .select('*')
            .eq('dias_para_renovar', 1); // Los que vencen en 1 día
            
        if (error) throw error;
        
        console.log(`📊 Encontrados: ${negocios.length} negocios`);
        
        // Enviar notificaciones
        for (const neg of negocios) {
            const mensaje = crearMensaje(neg);
            await enviarNotificacion(neg, mensaje);
        }
        
        console.log('✅ Proceso completado');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

function crearMensaje(negocio) {
    const fechaVencimiento = new Date(negocio.proximo_pago).toLocaleDateString();
    
    return `
🔔 *PAGO PENDIENTE - MAÑANA*

🏢 *Negocio:* ${negocio.nombre}
📧 *Email:* ${negocio.email}
📱 *Teléfono:* ${negocio.telefono}
💳 *Plan:* ${negocio.plan_actual}
💰 *Monto:* $${negocio.monto_ultimo_pago || 'Pendiente'}
📅 *Vence:* ${fechaVencimiento}
⏰ *Días de aviso:* 1 día

⚠️ *Recordatorio:* Mañana vence el pago de este negocio.
`;
}

async function enviarNotificacion(negocio, mensaje) {
    const tema = 'rservas-vencimientos'; // Tema único para vencimientos
    
    const response = await fetch('https://ntfy.sh/' + tema, {
        method: 'POST',
        body: mensaje,
        headers: {
            'Title': `⚠️ Vence mañana: ${negocio.nombre}`,
            'Priority': 'high',
            'Tags': 'calendar,rotating_light'
        }
    });
    
    if (response.ok) {
        console.log(`✅ Notificación enviada para ${negocio.nombre}`);
    } else {
        console.error(`❌ Error enviando notificación para ${negocio.nombre}`);
    }
}

// Para ejecutar manualmente desde la consola:
// verificarVencimientosManana();