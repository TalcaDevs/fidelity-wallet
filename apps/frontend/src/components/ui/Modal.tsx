import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { WALLET_THEME } from './walletTheme';

const SIZES = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

/** Contenedor de diálogo: cierra con Escape y con el botón ✕ (igual que ConfirmDialog). */
export function Modal({
  title,
  description,
  onClose,
  children,
  size = 'md',
  trapFocus = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: keyof typeof SIZES;
  trapFocus?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(trapFocus, dialogRef);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const modalContent = (
    <div
      className={`${WALLET_THEME} fw-admin fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-panel-surface text-panel-text rounded-3xl p-6 sm:p-8 ${SIZES[size]} w-full max-h-[min(90dvh,calc(100dvh-3rem))] overflow-y-auto shadow-2xl border border-panel-border relative motion-safe:animate-[fw-panel-enter_240ms_ease-out]`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 rounded-xl text-panel-muted hover:text-panel-text hover:bg-panel-soft transition-colors focus-visible:outline-2 focus-visible:outline-panel-accent"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 id="modal-title" className="text-xl sm:text-2xl font-black text-panel-text mb-2 pr-10">
          {title}
        </h2>
        {description && <p className="text-sm sm:text-base text-panel-muted mb-6">{description}</p>}
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
