export function apiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // Ensure we don't have double slashes if path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Remove trailing slash from baseUrl if exists
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBaseUrl}${cleanPath}`;
}

import { supabase } from './supabase';

export async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'No hay sesión activa' }), { status: 401 });
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  const config = { ...init, headers };
  
  let response = await fetch(apiUrl(path), config);
  
  if (!response.ok && response.status === 401) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData.session) {
      headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
      response = await fetch(apiUrl(path), { ...config, headers });
    }
  }
  
  return response;
}
