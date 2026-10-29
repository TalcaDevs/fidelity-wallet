import { useContext, useEffect, useRef, useState } from 'react';
import { ToastContext } from '../../lib/toastContext';

export interface CopyBoxProps {
  value: string;
  label?: string;
  buttonLabel?: string;
  copiedLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  variant?: 'soft' | 'surface';
  className?: string;
  monoClassName?: string;
  onCopied?: () => void;
}

export function CopyBox({
  value,
  label,
  buttonLabel = 'Copiar',
  copiedLabel = '¡Copiado!',
  successMessage,
  errorMessage = 'No se pudo copiar el enlace',
  variant = 'soft',
  className = '',
  monoClassName = '',
  onCopied,
}: CopyBoxProps) {
  const toast = useContext(ToastContext);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);

      if (successMessage && toast?.notifySuccess) {
        toast.notifySuccess(successMessage);
      }
      onCopied?.();
    } catch {
      if (toast?.notifyError) {
        toast.notifyError(errorMessage);
      }
    }
  };

  const containerStyles = {
    soft: 'bg-panel-soft rounded-xl p-2 border border-panel-border/60 flex items-center justify-between gap-2 min-w-0',
    surface: 'bg-panel-surface rounded-xl p-2 border border-panel-border shadow-2xs flex items-center justify-between gap-2 min-w-0',
  };

  const buttonStyles = {
    soft: 'h-8 px-3 rounded-lg text-xs font-semibold bg-panel-surface border border-panel-border text-panel-text hover:text-panel-accent transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-2xs',
    surface: 'h-8 px-3 rounded-lg text-xs font-semibold bg-panel-soft hover:bg-panel-border/60 text-panel-text hover:text-panel-primary transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95',
  };

  return (
    <div className={`space-y-1.5 min-w-0 max-w-full ${className}`.trim()}>
      {label && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-panel-muted block">
          {label}
        </span>
      )}
      <div className={containerStyles[variant]}>
        <span className={`text-xs font-mono text-panel-text truncate min-w-0 px-1 ${monoClassName}`.trim()}>
          {value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? copiedLabel : buttonLabel}
          className={buttonStyles[variant]}
        >
          {copied ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{copiedLabel}</span>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-panel-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{buttonLabel}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
