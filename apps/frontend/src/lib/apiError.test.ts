import { describe, it, expect } from 'vitest';
import { extractApiError } from './apiError';

describe('extractApiError', () => {
  it('prefers message over the generic error name', () => {
    expect(extractApiError({ statusCode: 400, message: 'Sellos insuficientes', error: 'Bad Request' })).toBe(
      'Sellos insuficientes',
    );
  });

  it('takes the first message of a validation array', () => {
    expect(extractApiError({ message: ['El teléfono es obligatorio', 'otro'] })).toBe('El teléfono es obligatorio');
  });

  it('returns undefined when there is nothing usable', () => {
    expect(extractApiError(null)).toBeUndefined();
    expect(extractApiError('texto')).toBeUndefined();
    expect(extractApiError({ error: 'Bad Request' })).toBeUndefined();
    expect(extractApiError({ message: [] })).toBeUndefined();
  });

  it('translates generic 429 and ThrottlerException messages to Spanish', () => {
    expect(extractApiError({ statusCode: 429, message: 'ThrottlerException: Too Many Requests' })).toBe(
      'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.',
    );
    expect(extractApiError({ message: 'ThrottlerException: Too Many Requests' })).toBe(
      'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.',
    );
    expect(extractApiError({ statusCode: 429, error: 'Too Many Requests' })).toBe(
      'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.',
    );
  });

  it('preserves specific business messages on 429 rate limit (e.g. ManualLookupLimiter)', () => {
    const businessLimitMsg =
      'Demasiadas búsquedas manuales seguidas. Espera un minuto o escanea el QR del cliente.';
    expect(extractApiError({ statusCode: 429, message: businessLimitMsg })).toBe(businessLimitMsg);
  });
});
