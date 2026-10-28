export interface PasswordCriterion {
  id: 'length' | 'number' | 'uppercase' | 'lowercase';
  label: string;
  met: boolean;
}

export function evaluatePassword(password: string): {
  isValid: boolean;
  criteria: PasswordCriterion[];
  metCount: number;
  totalCount: number;
} {
  const criteria: PasswordCriterion[] = [
    {
      id: 'length',
      label: 'Mínimo 8 caracteres',
      met: password.length >= 8,
    },
    {
      id: 'number',
      label: 'Al menos un número (0-9)',
      met: /\d/.test(password),
    },
    {
      id: 'uppercase',
      label: 'Al menos una mayúscula (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'Al menos una minúscula (a-z)',
      met: /[a-z]/.test(password),
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  return {
    isValid: metCount === criteria.length,
    criteria,
    metCount,
    totalCount: criteria.length,
  };
}

export function PasswordRequirements({ password }: { password: string }) {
  const { criteria, metCount, isValid } = evaluatePassword(password);
  const hasTyped = password.length > 0;

  const getStrengthInfo = () => {
    if (!hasTyped) return { text: '', color: 'bg-panel-border' };
    if (metCount <= 1) return { text: 'Muy débil', color: 'bg-red-500' };
    if (metCount === 2) return { text: 'Débil', color: 'bg-amber-500' };
    if (metCount === 3) return { text: 'Aceptable', color: 'bg-blue-500' };
    return { text: 'Segura', color: 'bg-emerald-500' };
  };

  const strength = getStrengthInfo();

  return (
    <div
      aria-label="Requisitos de seguridad de la contraseña"
      className="mt-2.5 rounded-xl border border-panel-border/70 bg-panel-soft/50 p-3.5 text-xs shadow-xs"
    >
      {hasTyped && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-panel-muted">Seguridad:</span>
            <span
              className={
                isValid
                  ? 'font-bold text-emerald-600 dark:text-emerald-400'
                  : 'font-bold text-panel-text'
              }
            >
              {strength.text}
            </span>
          </div>
          {/* Barra de progreso por segmentos */}
          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => {
              const active = index < metCount;
              return (
                <div
                  key={index}
                  className={`h-full rounded-full transition-all duration-300 ${
                    active ? strength.color : 'bg-panel-border/60'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]" role="list">
        {criteria.map((item) => (
          <li
            key={item.id}
            className={`flex items-center gap-1.5 transition-colors ${
              item.met
                ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                : 'text-panel-muted'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-colors ${
                item.met
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-panel-border/60 text-panel-muted'
              }`}
            >
              {item.met ? '✓' : '•'}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
