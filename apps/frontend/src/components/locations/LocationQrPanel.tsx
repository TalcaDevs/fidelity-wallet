import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import type { LocationDto } from '@fidelity/shared';
import { ErrorAlert } from '../ui/ErrorAlert';
import { useToast } from '../../hooks/useToast';
import { publicJoinUrl, updateMerchantSlug } from '../../services/merchantService';

const QR_OPTIONS = { width: 512, margin: 2, errorCorrectionLevel: 'M' } as const;

/** Link de registro de un local, su QR para imprimir y el cambio de slug. */
export function LocationQrPanel({ location, onSlugChange }: { location: LocationDto; onSlugChange: (slug: string) => void }) {
  const { notifySuccess } = useToast();
  const [slugDraft, setSlugDraft] = useState(location.slug);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  function print() {
    if (!qr) return;
    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) {
      setError('Tu navegador bloqueó la ventana de impresión.');
      return;
    }
    const doc = win.document;
    doc.title = `QR ${location.name}`;
    const style = doc.createElement('style');
    style.textContent =
      'body{font-family:system-ui,sans-serif;text-align:center;padding:48px}img{width:360px;height:360px}h1{font-size:28px;margin:0 0 8px}p{color:#475569;margin:4px 0}';
    doc.head.appendChild(style);
    const title = doc.createElement('h1');
    title.textContent = location.name;
    const hint = doc.createElement('p');
    hint.textContent = 'Escanea y saca tu tarjeta de sellos';
    const img = doc.createElement('img');
    img.src = qr;
    img.alt = `QR de ${location.name}`;
    const link = doc.createElement('p');
    link.textContent = url;
    doc.body.append(title, hint, img, link);
    img.onload = () => {
      win.focus();
      win.print();
    };
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
          {qr ? <img src={qr} alt={`QR de registro de ${location.name}`} className="w-full h-full" /> : <div className="w-40 h-40 rounded-xl bg-slate-100 animate-pulse" />}
        </div>
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ponlo en las mesas o el mesón de este local: ahí tus clientes sacan su tarjeta de sellos.
          </p>
          <p className="font-bold text-slate-800 dark:text-slate-100 break-all">{url}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue">
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
            <button type="button" onClick={print} disabled={!qr} className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue disabled:opacity-50">
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
    </div>
  );
}
