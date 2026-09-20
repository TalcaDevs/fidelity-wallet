import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type Toast, type ToastTone } from '../../lib/toastContext';

const DISMISS_AFTER_MS = 4000;

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'bg-emerald-600 text-white shadow-emerald-600/30',
  error: 'bg-red-600 text-white shadow-red-600/30',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message: string, tone: ToastTone) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
  }, [dismiss]);

  const value = useMemo(() => ({
    notifySuccess: (message: string) => push(message, 'success'),
    notifyError: (message: string) => push(message, 'error'),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* role=status para que un lector de pantalla anuncie el resultado de la acción */}
      <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto px-5 py-4 rounded-2xl font-bold shadow-lg text-left max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-200 ${TONE_STYLES[toast.tone]}`}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
