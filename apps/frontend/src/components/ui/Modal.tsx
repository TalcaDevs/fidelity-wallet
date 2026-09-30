import { useEffect, type ReactNode } from 'react';

const SIZES = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

/** Contenedor de diálogo: cierra con Escape y con el botón ✕ (igual que ConfirmDialog). */
export function Modal({
  title,
  description,
  onClose,
  children,
  size = 'md',
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: keyof typeof SIZES;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 ${SIZES[size]} w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 relative`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 id="modal-title" className="text-2xl font-black text-slate-900 dark:text-white mb-2 pr-8">{title}</h2>
        {description && <p className="text-slate-500 mb-6">{description}</p>}
        {children}
      </div>
    </div>
  );
}
