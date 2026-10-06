import { PanelTitle } from '../../components/admin/PanelTitle';
import { useCallback, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { PESOS_PER_POINT_MAX, PESOS_PER_POINT_MIN } from '@fidelity/shared';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { ROUTES } from '../../components/routing/routePaths';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../hooks/useToast';
import { getBrandSettings, updateBrandSettings, type BrandSettings } from '../../services/brandSettingsService';

const clp = new Intl.NumberFormat('es-CL');

const CARD =
  'bg-panel-surface rounded-2xl border border-panel-border shadow-panel p-5 sm:p-8 max-w-2xl';
const FIELD =
  'w-full px-5 py-4 bg-panel-soft rounded-2xl border border-panel-border focus:outline-none focus:ring-4 focus:ring-panel-accent/20 focus:border-panel-accent transition-all text-panel-text font-medium text-lg';
const LABEL = 'block text-sm font-bold text-panel-text mb-3 uppercase tracking-wider';

/** Lo que es de toda la marca. Lo propio de cada local (nombre, dirección, link y QR) vive en Sucursales. */
export function Settings({ session, brandId }: { session: Session | null; brandId: string | null }) {
  const fetcher = useCallback(() => getBrandSettings(brandId!), [brandId]);
  const { data, loading, error: loadError } = useAsyncData(brandId ? fetcher : null);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text"><PanelTitle text="Configuración" /></h1>
        <p className="text-panel-muted text-sm sm:text-base">Los datos de tu marca, que comparten todos tus locales.</p>
      </header>

      {loadError && <ErrorAlert message={loadError} />}

      <div data-panel-reveal className={CARD}>
        {loading || !data || !brandId ? (
          <div className="space-y-4">
            <div className="h-6 w-40 rounded-xl bg-panel-soft animate-pulse" />
            <div className="h-14 w-full rounded-2xl bg-panel-soft animate-pulse" />
          </div>
        ) : (
          <BrandSettingsForm brandId={brandId} initial={data} email={session?.user?.email} />
        )}
      </div>

      <section data-panel-reveal className={`mt-8 ${CARD}`}>
        <h2 className="text-lg font-bold text-panel-text mb-2">Tu tarjeta</h2>
        <p className="text-panel-muted mb-5">
          Las recompensas, la vigencia de los sellos o puntos, el diseño y lo que pide el registro se editan en Tarjeta.
        </p>
        <Link to={ROUTES.card} className="inline-block px-5 py-3 rounded-xl bg-panel-soft font-bold text-panel-text hover:bg-panel-accent/10 hover:text-panel-accent">
          Ir a Tarjeta
        </Link>
      </section>

      <section data-panel-reveal className={`mt-8 ${CARD}`}>
        <h2 className="text-lg font-bold text-panel-text mb-2">Links de registro y QR</h2>
        <p className="text-panel-muted mb-5">
          Cada local tiene su propio link de registro y su QR para imprimir. Los encuentras en Sucursales.
        </p>
        <Link to={ROUTES.locations} className="inline-block px-5 py-3 rounded-xl bg-panel-soft font-bold text-panel-text hover:bg-panel-accent/10 hover:text-panel-accent">
          Ir a Sucursales
        </Link>
      </section>
    </>
  );
}

function BrandSettingsForm({ brandId, initial, email }: { brandId: string; initial: BrandSettings; email?: string }) {
  const { notifySuccess } = useToast();
  const [name, setName] = useState(initial.name);
  const [pointsEnabled, setPointsEnabled] = useState(initial.pointsEnabled);
  const [pesosPerPoint, setPesosPerPoint] = useState(String(initial.pesosPerPoint));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pesos = Number(pesosPerPoint);
  const pesosValid = Number.isInteger(pesos) && pesos >= PESOS_PER_POINT_MIN && pesos <= PESOS_PER_POINT_MAX;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!pesosValid) {
      setError('Indica cuántos pesos de compra equivalen a un punto.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateBrandSettings(brandId, { name: name.trim(), pointsEnabled, pesosPerPoint: pesos });
      notifySuccess('Configuración de la marca actualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {error && <ErrorAlert message={error} />}
      <form onSubmit={handleSave} className="space-y-8">
        <div>
          <label htmlFor="brand-name" className={LABEL}>Nombre de la marca</label>
          <input
            id="brand-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${FIELD} placeholder:text-panel-muted/70`}
            placeholder="ej. Café Central"
            required
            minLength={2}
            maxLength={80}
          />
          <p className="text-sm text-panel-muted mt-3 font-medium">
            Aparece en la tarjeta que tus clientes guardan en su billetera: la misma tarjeta vale en todos tus locales.
          </p>
        </div>

        <fieldset>
          <legend className={LABEL}>Puntos por compra</legend>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={pointsEnabled}
              onChange={(e) => setPointsEnabled(e.target.checked)}
              className="mt-1 w-5 h-5 accent-panel-accent"
            />
            <span className="text-panel-text font-medium">
              Habilitar tarjetas de puntos
              <span className="block text-sm text-panel-muted">
                Con puntos, cada compra suma según su monto. Los sellos, en cambio, suman por visita. El tipo de tarjeta se elige en{' '}
                <Link to={ROUTES.card} className="font-bold text-panel-accent underline underline-offset-2">Tarjeta</Link>.
              </span>
            </span>
          </label>
          <div className="mt-4">
            <label htmlFor="pesos-per-point" className="block text-sm font-bold text-panel-text mb-2">
              Pesos de compra por cada punto
            </label>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-panel-muted">$</span>
              <input
                id="pesos-per-point"
                inputMode="numeric"
                value={pesosPerPoint}
                onChange={(e) => setPesosPerPoint(e.target.value.replace(/\D/g, ''))}
                className={`${FIELD} max-w-48`}
                aria-invalid={!pesosValid}
              />
              <span className="text-panel-muted font-medium">= 1 punto</span>
            </div>
            <p className="text-sm text-panel-muted mt-2">
              {pesosValid
                ? `Una compra de $${clp.format(pesos * 10)} suma 10 puntos.`
                : 'Ingresa un monto en pesos, sin puntos ni comas.'}
            </p>
          </div>
        </fieldset>

        <div>
          <span className={LABEL}>Correo de la cuenta</span>
          <p className="px-5 py-4 bg-panel-soft rounded-2xl border border-panel-border text-panel-muted font-medium">
            {email}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="px-6 py-3 bg-panel-primary hover:bg-panel-primary/90 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </>
  );
}
