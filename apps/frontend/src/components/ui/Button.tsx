import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'danger-soft';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const BASE_STYLES =
  'inline-flex items-center justify-center font-bold transition-colors select-none focus-visible:outline-2 focus-visible:outline-panel-accent focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-panel-primary text-white hover:bg-panel-primary/90 shadow-sm active:scale-[0.99]',
  secondary:
    'bg-panel-soft text-panel-text hover:bg-panel-border/60 active:scale-[0.99]',
  outline:
    'border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft active:scale-[0.99]',
  ghost:
    'bg-transparent text-panel-muted hover:text-panel-accent hover:bg-panel-accent/10 active:scale-[0.99]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20 active:scale-[0.99]',
  'danger-soft':
    'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 active:scale-[0.99]',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      type = 'button',
      className = '',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading ? 'true' : undefined}
        className={`${BASE_STYLES} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${
          fullWidth ? 'w-full' : ''
        } ${className}`.trim()}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children && <span>{children}</span>}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
