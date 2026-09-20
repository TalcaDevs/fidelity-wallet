import { describe, it, expect } from 'vitest';
import { maskIdentifier } from './maskIdentifier';

describe('maskIdentifier', () => {
  it('muestra solo los últimos dígitos de un RUT', () => {
    expect(maskIdentifier('12345678-5')).toBe('···678-5');
  });

  it('muestra solo los últimos dígitos de un teléfono', () => {
    expect(maskIdentifier('+56912345678')).toBe('···45678');
  });

  it('devuelve null cuando no hay identificador', () => {
    expect(maskIdentifier(null)).toBeNull();
    expect(maskIdentifier(undefined)).toBeNull();
    expect(maskIdentifier('')).toBeNull();
  });

  it('no enmascara valores demasiado cortos para ocultar algo', () => {
    expect(maskIdentifier('12345')).toBe('12345');
  });
});
