import { useRef, useState } from 'react';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { useToast } from '../../../hooks/useToast';
import { CardPreview } from './CardPreview';
import { DesignStep } from './DesignStep';
import { DetailsStep } from './DetailsStep';
import { InfoStep } from './InfoStep';
import { TypeStep } from './TypeStep';
import { useCardEditor } from './useCardEditor';
import { usePanelMotion } from '../../../hooks/usePanelMotion';
import { PANEL_PAGE } from '../../../components/admin/panelStyles';

const STEPS = ['Tipo', 'Información', 'Diseño', 'Detalles'] as const;
const STEP_INDEX = { TYPE: 0, INFO: 1, DESIGN: 2, DETAILS: 3 } as const;

const TYPE_LABEL = { STAMPS: 'Sellos / Visitas', POINTS: 'Puntos por compra' } as const;

function Stepper({ current, onSelect }: { current: number; onSelect: (step: number) => void }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 flex-1 min-w-fit last:flex-none">
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-2 shrink-0"
            >
              <span
                aria-hidden="true"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold ${
                  active
                    ? 'bg-panel-primary text-white ring-4 ring-panel-accent/20'
                    : done
                      ? 'bg-panel-primary text-white'
                      : 'bg-panel-soft text-panel-muted '
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={`text-sm font-bold ${active ? 'text-panel-text ' : 'text-panel-muted '}`}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className={`flex-1 h-0.5 min-w-6 rounded ${done ? 'bg-panel-primary' : 'bg-panel-soft '}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Editor paso a paso de la tarjeta de la marca. Todo se guarda de una vez con "Guardar": el
 * backend valida lo mismo que este editor y publica el diseño en los pases ya emitidos.
 */
export function CardEditor({ brandId }: { brandId: string | null }) {
  if (!brandId) return null;
  return <CardEditorPage brandId={brandId} />;
}

function CardEditorPage({ brandId }: { brandId: string }) {
  const editor = useCardEditor(brandId);
  const { notifySuccess } = useToast();
  const [step, setStep] = useState(0);
  const reducedMotion = usePanelMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { config, saved, loading, loadError, dirty, problems, saving, saveError } = editor;

  const goTo = (next: number) => {
    setStep(next);
    headingRef.current?.scrollIntoView?.({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  const handleSave = async () => {
    if (await editor.save()) {
      notifySuccess(
        saved && saved.customers > 0
          ? `Tarjeta guardada. ${saved.customers === 1 ? 'El pase de tu cliente se está actualizando.' : `Los pases de tus ${saved.customers} clientes se están actualizando.`}`
          : 'Tarjeta guardada.',
      );
    }
  };

  if (loadError) return <ErrorAlert message={loadError} />;
  if (loading || !config || !saved) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-64 rounded-xl bg-panel-soft animate-pulse" />
        <div className="h-96 rounded-2xl bg-panel-soft animate-pulse" />
      </div>
    );
  }

  const nav = (
    <div className="flex items-center justify-between gap-3">
      {step > 0 ? (
        <button type="button" onClick={() => goTo(step - 1)} className="px-4 py-2.5 rounded-xl font-bold text-panel-muted hover:bg-panel-soft">
          ← Atrás
        </button>
      ) : (
        <span />
      )}
      {step < STEPS.length - 1 ? (
        <button type="button" onClick={() => goTo(step + 1)} className="px-6 py-3 rounded-xl bg-panel-primary text-white font-bold">
          Continuar →
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-6 py-3 rounded-xl bg-panel-primary hover:bg-panel-primary/90 text-white font-bold shadow-lg shadow-brand-blue/20 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar tarjeta'}
        </button>
      )}
    </div>
  );

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 ref={headingRef} className="scroll-mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text break-words">{config.name || 'Tu tarjeta'}</h1>
          <p className="text-panel-muted text-sm sm:text-base mt-1">
            {(config.stampsEnabled && config.pointsEnabled) ? 'Sellos y Puntos' : TYPE_LABEL[config.type]} · la tarjeta que tus clientes guardan en su billetera
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 ${
              dirty
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {dirty ? 'Cambios sin guardar' : 'Publicada'}
          </span>
          {dirty && (
            <button type="button" onClick={editor.discard} disabled={saving} className="px-4 py-2.5 rounded-xl font-bold text-panel-muted hover:bg-panel-soft">
              Descartar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-5 py-2.5 rounded-xl bg-panel-primary hover:bg-panel-primary/90 text-white font-bold shadow-lg shadow-brand-blue/20 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </header>

      <nav aria-label="Pasos del editor" className="mb-6">
        <Stepper current={step} onSelect={goTo} />
      </nav>

      {(problems.length > 0 || saveError) && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-red-800 dark:text-red-200">
          <p className="font-bold">{saveError ?? 'Revisa lo siguiente antes de guardar:'}</p>
          {problems.length > 0 && (
            <ul className="list-disc pl-5 mt-1 text-sm space-y-0.5">
              {problems.map((p) => (
                <li key={p.message}>
                  <button
                    type="button"
                    onClick={() => goTo(STEP_INDEX[p.step])}
                    className="text-left underline underline-offset-2 hover:no-underline"
                  >
                    <span className="font-bold">{STEPS[STEP_INDEX[p.step]]}:</span> {p.message}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 sm:gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div key={step} className={`${PANEL_PAGE} bg-panel-surface rounded-2xl border border-panel-border shadow-panel p-4 sm:p-6 lg:p-8`}>
            {step === 0 && <TypeStep editor={editor} />}
            {step === 1 && <InfoStep editor={editor} />}
            {step === 2 && <DesignStep brandId={brandId} editor={editor} />}
            {step === 3 && <DetailsStep editor={editor} />}
          </div>
          {nav}
        </div>
        <div className="lg:sticky lg:top-6">
          <CardPreview config={config} brandName={saved.brandName} face={step === 3 ? 'DETAILS' : 'FRONT'} />
          {saved.customers > 0 && (
            <p className="text-xs text-panel-muted mt-3 px-2">
              Al guardar, los cambios llegan también a {saved.customers === 1 ? 'el cliente que ya tiene' : `los ${saved.customers} clientes que ya tienen`} la tarjeta.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
