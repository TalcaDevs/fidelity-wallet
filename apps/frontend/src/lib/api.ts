export function apiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // Ensure we don't have double slashes if path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Remove trailing slash from baseUrl if exists
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBaseUrl}${cleanPath}`;
}
