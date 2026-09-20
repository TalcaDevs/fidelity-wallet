import { useEffect } from 'react';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  isBusy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
      >
        <h2 id="confirm-dialog-title" className="text-2xl font-extrabold tracking-tight mb-3 text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{message}</p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-5 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
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
}
