/**
 * Extrae el mensaje legible de un error del backend (NestJS + HttpExceptionFilter).
 *
 * El cuerpo trae { statusCode, message, error }: `error` es el nombre genérico del status
 * ("Bad Request"), así que se prioriza `message`. Con errores de validación, `message` llega
 * como arreglo: se muestra el primero.
 */
export function extractApiError(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const message = (body as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const first = message.find((m): m is string => typeof m === 'string' && m.trim() !== '');
    if (first) return first;
  }
  return undefined;
}
