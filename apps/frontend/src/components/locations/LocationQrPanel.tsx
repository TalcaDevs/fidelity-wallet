import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import type { CardConfigDto, LocationDto } from '@fidelity/shared';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { publicJoinUrl, updateMerchantSlug } from '../../services/merchantService';
import { PrintCounterKitModal } from './PrintCounterKitModal';

const QR_OPTIONS = { width: 512, margin: 2, errorCorrectionLevel: 'M' } as const;

/** Link de registro de un local, su QR para imprimir y el cambio de slug. */
export function LocationQrPanel({
  location,
  onSlugChange,
  cardConfig,
}: {
  location: LocationDto;
  onSlugChange: (slug: string) => void;
  cardConfig?: CardConfigDto | null;
}) {
  const { notifySuccess } = useToast();
  const [slugDraft, setSlugDraft] = useState(location.slug);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKit, setShowKit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = publicJoinUrl(location.slug);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, QR_OPTIONS)
      .then((data) => !cancelled && setQr(data))
      .catch(() => !cancelled && setError('No pudimos generar el QR.'));
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess('Link copiado.');
    } catch {
      setError('No pudimos copiar el link. Cópialo manualmente.');
    }
  }

  async function saveSlug(e: FormEvent) {
    e.preventDefault();
    const next = slugDraft.trim();
    if (!next || next === location.slug) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateMerchantSlug(location.id, next);
      setSlugDraft(saved);
      onSlugChange(saved);
      notifySuccess('Link actualizado. Recuerda reimprimir el QR de este local.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cambiar el link.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} />}

      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <div className="w-48 h-48 shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
          {qr ? (
            <img src={qr} alt={`QR de registro de ${location.name}`} className="w-full h-full" />
          ) : (
            <Skeleton className="w-40 h-40 rounded-xl" />
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ponlo en las mesas o el mesón de este local: ahí tus clientes sacan su tarjeta de sellos.
          </p>
          <p className="font-bold text-slate-800 dark:text-slate-100 break-all">{url}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowKit(true)}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-brand-blue text-white hover:bg-blue-600 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Kit para Mesón / Caja (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => void copy()}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue cursor-pointer transition-all active:scale-[0.98]"
            >
              Copiar link
            </button>
            <a
              href={qr ?? undefined}
              download={`qr-${location.slug}.png`}
              aria-disabled={!qr}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue"
            >
              Descargar PNG
            </a>
            <button
              type="button"
              onClick={() => setShowKit(true)}
              disabled={!qr}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue disabled:opacity-50"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={saveSlug} className="space-y-3">
        <label htmlFor="location-slug" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
          Personalizar el link
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="location-slug"
            type="text"
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value)}
            aria-describedby="location-slug-help"
            className="flex-1 min-w-0 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue text-slate-800 dark:text-slate-100 font-medium"
            placeholder="ej. cafe-central"
          />
          <button
            type="submit"
            disabled={saving || !slugDraft.trim() || slugDraft.trim() === location.slug}
            className="px-5 py-3 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Cambiar link'}
          </button>
        </div>
        <p id="location-slug-help" className="text-xs font-bold text-orange-600">
          Si cambias el link, los QR ya impresos de este local dejan de funcionar.
        </p>
      </form>

      {showKit && (
        <PrintCounterKitModal
          location={location}
          cardConfig={cardConfig}
          onClose={() => setShowKit(false)}
        />
      )}
    </div>
  );
}
