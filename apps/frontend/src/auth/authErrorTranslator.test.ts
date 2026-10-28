import { describe, it, expect } from 'vitest';
import { translateAuthError } from './authErrorTranslator';

describe('translateAuthError', () => {
  it('translates "Signups not allowed for this instance" clearly', () => {
    const result = translateAuthError({ message: 'Signups not allowed for this instance' });
    expect(result).toContain('El registro de nuevas cuentas está momentáneamente restringido');
  });

  it('translates invalid credentials', () => {
    const result = translateAuthError('Invalid login credentials');
    expect(result).toBe('El correo o la contraseña ingresados son incorrectos. Por favor, verifica tus datos.');
  });

  it('translates already registered user', () => {
    const result = translateAuthError({ message: 'User already registered' });
    expect(result).toContain('Ya existe una cuenta con este correo electrónico');
  });

  it('translates unconfirmed email', () => {
    const result = translateAuthError({ message: 'Email not confirmed' });
    expect(result).toContain('Tu correo electrónico aún no ha sido confirmado');
  });

  it('translates rate limit error', () => {
    const result = translateAuthError({ message: 'over email send rate limit' });
    expect(result).toContain('Demasiados intentos seguidos');
  });

  it('translates network or connection failure', () => {
    const result = translateAuthError(new Error('Failed to fetch'));
    expect(result).toContain('No pudimos conectar con el servidor');
  });

  it('falls back to friendly message for null, empty or unknown technical errors', () => {
    expect(translateAuthError(null)).toBe('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
    expect(translateAuthError('')).toBe('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
    expect(translateAuthError({ message: 'internal server failure 500' })).toBe(
      'Ocurrió un problema temporal al procesar tu solicitud. Por favor, intenta nuevamente en unos momentos.'
    );
  });
});
