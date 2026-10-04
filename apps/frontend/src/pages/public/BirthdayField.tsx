import { useId, useState } from 'react';
import { isValidBirthday } from '@fidelity/shared';

export interface BirthdayValue {
  day?: number;
  month?: number;
  year?: number;
  /** Vacío también es válido: el cumpleaños es opcional. */
  isValid: boolean;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const selectClass =
  'w-full bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-2xl px-4 py-4 text-lg font-medium text-slate-900 outline-none';

function birthdayError(day: string, month: string, year: string): string | null {
  if (!day && !month && !year) return null;
  if (!day || !month) return 'Indica el día y el mes de tu cumpleaños';
  if (year && year.length !== 4) return 'El año debe tener 4 dígitos';
  const valid = isValidBirthday({ day: Number(day), month: Number(month), year: year ? Number(year) : null });
  return valid ? null : 'Esa fecha no existe';
}

/** Cumpleaños: día y mes, y el año solo si el cliente quiere darlo. Obligatorio si la marca lo pide. */
export function BirthdayField({
  onChange,
  showErrors,
  required = false,
}: {
  onChange: (value: BirthdayValue) => void;
  showErrors: boolean;
  required?: boolean;
}) {
  const id = useId();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const error = birthdayError(day, month, year) ?? (required && !day && !month ? 'Indica tu cumpleaños' : null);
  // Mientras escribe el año no se queja; sí al completar la fecha o al enviar.
  const complete = Boolean(day && month) && (year.length === 0 || year.length === 4);
  const visibleError = showErrors || complete ? error : null;

  const update = (next: { day?: string; month?: string; year?: string }) => {
    const d = next.day ?? day;
    const m = next.month ?? month;
    const y = next.year ?? year;
    setDay(d);
    setMonth(m);
    setYear(y);
    onChange({
      day: d ? Number(d) : undefined,
      month: m ? Number(m) : undefined,
      year: y ? Number(y) : undefined,
      isValid: birthdayError(d, m, y) === null && !(required && !d && !m),
    });
  };

  return (
    <fieldset aria-describedby={visibleError ? `${id}-error` : undefined}>
      <legend className="block text-sm font-bold mb-2 px-1 text-slate-700">
        Cumpleaños {!required && <span className="font-medium text-slate-400">(opcional)</span>}
      </legend>
      <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
        <label className="sr-only" htmlFor={`${id}-day`}>Día</label>
        <select id={`${id}-day`} value={day} onChange={(e) => update({ day: e.target.value })} className={selectClass}>
          <option value="">Día</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${id}-month`}>Mes</label>
        <select id={`${id}-month`} value={month} onChange={(e) => update({ month: e.target.value })} className={selectClass}>
          <option value="">Mes</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${id}-year`}>Año (opcional)</label>
        <input
          id={`${id}-year`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="Año"
          value={year}
          onChange={(e) => update({ year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          aria-invalid={Boolean(visibleError)}
          className={`${selectClass} placeholder:text-slate-400`}
        />
      </div>
      <p className="text-xs font-medium text-slate-500 mt-2 px-1">El año es opcional.</p>
      {visibleError && (
        <p id={`${id}-error`} role="alert" className="text-sm font-bold mt-1 px-1 text-red-500">{visibleError}</p>
      )}
    </fieldset>
  );
}
