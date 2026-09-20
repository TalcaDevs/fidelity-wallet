import { describe, it, expect } from 'vitest';
import { escapeCsvValue, toCsv } from './csv';

describe('escapeCsvValue', () => {
  it('deja pasar un valor simple sin tocarlo', () => {
    expect(escapeCsvValue('12345678-5')).toBe('12345678-5');
  });

  it('entrecomilla los valores con coma, comilla o salto de línea', () => {
    expect(escapeCsvValue('Café, 2 por 1')).toBe('"Café, 2 por 1"');
    expect(escapeCsvValue('Dijo "hola"')).toBe('"Dijo ""hola"""');
    expect(escapeCsvValue('linea1\nlinea2')).toBe('"linea1\nlinea2"');
  });

  it('neutraliza los valores que Excel interpretaría como fórmula', () => {
    expect(escapeCsvValue('=1+1')).toBe("'=1+1");
    expect(escapeCsvValue('+56912345678')).toBe("'+56912345678");
  });

  it('convierte null y undefined en celda vacía', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('arma la cabecera y una fila por elemento', () => {
    const csv = toCsv(
      [{ rut: '11111111-1', sellos: 3 }, { rut: null, sellos: 0 }],
      [
        { header: 'RUT', value: (row) => row.rut },
        { header: 'Sellos', value: (row) => row.sellos },
      ],
    );

    expect(csv).toBe('RUT,Sellos\r\n11111111-1,3\r\n,0');
  });
});
