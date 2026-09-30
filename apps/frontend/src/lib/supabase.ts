import { createClient } from '@supabase/supabase-js';

// Usar el origin actual permite acceder por localhost o IP local (192.168.x.x) sin romper CORS
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
