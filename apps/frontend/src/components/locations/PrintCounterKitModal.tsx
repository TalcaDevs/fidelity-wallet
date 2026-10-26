import { useEffect, useId, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { CardConfigDto, LocationDto } from '@fidelity/shared';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';
import { publicJoinUrl } from '../../services/merchantService';
import {
  getDefaultIncentiveText,
  printCounterFlyer,
  type ColorMode,
  type PaperSize,
} from './printKitHelpers';

interface PrintCounterKitModalProps {
  location: LocationDto;
  cardConfig?: CardConfigDto | null;
  onClose: () => void;
}

const QR_EXPORT_OPTIONS = { width: 1024, margin: 2, errorCorrectionLevel: 'H' } as const;

export function PrintCounterKitModal({
  location,
  cardConfig,
  onClose,
}: PrintCounterKitModalProps) {
  const { notifySuccess, notifyError } = useToast();
  const [paperSize, setPaperSize] = useState<PaperSize>('A5');
  const [colorMode, setColorMode] = useState<ColorMode>('BRAND');

  const defaultIncentive = useMemo(() => getDefaultIncentiveText(cardConfig), [cardConfig]);
  const [headline, setHeadline] = useState('¡Escanea y guarda tu tarjeta!');
  const [subheadline, setSubheadline] = useState('En Apple Wallet o Google Wallet');
  const [incentive, setIncentive] = useState(defaultIncentive);

  const [qr, setQr] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const url = publicJoinUrl(location.slug);
  const brandName = cardConfig?.brandName || location.name;
  const logoUrl = cardConfig?.design?.logoUrl || cardConfig?.design?.wideLogoUrl || null;
  const brandColor = cardConfig?.design?.backgroundColor || '#1E3A8A';

  const headlineInputId = useId();
  const subheadlineInputId = useId();
  const incentiveInputId = useId();

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, QR_EXPORT_OPTIONS)
      .then((data) => !cancelled && setQr(data))
      .catch(() => !cancelled && notifyError('No pudimos generar el código QR'));
    return () => {
      cancelled = true;
    };
  }, [url, notifyError]);

  async function handlePrint() {
    if (!qr) return;
    setPrinting(true);
    try {
      await printCounterFlyer({
        paperSize,
        colorMode,
        brandName,
        logoUrl,
        primaryColor: brandColor,
        headline,
        subheadline,
        incentive,
        qrDataUrl: qr,
        locationName: location.name,
        commune: location.commune,
        joinUrl: url,
      });
      notifySuccess('Diálogo de impresión abierto. Puedes imprimir o Guardar como PDF.');
    } catch {
      notifyError('No pudimos abrir la vista de impresión.');
    } finally {
      setPrinting(false);
    }
  }

  const isA5 = paperSize === 'A5';
  const isOficio = paperSize === 'OFICIO';
  const isLetter = paperSize === 'LETTER';
  const isMono = colorMode === 'MONO';
  const displayColor = isMono ? '#0F172A' : brandColor;

  const aspectClass = isA5
    ? 'aspect-[1/1.414]'
    : isOficio
      ? 'aspect-[216/330]'
      : 'aspect-[8.5/11]';

  return (
    <Modal
      trapFocus
      size="xl"
      title="Kit para Imprimir en tu Local"
      description="Material listo para tu mesón o caja. Solo imprímelo, ponlo en un portarretrato acrílico de sobremesa y tus clientes se registrarán solos al pagar."
      onClose={onClose}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start mt-4">
        {/* Controles de Personalización */}
        <div className="space-y-5">
          {/* Selector de Tamaño */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Tamaño de papel
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setPaperSize('A5')}
                className={`px-2 py-2 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center justify-center text-center ${
                  isA5
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue font-extrabold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>A5</span>
                <span className="text-[10px] font-normal opacity-80 mt-0.5">15 × 21 cm</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('LETTER')}
                className={`px-2 py-2 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center justify-center text-center ${
                  isLetter
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue font-extrabold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Carta</span>
                <span className="text-[10px] font-normal opacity-80 mt-0.5">21.6 × 28 cm</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('OFICIO')}
                className={`px-2 py-2 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center justify-center text-center ${
                  isOficio
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue font-extrabold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Oficio</span>
                <span className="text-[10px] font-normal opacity-80 mt-0.5">21.6 × 33 cm</span>
              </button>
            </div>
          </div>

          {/* Selector de Estilo de Color */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Estilo de color
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColorMode('BRAND')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                  !isMono
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />
                <span>Color de marca</span>
              </button>
              <button
                type="button"
                onClick={() => setColorMode('MONO')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                  isMono
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-slate-900 shrink-0" />
                <span>B&amp;N (Ahorro)</span>
              </button>
            </div>
          </div>

          {/* Gancho / Beneficio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={incentiveInputId} className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Premio o gancho destacado
              </label>
              {incentive !== defaultIncentive && (
                <button
                  type="button"
                  onClick={() => setIncentive(defaultIncentive)}
                  className="text-[11px] font-bold text-brand-blue hover:underline"
                >
                  Restablecer
                </button>
              )}
            </div>
            <input
              id={incentiveInputId}
              type="text"
              value={incentive}
              onChange={(e) => setIncentive(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="ej. Junta 10 sellos y llévate tu premio gratis"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Es el motivo principal por el que el cliente escaneará mientras espera.
            </p>
          </div>

          {/* Titular */}
          <div>
            <label htmlFor={headlineInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Titular del cartel
            </label>
            <input
              id={headlineInputId}
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Subtitular */}
          <div>
            <label htmlFor={subheadlineInputId} className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Subtitular
            </label>
            <input
              id={subheadlineInputId}
              type="text"
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={!qr || printing}
              className="w-full py-3 px-4 rounded-xl bg-brand-blue hover:bg-blue-600 active:scale-[0.99] transition-all text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/30 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{printing ? 'Generando PDF...' : 'Imprimir / Guardar como PDF'}</span>
            </button>

            <a
              href={qr ?? undefined}
              download={`qr-${location.slug}-1024px.png`}
              aria-disabled={!qr}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Descargar solo QR en Alta Resolución</span>
            </a>
          </div>

          {/* Tip de Portarretrato Acrílico */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs space-y-1">
            <p className="font-extrabold flex items-center gap-1.5">
              <span>💡</span> Recomendación de Mesón:
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/80">
              Coloca la hoja en un <strong>portarretrato acrílico de sobremesa</strong> ({paperSize === 'A5' ? '15×21 cm' : paperSize === 'OFICIO' ? '21.6×33 cm (Oficio)' : 'Carta'}) junto a tu caja. Los clientes escanearán mientras pagan sin que tengas que pedirlo.
            </p>
          </div>
        </div>

        {/* Vista Previa Interactiva del Cartel */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>Vista previa del material</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
              {paperSize}
            </span>
          </div>

          {/* Marco estilo Portarretrato Acrílico */}
          <div
            className={`w-full max-w-[360px] bg-slate-100 dark:bg-slate-800/60 p-3 rounded-3xl border border-slate-300 dark:border-slate-700 shadow-2xl relative transition-all ${aspectClass}`}
          >
            {/* Hoja del Flyer */}
            <div className="w-full h-full bg-white text-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col justify-between items-center text-center shadow-sm border border-slate-200 relative overflow-hidden">
              {/* Borde Superior / Badge */}
              <div className="w-full flex flex-col items-center">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-white tracking-wider uppercase mb-1.5"
                  style={{ backgroundColor: displayColor }}
                >
                  Tarjeta Digital de Clientes
                </span>

                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={brandName}
                    className="max-h-10 max-w-[160px] object-contain mb-1"
                  />
                ) : (
                  <h3 className="font-black text-base tracking-tight text-slate-900 mb-0.5">
                    {brandName}
                  </h3>
                )}
              </div>

              {/* Titular */}
              <div className="my-1">
                <h4 className="font-black text-sm sm:text-base leading-tight tracking-tight text-slate-900">
                  {headline}
                </h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {subheadline}
                </p>
              </div>

              {/* Gancho Recompensa */}
              <div
                className="w-full rounded-xl p-2 my-1 border flex items-center justify-center gap-2"
                style={{
                  backgroundColor: isMono ? '#F1F5F9' : '#FEF3C7',
                  borderColor: isMono ? '#CBD5E1' : '#FDE68A',
                }}
              >
                <span className="text-base leading-none">🎁</span>
                <div className="min-w-0 text-left">
                  <p
                    className="font-extrabold text-[11px] leading-tight line-clamp-2"
                    style={{ color: isMono ? '#0F172A' : '#92400E' }}
                  >
                    {incentive}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-500">
                    ¡Sin descargar apps · Se guarda en tu teléfono!
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center my-1">
                <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-md">
                  {qr ? (
                    <img
                      src={qr}
                      alt="Código QR"
                      className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                  )}
                  {/* Esquinas decorativas de escáner */}
                  <div
                    className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2"
                    style={{ borderColor: displayColor }}
                  />
                  <div
                    className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2"
                    style={{ borderColor: displayColor }}
                  />
                  <div
                    className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2"
                    style={{ borderColor: displayColor }}
                  />
                  <div
                    className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2"
                    style={{ borderColor: displayColor }}
                  />
                </div>
                <p className="text-[9px] font-bold text-slate-500 mt-1">
                  Apunta con la cámara de tu teléfono
                </p>
              </div>

              {/* 3 Pasos */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-slate-700 w-full my-0.5">
                <div className="flex flex-col items-center">
                  <span
                    className="w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center mb-0.5"
                    style={{ backgroundColor: displayColor }}
                  >
                    1
                  </span>
                  <span className="text-[8px] font-bold leading-none">Abre tu cámara</span>
                </div>
                <span className="text-[10px] text-slate-300 font-bold">→</span>
                <div className="flex flex-col items-center">
                  <span
                    className="w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center mb-0.5"
                    style={{ backgroundColor: displayColor }}
                  >
                    2
                  </span>
                  <span className="text-[8px] font-bold leading-none">Escanea el QR</span>
                </div>
                <span className="text-[10px] text-slate-300 font-bold">→</span>
                <div className="flex flex-col items-center">
                  <span
                    className="w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center mb-0.5"
                    style={{ backgroundColor: displayColor }}
                  >
                    3
                  </span>
                  <span className="text-[8px] font-bold leading-none">Guarda tu pase</span>
                </div>
              </div>

              {/* Badges de Apple & Google Wallet */}
              <div className="flex flex-col items-center gap-1 my-1">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  Compatible con:
                </span>
                <div className="flex items-center gap-2">
                  <img
                    src="/apple-wallet-es.svg"
                    alt="Añadir a Apple Wallet"
                    className="h-5 sm:h-6 w-auto"
                  />
                  <img
                    src="/google-wallet-es.svg"
                    alt="Añadir a Google Wallet"
                    className="h-5 sm:h-6 w-auto"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="w-full border-t border-slate-100 pt-1 text-[8px] text-slate-400 flex items-center justify-between">
                <span className="font-bold text-slate-600 truncate max-w-[140px]">
                  📍 {location.name}
                </span>
                <span className="truncate max-w-[150px]">{location.slug}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
