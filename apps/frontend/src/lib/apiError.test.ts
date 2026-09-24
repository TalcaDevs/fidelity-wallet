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
});
