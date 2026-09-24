import { describe, it, expect } from 'vitest';
import { reformatKeepingCaret } from './caret';
import { formatRutInput, formatPhoneLocal, phoneLocalDigits } from '../../utils/validators';

const rut = (raw: string, caret: number, previous: string, inputType?: string) =>
  reformatKeepingCaret({
    raw,
    caret,
    previous,
    inputType,
    format: formatRutInput,
    isSignificant: (ch) => /[0-9kK]/.test(ch),
  });

const phone = (raw: string, caret: number, previous: string, inputType?: string) =>
  reformatKeepingCaret({
    raw,
    caret,
    previous,
    inputType,
    format: (r) => formatPhoneLocal(phoneLocalDigits(r)),
    isSignificant: (ch) => /[0-9]/.test(ch),
  });

describe('reformatKeepingCaret', () => {
  it('keeps the caret at the end while typing normally', () => {
    expect(rut('12.345.6785', 11, '12.345.678')).toEqual({ value: '12.345.678-5', caret: 12 });
  });

  it('keeps the caret in place when editing in the middle of a RUT', () => {
    // "12.345.678-5" → el usuario borra el "3" (caret quedó después del "2.")
    const result = rut('12.45.678-5', 3, '12.345.678-5', 'deleteContentBackward');
    expect(result.value).toBe('1.245.678-5');
    // Quedan 2 significativos antes del cursor ("1","2"): el cursor va detrás del "2"
    expect(result.caret).toBe(3);
  });

  it('backspace over a separator deletes the digit before it instead of doing nothing', () => {
    // Cursor justo después del "-" en "12.345.678-5"; el backspace borra el "-"
    const result = rut('12.345.6785', 10, '12.345.678-5', 'deleteContentBackward');
    expect(result.value).toBe('1.234.567-5');
    expect(result.caret).toBe(9);
  });

  it('backspace over a phone space deletes the digit before it', () => {
    // "9 1234 5678" con el cursor después del primer espacio
    const result = phone('91234 5678', 1, '9 1234 5678', 'deleteContentBackward');
    expect(result.value).toBe('1 2345 678'); // se borró el "9" y se reagrupa 1-4-4
    expect(result.caret).toBe(0);
  });
});
