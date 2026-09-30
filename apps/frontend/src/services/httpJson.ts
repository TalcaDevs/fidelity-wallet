import { authenticatedFetch } from '../lib/api';
import { extractApiError } from '../lib/apiError';

/** Llama a la API con la sesión y lanza con el mensaje del backend si la respuesta no es 2xx. */
export async function requestJson<T>(
  path: string,
  init: RequestInit | undefined,
  fallbackMessage: string,
): Promise<T> {
  const res = await authenticatedFetch(path, init);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new Error(extractApiError(body) ?? fallbackMessage);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function jsonBody(body: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
