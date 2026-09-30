import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiUrl, authenticatedFetch } from './api';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    }
  }
}));

describe('api', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('apiUrl', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('in dev without VITE_API_URL, uses the same origin so the Vite proxy forwards /api', () => {
      vi.stubEnv('VITE_API_URL', '');
      expect(apiUrl('/api/scan')).toBe(`${window.location.origin}/api/scan`);
    });

    it('with VITE_API_URL, prefixes it without doubling slashes', () => {
      vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
      expect(apiUrl('/api/brands/b1/staff')).toBe('https://api.example.com/api/brands/b1/staff');
      expect(apiUrl('api/scan')).toBe('https://api.example.com/api/scan');
    });
  });

  describe('authenticatedFetch', () => {
    it('returns 401 JSON if no session is active', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null }, error: null } as any);
      
      const response = await authenticatedFetch('/test-route');
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('No hay sesión activa');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('injects Authorization header if session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ 
        data: { session: { access_token: 'token123' } }, error: null 
      } as any);
      
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }));
      
      await authenticatedFetch('/test-route');
      
      expect(globalThis.fetch).toHaveBeenCalledWith(
        apiUrl('/test-route'),
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      );
      
      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer token123');
    });

    it('retries with new token if first request returns 401', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ 
        data: { session: { access_token: 'old-token' } }, error: null 
      } as any);
      
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response('ok', { status: 200 }));
      
      vi.mocked(supabase.auth.refreshSession).mockResolvedValueOnce({
        data: { session: { access_token: 'new-token' } }, error: null
      } as any);
      
      await authenticatedFetch('/test-route');
      
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(supabase.auth.refreshSession).toHaveBeenCalled();
      
      const secondCall = vi.mocked(globalThis.fetch).mock.calls[1];
      const headers = secondCall[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer new-token');
    });
  });
});
