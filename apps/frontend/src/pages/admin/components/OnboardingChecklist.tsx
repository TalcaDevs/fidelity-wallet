import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../components/routing/routePaths';

interface OnboardingChecklistProps {
  brandId: string | null;
}

export function OnboardingChecklist({ brandId }: OnboardingChecklistProps) {
  const storageKey = brandId ? `fw_dismissed_onboarding_${brandId}` : 'fw_dismissed_onboarding';
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setIsDismissed(localStorage.getItem(storageKey) === 'true');
    } catch {
      setIsDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // Ignorar fallos de cuota o cookies bloqueadas
    }
    setIsDismissed(true);
  };

  const handleRestore = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignorar fallos de cuota o cookies bloqueadas
    }
    setIsDismissed(false);
  };

  if (isDismissed) {
    return (
      <div className="mb-4 sm:mb-6 flex justify-end">
        <button
          type="button"
          onClick={handleRestore}
          aria-label="Mostrar guía de primeros pasos"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-panel-accent/25 bg-panel-surface/90 hover:bg-panel-soft text-panel-accent shadow-xs transition-colors"
        >
          <span aria-hidden="true">✨</span>
          <span>Ver guía de primeros pasos</span>
        </button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="onboarding-guide-title"
      className="sticky top-0 z-20 mb-6 sm:mb-8 rounded-2xl border border-panel-accent/25 bg-panel-surface/95 dark:bg-panel-soft/95 bg-gradient-to-r from-panel-accent/[0.08] via-panel-accent/[0.03] to-panel-soft/40 backdrop-blur-md p-4 sm:p-4.5 shadow-md shadow-panel-accent/5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-panel-accent/15 text-panel-accent shrink-0">
            <span aria-hidden="true">✨</span>
            <span>Guía de bienvenida</span>
          </div>
          <h2 id="onboarding-guide-title" className="text-sm sm:text-base font-extrabold text-panel-text truncate">
            Primeros pasos para poner en marcha tu negocio
          </h2>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Ocultar guía de primeros pasos"
          className="text-xs font-semibold text-panel-muted hover:text-panel-text px-2.5 py-1 rounded-lg hover:bg-panel-surface/80 transition-colors shrink-0"
        >
          Ocultar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Paso 1: Diseñar tarjeta */}
        <Link
          to={ROUTES.card}
          className="group flex items-center justify-between p-3 rounded-xl border border-panel-accent/15 bg-panel-surface/90 hover:bg-panel-surface hover:border-panel-accent/40 transition-all shadow-xs hover:shadow-sm"
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-xs sm:text-sm font-bold text-panel-text group-hover:text-panel-accent transition-colors truncate">
              1. Personaliza tu tarjeta
            </h3>
            <p className="text-[11px] text-panel-muted mt-0.5 truncate">
              Colores, logo y regla de sellos
            </p>
          </div>
          <span className="text-xs font-bold text-panel-accent shrink-0 group-hover:translate-x-0.5 transition-transform">
            Ir →
          </span>
        </Link>

        {/* Paso 2: Imprimir QR */}
        <Link
          to={ROUTES.locations}
          className="group flex items-center justify-between p-3 rounded-xl border border-panel-accent/15 bg-panel-surface/90 hover:bg-panel-surface hover:border-panel-accent/40 transition-all shadow-xs hover:shadow-sm"
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-xs sm:text-sm font-bold text-panel-text group-hover:text-panel-accent transition-colors truncate">
              2. Imprime tu Kit de Mesón
            </h3>
            <p className="text-[11px] text-panel-muted mt-0.5 truncate">
              Póster con código QR para la caja
            </p>
          </div>
          <span className="text-xs font-bold text-panel-accent shrink-0 group-hover:translate-x-0.5 transition-transform">
            Ver →
          </span>
        </Link>

        {/* Paso 3: Invitar equipo */}
        <Link
          to={ROUTES.team}
          className="group flex items-center justify-between p-3 rounded-xl border border-panel-accent/15 bg-panel-surface/90 hover:bg-panel-surface hover:border-panel-accent/40 transition-all shadow-xs hover:shadow-sm"
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-xs sm:text-sm font-bold text-panel-text group-hover:text-panel-accent transition-colors truncate">
              3. Invita a tu equipo
            </h3>
            <p className="text-[11px] text-panel-muted mt-0.5 truncate">
              Agrega meseros y cajeros
            </p>
          </div>
          <span className="text-xs font-bold text-panel-accent shrink-0 group-hover:translate-x-0.5 transition-transform">
            Invitar →
          </span>
        </Link>
      </div>
    </section>
  );
}
