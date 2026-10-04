import { useId, useRef, useState, type ReactNode } from 'react';
import { CARD_IMAGE_MAX_BYTES, CARD_IMAGE_MIME_TYPES, isHexColor } from '@fidelity/shared';

export const INPUT =
  'w-full px-4 py-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue text-slate-900 dark:text-slate-100 font-medium placeholder:text-slate-400';
export const LABEL = 'block text-sm font-bold text-slate-800 dark:text-slate-200';
export const HINT = 'text-xs text-slate-500 dark:text-slate-400 mt-1';
export const GHOST_BUTTON =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 transition-colors';

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0 border-b last:border-b-0 border-slate-200/70 dark:border-slate-700/60">
      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 mb-4">{description}</p>}
      <div className={description ? '' : 'mt-4'}>{children}</div>
    </section>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {label}
        </label>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-40 ${
          checked ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 ${
            value === option.value
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
      <button
        type="button"
        aria-label={`${label}: menos`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="w-10 h-11 text-xl font-bold text-slate-500 disabled:opacity-30"
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(clamp(digits ? Number(digits) : min));
        }}
        className="w-20 text-center bg-transparent font-extrabold text-lg text-slate-900 dark:text-white outline-none"
      />
      <button
        type="button"
        aria-label={`${label}: más`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="w-10 h-11 text-xl font-bold text-slate-500 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

/** Muestras de color más un selector libre. */
export function ColorSwatches({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string;
  value: string;
  swatches: readonly string[];
  onChange: (value: string) => void;
}) {
  const custom = !swatches.some((s) => s.toUpperCase() === value.toUpperCase());
  return (
    <div>
      <p className={`${LABEL} mb-2`}>{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
        {swatches.map((swatch) => {
          const selected = swatch.toUpperCase() === value.toUpperCase();
          return (
            <button
              key={swatch}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={swatch}
              onClick={() => onChange(swatch)}
              style={{ backgroundColor: swatch }}
              className={`w-10 h-10 rounded-xl border border-black/10 transition-transform ${
                selected ? 'ring-4 ring-brand-blue/40 scale-105' : 'hover:scale-105'
              }`}
            />
          );
        })}
        <label
          className={`relative w-10 h-10 rounded-xl cursor-pointer overflow-hidden border border-black/10 bg-[conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#8b5cf6,#f43f5e)] ${
            custom ? 'ring-4 ring-brand-blue/40' : ''
          }`}
          title="Otro color"
        >
          <span className="sr-only">Otro color para {label}</span>
          <input
            type="color"
            value={isHexColor(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {custom && (
            <span className="absolute inset-1.5 rounded-lg border-2 border-white" style={{ backgroundColor: value }} />
          )}
        </label>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{value}</span>
      </div>
    </div>
  );
}

function imageFileProblem(file: File): string | null {
  if (!(CARD_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'La imagen debe ser PNG, JPG o WebP';
  }
  if (file.size > CARD_IMAGE_MAX_BYTES) return 'La imagen no puede superar los 5 MB';
  return null;
}

/** Sube la imagen al elegirla; el diseño guarda la URL que devuelve el backend. */
export function ImagePicker({
  label,
  hint,
  value,
  aspect,
  onUpload,
  onRemove,
}: {
  label: string;
  hint?: string;
  value: string | null;
  aspect: 'square' | 'wide' | 'banner';
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const box = { square: 'w-28 h-28', wide: 'w-full max-w-xs h-24', banner: 'w-full max-w-md aspect-[1032/336]' }[aspect];

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const fileProblem = imageFileProblem(file);
    setProblem(fileProblem);
    if (fileProblem) return;
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'No pudimos subir la imagen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className={`${LABEL} mb-2`}>{label}</p>
      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${box} relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 hover:border-brand-blue flex items-center justify-center overflow-hidden`}
        >
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs font-bold text-slate-400">
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {busy ? 'Subiendo…' : 'Agregar imagen'}
            </span>
          )}
          {busy && value && <span className="absolute inset-0 bg-white/60 dark:bg-slate-900/60" />}
        </button>
        {value && (
          <div className="flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={GHOST_BUTTON}>
              Cambiar
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              Quitar
            </button>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={CARD_IMAGE_MIME_TYPES.join(',')}
        aria-label={`Elegir imagen: ${label}`}
        className="sr-only"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {hint && (
        <p id={`${id}-hint`} className={HINT}>
          {hint}
        </p>
      )}
      {problem && (
        <p role="alert" className="text-sm font-bold text-red-600 mt-2">
          {problem}
        </p>
      )}
    </div>
  );
}
