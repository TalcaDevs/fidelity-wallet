import { supabase } from './supabase';

export function apiUrl(path: string): string {
  let baseUrl = import.meta.env.VITE_API_URL;

  if (!baseUrl) {
    if (import.meta.env.DEV) {
      // Usar proxy de Vite
      baseUrl = typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://127.0.0.1:3000/api';
    } else {
      throw new Error('VITE_API_URL no está configurada para el entorno de producción.');
    }
  }

  // Ensure we don't have double slashes if path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Remove trailing slash from baseUrl if exists
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return `${cleanBaseUrl}${cleanPath}`;
}

let refreshSessionPromise: Promise<any> | null = null;

async function getOrRefreshSession() {
  if (!refreshSessionPromise) {
    refreshSessionPromise = supabase.auth.refreshSession().finally(() => {
      refreshSessionPromise = null;
    });
  }
  return refreshSessionPromise;
}

export async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'No hay sesión activa' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  const config = { ...init, headers };
  
  let response = await fetch(apiUrl(path), config);
  
  if (!response.ok && response.status === 401) {
    const { data: refreshData, error: refreshError } = await getOrRefreshSession();
    if (!refreshError && refreshData.session) {
      headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
      response = await fetch(apiUrl(path), { ...config, headers });
    }
  }
  
  return response;
}
