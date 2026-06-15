#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zorhclhvykikaachfrmp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmhjbGh2eWtpa2FhY2hmcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDQzMzUsImV4cCI6MjA4NzcyMDMzNX0.reauF3UfNTFJFZ3Mnzf8ctYH1d5p7C3msi7AvYJUaos';
const NTFY_TOPIC_GLOBAL = process.env.NTFY_TOPIC_GLOBAL || 'rservas-vencimientos';

const args = process.argv.slice(2);
const hasArg = (name) => args.includes(name);
const getArg = (name, fallback) => {
    const index = args.indexOf(name);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

function getCubaDateParts(offsetDays = 0) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Havana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(part => [part.type, part.value]));
    const base = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
    base.setUTCDate(base.getUTCDate() + offsetDays);

    return {
        year: base.getUTCFullYear(),
        month: String(base.getUTCMonth() + 1).padStart(2, '0'),
        day: String(base.getUTCDate()).padStart(2, '0'),
        date: `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`,
        weekday: base.getUTCDay()
    };
}

function getFechaLegible(parts) {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dia = dias[parts.weekday];
    return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${Number(parts.day)} de ${meses[Number(parts.month) - 1]} de ${parts.year}`;
}

function formatTo12Hour(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    hour12 = hour12 === 0 ? 12 : hour12;
    return `${hour12}:${String(minutes || 0).padStart(2, '0')} ${period}`;
}

async function supabaseGet(path, params = {}) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = await fetch(url, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Supabase ${path} ${response.status}: ${text}`);
    }
    return text ? JSON.parse(text) : [];
}

async function enviarNtfy(topic, title, body) {
    const response = await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        body,
        headers: {
            Title: title.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, ' ').trim(),
            Priority: 'default',
            Tags: 'bell'
        }
    });

    if (!response.ok) {
        throw new Error(`ntfy ${topic} ${response.status}: ${await response.text()}`);
    }
}

async function main() {
    const target = getArg('--target', hasArg('--today') ? 'today' : 'tomorrow');
    const dryRun = hasArg('--dry-run');
    const offsetDays = target === 'today' ? 0 : 1;
    const etiquetaDia = target === 'today' ? 'hoy' : 'manana';
    const fecha = getCubaDateParts(offsetDays);
    const fechaLegible = getFechaLegible(fecha);

    console.log(`Buscando turnos de ${etiquetaDia}: ${fecha.date}`);

    const [negociosBase, topicsData, turnos] = await Promise.all([
        supabaseGet('vista_negocios_admin', {
            select: 'id,nombre,estado_suscripcion'
        }),
        supabaseGet('negocios', {
            select: 'id,ntfy_topic'
        }),
        supabaseGet('reservas', {
            select: 'negocio_id,cliente_nombre,cliente_whatsapp,servicio,profesional_nombre,hora_inicio',
            fecha: `eq.${fecha.date}`,
            estado: 'eq.Reservado',
            order: 'hora_inicio.asc'
        })
    ]);

    const topicsById = Object.fromEntries(topicsData.map((item) => [item.id, item.ntfy_topic || '']));
    const negocios = negociosBase
        .map((negocio) => ({ ...negocio, ntfy_topic: topicsById[negocio.id] || '' }))
        .filter((negocio) => ['activa', 'trial'].includes(negocio.estado_suscripcion));

    if (!turnos.length) {
        console.log(`No hay turnos reservados para ${etiquetaDia}.`);
        return;
    }

    const turnosPorNegocio = turnos.reduce((acc, turno) => {
        if (!acc[turno.negocio_id]) acc[turno.negocio_id] = [];
        acc[turno.negocio_id].push(turno);
        return acc;
    }, {});

    const negociosConTurnos = negocios.filter(negocio => turnosPorNegocio[negocio.id]?.length);
    if (!negociosConTurnos.length) {
        console.log(`Hay turnos, pero ninguno pertenece a negocios activos o en prueba para ${etiquetaDia}.`);
        return;
    }

    let enviados = 0;
    let errores = 0;

    for (const negocio of negociosConTurnos) {
        const turnosNegocio = turnosPorNegocio[negocio.id].sort((a, b) => String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
        const topic = (negocio.ntfy_topic || NTFY_TOPIC_GLOBAL).trim();
        const porProfesional = {};
        const porServicio = {};

        turnosNegocio.forEach((turno) => {
            const profesional = turno.profesional_nombre || 'No asignado';
            const servicio = turno.servicio || 'No especificado';
            porProfesional[profesional] = (porProfesional[profesional] || 0) + 1;
            porServicio[servicio] = (porServicio[servicio] || 0) + 1;
        });

        let cuerpo = `*${negocio.nombre}*\n`;
        cuerpo += `${fechaLegible}\n`;
        cuerpo += `Total: ${turnosNegocio.length} turno${turnosNegocio.length !== 1 ? 's' : ''}\n`;
        cuerpo += `---------------------\n`;

        turnosNegocio.forEach((turno, index) => {
            const hora = formatTo12Hour(turno.hora_inicio);
            cuerpo += `${index + 1}. ${hora} | ${turno.cliente_nombre || 'Cliente'}\n`;
            cuerpo += `   ${turno.servicio || 'Servicio'} | ${turno.profesional_nombre || 'No asignado'}\n`;
            cuerpo += `   WhatsApp: ${turno.cliente_whatsapp || '---'}\n`;
            if (index < turnosNegocio.length - 1) cuerpo += `\n`;
        });

        cuerpo += `\n---------------------\nPor profesional:\n`;
        Object.entries(porProfesional).forEach(([nombre, total]) => {
            cuerpo += `- ${nombre}: ${total}\n`;
        });

        cuerpo += `\nPor servicio:\n`;
        Object.entries(porServicio).forEach(([nombre, total]) => {
            cuerpo += `- ${nombre}: ${total}\n`;
        });

        try {
            if (dryRun) {
                console.log(`[dry-run] ${negocio.nombre} -> ${topic}`);
            } else {
                await enviarNtfy(topic, `${negocio.nombre}: ${turnosNegocio.length} turnos para ${etiquetaDia}`, cuerpo);
                console.log(`Enviado: ${negocio.nombre} -> ${topic}`);
            }
            enviados++;
        } catch (error) {
            errores++;
            console.error(`Error enviando ${negocio.nombre}:`, error.message);
        }
    }

    console.log(`Proceso finalizado. Enviados: ${enviados}. Errores: ${errores}.`);
    if (errores > 0) process.exitCode = 1;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
