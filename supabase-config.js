// supabase-config.js
const SUPABASE_URL = 'https://zorhclhvykikaachfrmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmhjbGh2eWtpa2FhY2hmcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDQzMzUsImV4cCI6MjA4NzcyMDMzNX0.reauF3UfNTFJFZ3Mnzf8ctYH1d5p7C3msi7AvYJUaos';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// Crear y asignar el cliente de Supabase
window.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// El panel ya no lanza workflows de GitHub: se borra el token que quedo
// guardado, para que nada en esta pagina pueda leerlo.
try { localStorage.removeItem('gh_token_superadmin'); } catch (e) {}

console.log('✅ Configuración de Supabase cargada correctamente');
