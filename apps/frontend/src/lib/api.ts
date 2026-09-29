export function apiUrl(path: string): string {
  let baseUrl = import.meta.env.VITE_API_URL;

  if (!baseUrl) {
    if (import.meta.env.DEV) {
      const hostname =
        typeof window !== 'undefined' && window.location.hostname
          ? window.location.hostname
          : 'localhost';
      baseUrl = `http://${hostname}:3000`;
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
