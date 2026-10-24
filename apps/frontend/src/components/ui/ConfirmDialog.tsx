import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { WALLET_THEME } from './walletTheme';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  isBusy = false,
  trapFocus = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  isBusy?: boolean;
  trapFocus?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(trapFocus, dialogRef);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const confirmClasses = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
    : 'bg-brand-blue hover:bg-blue-600 shadow-brand-blue/20';

  const dialogContent = (
    <div
      className={`${WALLET_THEME} fw-admin fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4`}
      onClick={(e) => {
        if (!isBusy && e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-panel-surface text-panel-text rounded-3xl border border-panel-border shadow-2xl p-6 sm:p-8 w-full max-w-md duration-200 motion-safe:animate-[fw-panel-enter_240ms_ease-out]"
      >
        <h2 id="confirm-dialog-title" className="text-xl sm:text-2xl font-extrabold tracking-tight mb-3 text-panel-text">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-panel-muted mb-8">{message}</p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-5 py-3 rounded-xl font-bold text-panel-text bg-panel-soft hover:bg-panel-border/30 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-colors disabled:opacity-50 ${confirmClasses}`}
          >
            {isBusy ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialogContent, document.body) : dialogContent;
}
