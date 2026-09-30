import { createClient } from '@supabase/supabase-js';

// Usar el origin actual permite acceder por localhost o IP local (192.168.x.x) sin romper CORS
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  if (import.meta.env.DEV) {
    supabaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:54321';
  } else {
    throw new Error('VITE_SUPABASE_URL no está configurada para el entorno de producción.');
  }
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
