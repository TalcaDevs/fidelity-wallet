import { useId, useState } from 'react';
import {
  PHONE_PREFIX,
  formatPhoneLocal,
  formatRutInput,
  isValidPhoneLocal,
  phoneLocalDigits,
  rutLength,
  toFullPhone,
  validateRUT,
} from '../../utils/validators';

export type IdentifierKind = 'rut' | 'phone';

/** Valor de un campo: listo para enviar, o vacío si todavía no es válido. */
export interface FieldValue {
  /** RUT "12.345.678-5" o teléfono "+56912345678". Vacío si no es válido. */
  value: string;
  isValid: boolean;
}

export interface IdentifierValue extends FieldValue {
  kind: IdentifierKind;
}

type Variant = 'light' | 'dark';

interface FieldProps {
  onChange: (field: FieldValue) => void;
  /** Fuerza a mostrar el error aunque el usuario no haya terminado de escribir (p. ej. al enviar). */
  showErrors?: boolean;
  variant?: Variant;
  autoFocus?: boolean;
  /** Etiqueta visible. Sin ella, la etiqueta queda solo para lectores de pantalla. */
  label?: string;
}

const STYLES = {
  light: {
    tabs: 'bg-slate-100',
    tabActive: 'bg-white text-slate-900 shadow-sm',
    tabIdle: 'text-slate-500 hover:text-slate-700',
    label: 'text-slate-700',
    field:
      'bg-white border-2 border-slate-300 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 text-slate-900',
    fieldError: 'border-red-400',
    prefix: 'text-slate-500 border-slate-200',
    placeholder: 'placeholder:text-slate-400',
    error: 'text-red-500',
  },
  dark: {
    tabs: 'bg-slate-800',
    tabActive: 'bg-slate-600 text-white shadow-sm',
    tabIdle: 'text-slate-400 hover:text-white',
    label: 'text-slate-300',
    field: 'bg-slate-800 border-2 border-slate-700 focus-within:border-blue-500 text-white',
    fieldError: 'border-red-500',
    prefix: 'text-slate-400 border-slate-600',
    placeholder: 'placeholder:text-slate-500',
    error: 'text-red-400',
  },
} as const;

/** Error a mostrar, o null. Solo se queja cuando el dato ya está completo o si se pide explícitamente. */
function rutError(display: string, force: boolean): string | null {
  if (validateRUT(display)) return null;
  const len = rutLength(display);
  if (len === 0) return force ? 'Ingresa tu RUT' : null;
  if (len >= 9 || force) {
    return len < 8 ? 'El RUT está incompleto' : 'RUT inválido: revisa el dígito verificador';
  }
  return null;
}

function phoneError(digits: string, force: boolean): string | null {
  if (digits.length > 0 && !digits.startsWith('9')) return 'El celular debe comenzar con 9';
  if (isValidPhoneLocal(digits)) return null;
  if (digits.length === 0) return force ? 'Ingresa tu teléfono' : null;
  return force ? 'El teléfono debe tener 9 dígitos (9 XXXX XXXX)' : null;
}

interface ShellProps {
  label?: string;
  srLabel: string;
  variant: Variant;
  prefix?: string;
  error: string | null;
  input: (ids: { id: string; describedBy?: string }) => React.ReactNode;
}

function FieldShell({ label, srLabel, variant, prefix, error, input }: ShellProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const s = STYLES[variant];

  return (
    <div>
      <label htmlFor={id} className={label ? `block text-sm font-bold mb-2 px-1 ${s.label}` : 'sr-only'}>
        {label ?? srLabel}
      </label>
      <div className={`flex items-center rounded-2xl transition-all shadow-sm ${s.field} ${error ? s.fieldError : ''}`}>
        {prefix && (
          <span className={`pl-5 pr-3 py-4 text-lg font-bold border-r select-none ${s.prefix}`} aria-hidden="true">
            {prefix}
          </span>
        )}
        {input({ id, describedBy: error ? errorId : undefined })}
      </div>
      {error && (
        <p id={errorId} role="alert" className={`text-sm font-bold mt-2 px-1 ${s.error}`}>
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (variant: Variant) =>
  `w-full min-w-0 bg-transparent px-5 py-4 text-lg font-medium outline-none ${STYLES[variant].placeholder}`;

/** RUT con autoformato "12.345.678-5" y validación de módulo 11. */
export function RutField({ onChange, showErrors = false, variant = 'light', autoFocus = false, label }: FieldProps) {
  const [display, setDisplay] = useState('');
  const [touched, setTouched] = useState(false);
  const error = rutError(display, showErrors || touched);

  return (
    <FieldShell
      label={label}
      srLabel="RUT"
      variant={variant}
      error={error}
      input={({ id, describedBy }) => (
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoFocus={autoFocus}
          value={display}
          onChange={(e) => {
            const next = formatRutInput(e.target.value);
            setDisplay(next);
            const isValid = validateRUT(next);
            onChange({ value: isValid ? next : '', isValid });
          }}
          onBlur={() => display && setTouched(true)}
          placeholder="12.345.678-9"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={inputClass(variant)}
        />
      )}
    />
  );
}

/** Celular chileno: el +56 es fijo y el usuario escribe solo los 9 dígitos. */
export function PhoneField({ onChange, showErrors = false, variant = 'light', autoFocus = false, label }: FieldProps) {
  const [digits, setDigits] = useState('');
  const [touched, setTouched] = useState(false);
  const error = phoneError(digits, showErrors || touched);

  return (
    <FieldShell
      label={label}
      srLabel="Teléfono celular"
      variant={variant}
      prefix={PHONE_PREFIX}
      error={error}
      input={({ id, describedBy }) => (
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={formatPhoneLocal(digits)}
          onChange={(e) => {
            const next = phoneLocalDigits(e.target.value);
            setDigits(next);
            const isValid = isValidPhoneLocal(next);
            onChange({ value: isValid ? toFullPhone(next) : '', isValid });
          }}
          onBlur={() => digits && setTouched(true)}
          placeholder="9 1234 5678"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={inputClass(variant)}
        />
      )}
    />
  );
}

const KIND_LABEL: Record<IdentifierKind, string> = { rut: 'RUT', phone: 'Teléfono' };

interface IdentifierInputProps extends Omit<FieldProps, 'onChange' | 'label'> {
  onChange: (identifier: IdentifierValue) => void;
}

/**
 * Selector RUT / Teléfono para buscar a un cliente por cualquiera de los dos
 * (ingreso manual del escáner). El alta del cliente usa RutField + PhoneField juntos.
 */
export function IdentifierInput({ onChange, variant = 'light', ...fieldProps }: IdentifierInputProps) {
  const [kind, setKind] = useState<IdentifierKind>('rut');
  const s = STYLES[variant];

  const handleKind = (next: IdentifierKind) => {
    if (next === kind) return;
    setKind(next);
    onChange({ kind: next, value: '', isValid: false });
  };

  const Field = kind === 'rut' ? RutField : PhoneField;

  return (
    <div>
      <div role="radiogroup" aria-label="Tipo de identificación" className={`grid grid-cols-2 gap-1 p-1 rounded-2xl mb-3 ${s.tabs}`}>
        {(['rut', 'phone'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => handleKind(k)}
            className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${kind === k ? s.tabActive : s.tabIdle}`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      {/* key: al cambiar de tipo el campo se monta de nuevo, vacío y sin errores previos */}
      <Field key={kind} variant={variant} {...fieldProps} onChange={(f) => onChange({ kind, ...f })} />
    </div>
  );
}
