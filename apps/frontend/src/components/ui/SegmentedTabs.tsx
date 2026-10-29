import type { ReactNode } from 'react';

export interface SegmentedTabOption<T extends string | number | boolean = string> {
  value: T;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
  badge?: ReactNode;
  id?: string;
}

export type SegmentedTabsVariant = 'surface' | 'soft';
export type SegmentedTabsActiveTone = 'primary' | 'surface';
export type SegmentedTabsSize = 'xs' | 'sm' | 'md';

export interface SegmentedTabsProps<T extends string | number | boolean = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedTabOption<T>[];
  variant?: SegmentedTabsVariant;
  activeTone?: SegmentedTabsActiveTone;
  size?: SegmentedTabsSize;
  fullWidth?: boolean;
  ariaLabel?: string;
  role?: 'group' | 'tablist' | 'radiogroup';
  buttonRole?: 'button' | 'tab' | 'radio';
  className?: string;
  id?: string;
}

const SIZE_STYLES: Record<
  SegmentedTabsSize,
  {
    containerPadding: string;
    buttonPadding: string;
    textSize: string;
  }
> = {
  xs: {
    containerPadding: 'p-1',
    buttonPadding: 'px-3 py-1.5',
    textSize: 'text-xs font-semibold',
  },
  sm: {
    containerPadding: 'p-1',
    buttonPadding: 'px-3 py-1',
    textSize: 'text-xs font-semibold',
  },
  md: {
    containerPadding: 'p-1.5',
    buttonPadding: 'px-4 py-2 sm:px-5 sm:py-2.5',
    textSize: 'text-sm font-bold',
  },
};

/**
 * Control segmentado reutilizable (tabs de filtro / interruptores de vista).
 *
 * Sigue el patrón visual estandarizado del panel de administración:
 * - Variante 'surface': Fondo blanco/superficie con borde sutil (rounded-2xl)
 * - Variante 'soft': Fondo suave atenuado (rounded-xl)
 */
export function SegmentedTabs<T extends string | number | boolean = string>({
  value,
  onChange,
  options,
  variant = 'surface',
  activeTone,
  size = 'xs',
  fullWidth = false,
  ariaLabel,
  role,
  buttonRole,
  className = '',
  id,
}: SegmentedTabsProps<T>) {
  const sizeConfig = SIZE_STYLES[size];
  const effectiveActiveTone: SegmentedTabsActiveTone = activeTone ?? 'primary';

  const containerVariantClasses =
    variant === 'surface'
      ? 'bg-panel-surface border border-panel-border rounded-2xl'
    : 'bg-panel-soft rounded-xl';

  const buttonRadiusClass =
    variant === 'surface' || size === 'md' ? 'rounded-xl' : 'rounded-lg';

  const containerRole =
    role ?? (buttonRole === 'tab' ? 'tablist' : buttonRole === 'radio' ? 'radiogroup' : 'group');

  const displayClass = fullWidth
    ? 'flex sm:inline-flex w-full sm:w-auto justify-between sm:justify-start'
    : 'inline-flex';

  return (
    <div
      id={id}
      role={containerRole}
      aria-label={ariaLabel}
      className={`${displayClass} items-center ${sizeConfig.containerPadding} gap-1 overflow-x-auto max-w-full select-none ${containerVariantClasses} ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        const activeClasses =
          effectiveActiveTone === 'primary'
            ? 'bg-panel-primary text-white shadow-xs'
            : 'bg-panel-surface text-panel-text shadow-sm';

        const inactiveClasses = 'text-panel-muted hover:text-panel-text';

        return (
          <button
            key={String(option.value)}
            id={option.id}
            type="button"
            role={buttonRole}
            aria-pressed={buttonRole === 'tab' || buttonRole === 'radio' ? undefined : isActive}
            aria-selected={buttonRole === 'tab' ? isActive : undefined}
            aria-checked={buttonRole === 'radio' ? isActive : undefined}
            aria-label={option['aria-label']}
            disabled={option.disabled}
            onClick={() => {
              if (!option.disabled) {
                onChange(option.value);
              }
            }}
            className={`whitespace-nowrap transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              fullWidth ? 'flex-1 sm:flex-none' : ''
            } ${sizeConfig.buttonPadding} ${sizeConfig.textSize} ${buttonRadiusClass} ${
              isActive ? activeClasses : inactiveClasses
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <>
                {' '}
                <span className={isActive ? 'opacity-90 font-medium' : 'text-panel-muted font-normal'}>
                  ({option.count})
                </span>
              </>
            )}
            {option.badge}
          </button>
        );
      })}
    </div>
  );
}

// Alias de conveniencia
export const SegmentedControl = SegmentedTabs;
