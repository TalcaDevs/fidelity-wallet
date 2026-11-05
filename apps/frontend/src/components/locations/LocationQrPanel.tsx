import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import type { CardConfigDto, LocationDto } from '@fidelity/shared';
import { ErrorAlert } from '../ui/ErrorAlert';
import { CopyBox } from '../ui/CopyBox';
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
  cardLoading = false,
  onOpenKit,
}: {
  location: LocationDto;
  onSlugChange: (slug: string) => void;
  cardConfig?: CardConfigDto | null;
  cardLoading?: boolean;
  onOpenKit?: () => void;
}) {
  const { notifySuccess } = useToast();
  const [slugDraft, setSlugDraft] = useState(location.slug);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKit, setShowKit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = publicJoinUrl(location.slug);

  const handleOpenKit = () => {
    if (onOpenKit) {
      onOpenKit();
    } else {
      setShowKit(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, QR_OPTIONS)
      .then((data) => !cancelled && setQr(data))
      .catch(() => !cancelled && setError('No pudimos generar el QR.'));
    return () => {
      cancelled = true;
    };
  }, [url]);

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

      {/* Tarjeta principal con QR y acciones */}
      <div className="bg-panel-soft/60 rounded-2xl p-5 sm:p-6 border border-panel-border/80 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Contenedor del QR */}
        <div className="shrink-0 flex flex-col items-center gap-2.5">
          <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-2xl bg-white p-2.5 border border-panel-border shadow-xs flex items-center justify-center">
            {qr ? (
              <img src={qr} alt={`QR de registro de ${location.name}`} className="w-full h-full object-contain rounded-lg" />
            ) : (
              <Skeleton className="w-40 h-40 rounded-xl" />
            )}
          </div>
          <a
            href={qr ?? undefined}
            download={`qr-${location.slug}.png`}
            aria-disabled={!qr}
            className="h-8 px-3 rounded-lg text-xs font-semibold bg-panel-surface border border-panel-border text-panel-text hover:text-panel-primary hover:bg-panel-soft flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-panel-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Descargar PNG</span>
          </a>
        </div>

        {/* Información y botones de acción */}
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-panel-muted">Código de autoservicio</span>
            <p className="text-sm text-panel-muted mt-1 leading-relaxed">
              Pon este código en tus mesas o mostrador para que tus clientes obtengan su tarjeta de sellos escaneando directamente con su teléfono.
            </p>
          </div>

          <CopyBox
            label="Enlace web directo:"
            value={url}
            buttonLabel="Copiar link"
            successMessage="Link copiado."
            variant="surface"
            monoClassName="font-bold"
          />

          {/* Botones de acción Kit e Impresión */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleOpenKit}
              disabled={cardLoading}
              title={cardLoading ? 'Cargando configuración de tarjeta...' : undefined}
              className="h-9 px-4 rounded-xl text-xs sm:text-sm font-bold bg-panel-primary hover:bg-panel-primary/90 text-white shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Kit para Mesón / Caja (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenKit}
              disabled={!qr || cardLoading}
              title={cardLoading ? 'Cargando configuración de tarjeta...' : undefined}
              className="h-9 px-3.5 rounded-xl text-xs sm:text-sm font-bold bg-panel-surface hover:bg-panel-soft text-panel-text border border-panel-border shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0 text-panel-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sección Personalizar el link */}
      <form onSubmit={saveSlug} className="pt-4 border-t border-panel-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="location-slug" className="block text-sm font-bold text-panel-text">
            Personalizar el link
          </label>
          <span className="text-xs text-panel-muted font-mono">/join/[slug]</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="location-slug"
            type="text"
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value)}
            aria-describedby="location-slug-help"
            className="flex-1 min-w-0 px-4 py-2.5 bg-panel-surface rounded-xl border border-panel-border focus:outline-none focus:ring-2 focus:ring-panel-primary/30 focus:border-panel-primary text-panel-text text-sm font-mono shadow-2xs"
            placeholder="ej. cafe-central"
          />
          <button
            type="submit"
            disabled={saving || !slugDraft.trim() || slugDraft.trim() === location.slug}
            className="h-10 px-5 bg-panel-primary hover:bg-panel-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Cambiar link'}
          </button>
        </div>
        <p id="location-slug-help" className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Si cambias el link, los QR ya impresos de este local dejan de funcionar.</span>
        </p>
      </form>

      {showKit && !onOpenKit && (
        <PrintCounterKitModal
          location={location}
          cardConfig={cardConfig}
          onClose={() => setShowKit(false)}
        />
      )}
    </div>
  );
}
