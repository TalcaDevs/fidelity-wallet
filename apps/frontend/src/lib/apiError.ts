/**
 * Extrae el mensaje legible de un error del backend (NestJS + HttpExceptionFilter).
 *
 * El cuerpo trae { statusCode, message, error }: `error` es el nombre genérico del status
 * ("Bad Request"), así que se prioriza `message`. Con errores de validación, `message` llega
 * como arreglo: se muestra el primero.
 */
export function extractApiError(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as { message?: unknown; statusCode?: unknown; error?: unknown };
  if (b.statusCode === 429) {
    return 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
  }
  const message = b.message;
  if (typeof message === 'string' && message.trim()) {
    if (message.includes('Too Many Requests') || message.includes('ThrottlerException')) {
      return 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
    }
    return message;
  }
  if (Array.isArray(message)) {
    const first = message.find((m): m is string => typeof m === 'string' && m.trim() !== '');
    if (first) return first;
  }
  return undefined;
}
