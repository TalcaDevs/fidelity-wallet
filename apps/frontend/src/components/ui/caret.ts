/**
 * Reformateo de inputs controlados (RUT "12.345.678-5", teléfono "9 1234 5678") sin que el
 * cursor salte al final.
 *
 * El formato agrega separadores (puntos, guion, espacios) que el usuario no escribió. La
 * posición del cursor se conserva contando los caracteres "significativos" (dígitos y K) que
 * hay antes de él, y ubicándolo después del mismo número de significativos en el valor
 * formateado.
 *
 * Caso especial: borrar con backspace un separador no cambia el valor limpio, así que el
 * formato lo volvería a poner y la tecla "no haría nada". En ese caso se borra también el
 * significativo anterior, que es lo que el usuario espera.
 */
export interface Reformatted {
  value: string;
  caret: number;
}

const countSignificant = (text: string, isSignificant: (ch: string) => boolean) =>
  [...text].filter(isSignificant).length;

/** Posición en `formatted` justo después de su `n`-ésimo carácter significativo. */
const caretAfterSignificant = (
  formatted: string,
  n: number,
  isSignificant: (ch: string) => boolean,
) => {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (isSignificant(formatted[i]) && ++seen === n) return i + 1;
  }
  return formatted.length;
};

export function reformatKeepingCaret(params: {
  raw: string;
  caret: number;
  previous: string;
  inputType?: string;
  format: (raw: string) => string;
  isSignificant: (ch: string) => boolean;
}): Reformatted {
  const { previous, inputType, format, isSignificant } = params;
  let { raw, caret } = params;
  let before = countSignificant(raw.slice(0, caret), isSignificant);

  const onlySeparatorDeleted =
    inputType === 'deleteContentBackward' &&
    raw.length < previous.length &&
    countSignificant(raw, isSignificant) === countSignificant(previous, isSignificant);

  if (onlySeparatorDeleted && before > 0) {
    // Borrar el significativo que queda justo antes del cursor.
    let idx = caret - 1;
    while (idx >= 0 && !isSignificant(raw[idx])) idx--;
    if (idx >= 0) {
      raw = raw.slice(0, idx) + raw.slice(idx + 1);
      caret = idx;
      before -= 1;
    }
  }

  const value = format(raw);
  return { value, caret: caretAfterSignificant(value, before, isSignificant) };
}
