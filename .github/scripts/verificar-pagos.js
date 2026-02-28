// .github/scripts/verificar-pagos.js
const { createClient } = require('@supabase/supabase-js');

// Configuración desde variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const ntfyTopic = process.env.NTFY_TOPIC || 'rservas-vencimientos';

// Verificar que tenemos las credenciales
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las credenciales de Supabase');
  process.exit(1);
}

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para formatear fecha en español
function formatearFecha(fecha) {
  if (!fecha) return 'No definido';
  const opciones = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  };
  return new Date(fecha).toLocaleDateString('es-AR', opciones);
}

// Función para obtener el nombre del plan en español
function getPlanEnEspanol(plan) {
  const planes = {
    'gratuito': 'Gratuito',
    'pro': 'Pro',
    'premium': 'Premium'
  };
  return planes[plan] || plan;
}

// Función principal
async function verificarVencimientos() {
  console.log('🔍 Verificando negocios que vencen mañana...');
  console.log('📅 Fecha actual:', new Date().toLocaleString('es-AR'));
  
  try {
    // Buscar negocios que vencen en 1 día
    const { data: negocios, error } = await supabase
      .from('vista_negocios_admin')
      .select('*')
      .eq('dias_para_renovar', 1);
      
    if (error) throw error;
    
    console.log(`📊 Encontrados: ${negocios.length} negocios`);
    
    if (negocios.length === 0) {
      console.log('✅ No hay negocios que venzan mañana');
      return;
    }
    
    // Enviar una notificación por cada negocio
    for (const neg of negocios) {
      await enviarNotificacion(neg);
      // Pequeña pausa para no saturar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  }
}

async function enviarNotificacion(negocio) {
  const fechaVencimiento = formatearFecha(negocio.proximo_pago);
  const planEspanol = getPlanEnEspanol(negocio.plan_actual);
  const monto = negocio.monto_ultimo_pago || 
                (negocio.plan_actual === 'premium' ? 79 : 
                 negocio.plan_actual === 'pro' ? 29 : 0);
  
  const mensaje = `
🔔 *PAGO PENDIENTE - MAÑANA*

🏢 *Negocio:* ${negocio.nombre}
📧 *Email:* ${negocio.email}
📱 *Teléfono:* ${negocio.telefono || 'No registrado'}
💳 *Plan:* ${planEspanol}
💰 *Monto:* $${monto}
📅 *Vence:* ${fechaVencimiento}
⏰ *Estado:* ${negocio.estado_suscripcion === 'trial' ? 'Período de prueba' : 'Activo'}

⚠️ *MAÑANA vence el pago de este negocio.*
`;

  console.log(`📤 Enviando notificación para: ${negocio.nombre}`);

  try {
    const response = await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      body: mensaje,
      headers: {
        'Title': `⚠️ VENCE MAÑANA: ${negocio.nombre}`,
        'Priority': 'high',
        'Tags': 'calendar,rotating_light,moneybag',
        'Click': 'https://tusalon.github.io/Rservas.SuperAdmin/'
      }
    });

    if (response.ok) {
      console.log(`✅ Notificación enviada para ${negocio.nombre}`);
    } else {
      console.error(`❌ Error enviando para ${negocio.nombre}: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Error de red para ${negocio.nombre}:`, error.message);
  }
}

// Ejecutar
verificarVencimientos();