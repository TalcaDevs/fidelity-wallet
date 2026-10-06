import { useId, useState } from 'react';
import {
  OWNER_STAMP_REASON_MAX,
  OWNER_STAMP_REASON_MIN,
  PURCHASE_AMOUNT_MAX,
  PURCHASE_NOTE_MAX,
  RECEIPT_MIME_TYPES,
  balanceUnit,
  pointsForAmount,
} from '@fidelity/shared';
import { useFilePreview } from '../../hooks/useFilePreview';
import { prepareReceiptPhoto } from '../../lib/receiptPhoto';
import type { ScanValidation as Validation, StampExtras } from '../../services/scanService';

interface ScanValidationProps {
  validation: Validation;
  onAddStamp: (extras: StampExtras) => void;
  onScanAnother: () => void;
  onRedeem: () => void;
}

const clp = new Intl.NumberFormat('es-CL');

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

/** "12.500" → 12500. Solo dígitos: el monto es en pesos enteros. */
const amountDigits = (raw: string) => raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);

function blockedText(validation: Validation, isPointsBlock: boolean): string {
  if (isPointsBlock) {
    if (validation.canAddPoints) return 'Se sumaron puntos hace un momento. Si es otra compra, indica el motivo.';
    const at = validation.nextPointsAvailableAt!;
    return `Se sumaron puntos hace un momento. Podrás sumar de nuevo a las ${timeOf(at)}.`;
  } else {
    if (validation.canStamp) return 'Ya sumó un sello hace poco. Puedes sumar otro indicando el motivo.';
    const at = validation.nextStampAvailableAt!;
    // El límite diario desbloquea a medianoche: decir "a las 00:00" confunde, se dice "mañana".
    return new Date(at).toDateString() !== new Date().toDateString()
      ? 'Este cliente ya recibió su sello de hoy. Podrá sumar otro mañana.'
      : `Este cliente ya recibió un sello. Podrá sumar otro a las ${timeOf(at)}.`;
  }
}

/**
 * Paso entre el escaneo y el registro.
 */
export function ScanValidation({ validation, onAddStamp, onScanAnother, onRedeem }: ScanValidationProps) {
  const ids = useId();
  
  const hasStamps = validation.stampsEnabled;
  const hasPoints = validation.pointsEnabled;
  const isOwnerLoad = hasStamps && validation.maxStampsPerLoad > 1;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receiptPreview, setReceiptFile] = useFilePreview();
  const receipt = receiptPreview?.file ?? null;
  const [receiptProblem, setReceiptProblem] = useState<string | null>(null);
  const [preparingReceipt, setPreparingReceipt] = useState(false);
  const [stampCount, setStampCount] = useState(1);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const previewUrl = receiptPreview?.url ?? null;

  // En DUAL o STAMPS: si canStamp es falso, forzamos stampCount a 0
  const activeStampCount = (hasStamps && validation.canStamp) ? stampCount : 0;
  
  // Validaciones de Sellos
  const stampsReasonNeeded = hasStamps && (validation.reasonRequired || (isOwnerLoad && activeStampCount > 1));
  const pointsReasonNeeded = hasPoints && validation.pointsReasonRequired;
  // Si cualquiera lo requiere, pedimos motivo
  const needsReason = stampsReasonNeeded || pointsReasonNeeded;
  
  const reasonText = reason.trim();
  const reasonProblem =
    needsReason && reasonText.length < OWNER_STAMP_REASON_MIN
      ? `Indica el motivo (al menos ${OWNER_STAMP_REASON_MIN} caracteres): queda registrado`
      : null;

  // Validaciones de Puntos
  const amountValue = amount ? Number(amount) : undefined;
  const points = hasPoints && amountValue !== undefined ? pointsForAmount(amountValue, validation.pesosPerPoint) : 0;
  
  let amountProblem: string | null = null;
  if (hasPoints && validation.canAddPoints) {
    if (amountValue !== undefined && amountValue > PURCHASE_AMOUNT_MAX) {
      amountProblem = 'El monto es demasiado alto';
    } else if (validation.amountRequired && amountValue === undefined && !hasStamps) {
      amountProblem = 'Ingresa el monto de la compra';
    } else if (amountValue !== undefined && points < 1) {
      amountProblem = `El monto no alcanza para un punto (1 punto cada $${clp.format(validation.pesosPerPoint)})`;
    }
  }

  // La foto de la boleta solo es obligatoria para sumar sellos (si el local lo exige)
  const receiptIsRequired = hasStamps && validation.receiptRequired && validation.canStamp && activeStampCount > 0;
  const receiptMissing = receiptIsRequired && !receipt ? 'Adjunta la foto de la boleta' : null;

  // Progreso (mostramos sellos preferentemente, o puntos si solo hay puntos)
  const primaryBalance = hasStamps ? validation.stampsCount : validation.pointsCount;
  const progress = Math.min(100, Math.round((primaryBalance / Math.max(1, validation.targetStamps)) * 100));

  const handleReceipt = async (file: File | undefined) => {
    if (!file) return;
    setPreparingReceipt(true);
    const result = await prepareReceiptPhoto(file);
    setPreparingReceipt(false);
    setReceiptProblem(result.problem);
    setReceiptFile(result.file);
  };

  const handleAdd = () => {
    setSubmitted(true);
    // Verificar si no hay nada que agregar
    if (!validation.canStamp && !validation.canAddPoints) return;
    if (preparingReceipt || reasonProblem || amountProblem || receiptMissing) return;
    
    // Si la tarjeta es solo puntos pero no ingresó monto, no podemos sumar nada
    if (!hasStamps && hasPoints && amountValue === undefined) return;
    // En dual, si no ingresa monto ni suma sellos, no hace nada
    if (hasStamps && hasPoints && activeStampCount === 0 && amountValue === undefined) return;

    onAddStamp({
      ...(amountValue !== undefined ? { purchaseAmount: amountValue } : {}),
      note: note.trim() || undefined,
      receipt: receipt ?? undefined,
      stampCount: activeStampCount,
      ...(needsReason ? { reason: reasonText || undefined } : {}),
    });
  };

  const inputClass =
    'w-full bg-panel-soft border-2 border-panel-border focus:border-panel-accent rounded-2xl px-4 py-3 text-base font-medium text-panel-text outline-none placeholder:text-panel-muted';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div data-entry-stagger className="flex-1 overflow-y-auto pt-2 pb-4 space-y-4">
        <section aria-label="Cliente" className="bg-panel-surface border border-panel-border rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <div aria-hidden="true" className="w-14 h-14 shrink-0 rounded-2xl bg-panel-primary text-white flex items-center justify-center text-2xl font-extrabold">
              {validation.hasName ? validation.customerLabel.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-panel-muted text-xs font-bold uppercase tracking-widest">Cliente</p>
              <h2 className="text-2xl font-extrabold truncate">{validation.customerLabel || 'Sin nombre'}</h2>
              <p className="text-panel-muted text-sm font-medium">
                {validation.method === 'QR' ? 'Tarjeta escaneada' : 'Búsqueda manual'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-panel-muted text-sm font-bold">Progreso a recompensa</span>
              <span className="text-2xl font-extrabold">
                {primaryBalance} <span className="text-panel-muted text-lg">/ {validation.targetStamps}</span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Progreso hacia el premio"
              aria-valuemin={0}
              aria-valuemax={validation.targetStamps}
              aria-valuenow={primaryBalance}
              className="h-2 rounded-full bg-panel-soft overflow-hidden"
            >
              <div className="h-full rounded-full bg-panel-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {validation.rewardUnlocked && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-bold text-panel-gold">Puede canjear un premio</p>
              <button
                type="button"
                onClick={onRedeem}
                className="shrink-0 min-h-11 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-sm transition-colors"
              >
                Canjear premio
              </button>
            </div>
          )}
        </section>

        {hasStamps && validation.nextStampAvailableAt && (
          <p role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-panel-gold">
            {blockedText(validation, false)}
          </p>
        )}
        
        {hasPoints && validation.nextPointsAvailableAt && (
          <p role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-panel-gold">
            {blockedText(validation, true)}
          </p>
        )}

        <section aria-label="Datos de la compra" className="space-y-4 rounded-3xl border border-panel-border bg-panel-surface p-5">
          {hasStamps && validation.canStamp && isOwnerLoad && (
            <div>
              <span id={`${ids}-count`} className="block text-sm font-bold text-panel-muted mb-2 px-1">Sellos a sumar</span>
              <div role="group" aria-labelledby={`${ids}-count`} className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Un sello menos"
                  disabled={stampCount <= 1}
                  onClick={() => setStampCount((n) => Math.max(1, n - 1))}
                  className="w-12 h-12 rounded-2xl bg-panel-soft text-2xl font-extrabold disabled:opacity-40"
                >
                  −
                </button>
                <output aria-live="polite" className="w-12 text-center text-3xl font-extrabold">{stampCount}</output>
                <button
                  type="button"
                  aria-label="Un sello más"
                  disabled={stampCount >= validation.maxStampsPerLoad}
                  onClick={() => setStampCount((n) => Math.min(validation.maxStampsPerLoad, n + 1))}
                  className="w-12 h-12 rounded-2xl bg-panel-soft text-2xl font-extrabold disabled:opacity-40"
                >
                  +
                </button>
                <span className="text-sm text-panel-muted font-medium">Máximo {validation.maxStampsPerLoad}</span>
              </div>
            </div>
          )}

          {(hasPoints ? validation.canAddPoints : validation.canStamp) && (
            <div>
              <label htmlFor={`${ids}-amount`} className="block text-sm font-bold text-panel-muted mb-2 px-1">
                Monto de la compra{' '}
                {!validation.amountRequired && <span className="font-medium text-panel-muted">(opcional)</span>}
              </label>
              <div className="flex items-center bg-panel-soft border-2 border-panel-border focus-within:border-panel-accent rounded-2xl">
                <span aria-hidden="true" className="pl-4 pr-2 text-lg font-bold text-panel-muted">$</span>
                <input
                  id={`${ids}-amount`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amount ? clp.format(Number(amount)) : ''}
                  onChange={(e) => setAmount(amountDigits(e.target.value))}
                  placeholder="0"
                  aria-invalid={Boolean(amountProblem)}
                  className="w-full min-w-0 bg-transparent pr-4 py-3 text-lg font-bold text-panel-text outline-none placeholder:text-panel-muted"
                />
              </div>
              {hasPoints && points > 0 && !amountProblem && (
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-2 px-1">
                  Suma {clp.format(points)} {balanceUnit('POINTS', points)} (1 punto cada ${clp.format(validation.pesosPerPoint)})
                </p>
              )}
              {amountProblem && (submitted || amountValue !== undefined) && (
                <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400 mt-2 px-1">{amountProblem}</p>
              )}
            </div>
          )}

          {needsReason && (
            <div>
              <label htmlFor={`${ids}-reason`} className="block text-sm font-bold text-panel-muted mb-2 px-1">Motivo</label>
              <textarea
                id={`${ids}-reason`}
                rows={2}
                maxLength={OWNER_STAMP_REASON_MAX}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej.: compensación por un reclamo"
                aria-invalid={submitted && Boolean(reasonProblem)}
                aria-describedby={submitted && reasonProblem ? `${ids}-reason-error` : undefined}
                className={`${inputClass} resize-none`}
              />
              {submitted && reasonProblem && (
                <p id={`${ids}-reason-error`} role="alert" className="text-sm font-bold text-red-600 dark:text-red-400 mt-2 px-1">{reasonProblem}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor={`${ids}-note`} className="block text-sm font-bold text-panel-muted mb-2 px-1">
              Nota <span className="font-medium text-panel-muted">(opcional)</span>
            </label>
            <textarea
              id={`${ids}-note`}
              rows={2}
              maxLength={PURCHASE_NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej.: mesa 4, pagó con tarjeta"
              className={`${inputClass} resize-none`}
            />
          </div>

          {(validation.canStamp || validation.canAddPoints) && (
            <div>
              <span className="block text-sm font-bold text-panel-muted mb-2 px-1">
                Foto de la boleta{' '}
                {!receiptIsRequired && <span className="font-medium text-panel-muted">(opcional)</span>}
              </span>
              {receipt && previewUrl ? (
                <div className="flex items-center gap-3 rounded-2xl bg-panel-soft border-2 border-panel-border p-2">
                  <img src={previewUrl} alt="Foto de la boleta" className="w-16 h-16 rounded-xl object-cover" />
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-panel-muted">{receipt.name}</span>
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    className="px-3 py-2 rounded-xl text-sm font-bold text-red-600 dark:text-red-300 hover:bg-red-950/40"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <label
                  htmlFor={`${ids}-receipt`}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-panel-border hover:border-panel-accent/50 has-[+input:focus-visible]:outline-2 has-[+input:focus-visible]:outline-panel-accent py-4 text-panel-muted font-bold cursor-pointer"
                >
                  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Tomar foto de la boleta
                </label>
              )}
              <input
                id={`${ids}-receipt`}
                type="file"
                accept={RECEIPT_MIME_TYPES.join(',')}
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void handleReceipt(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {receiptProblem && <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400 mt-2 px-1">{receiptProblem}</p>}
              {!receiptProblem && submitted && receiptMissing && (
                <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400 mt-2 px-1">{receiptMissing}</p>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="shrink-0 pt-3 space-y-2 border-t border-panel-border">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!((hasStamps && validation.canStamp) || (hasPoints && validation.canAddPoints)) || preparingReceipt}
          className="w-full py-4 bg-panel-primary text-white hover:bg-panel-primary/90 disabled:opacity-40 disabled:hover:bg-panel-primary rounded-2xl font-extrabold text-xl shadow-lg shadow-panel-primary/15 transition-colors"
        >
          {hasPoints && hasStamps
            ? 'Registrar operación'
            : hasPoints
              ? points > 0 ? `Sumar ${clp.format(points)} ${balanceUnit('POINTS', points)}` : 'Sumar puntos'
              : stampCount > 1 ? `Agregar ${stampCount} sellos` : 'Agregar sello'}
        </button>
        <button
          type="button"
          onClick={onScanAnother}
          className="w-full py-4 bg-panel-soft hover:bg-panel-border/60 rounded-2xl font-bold text-lg transition-colors"
        >
          Escanear otro cliente
        </button>
      </div>
    </div>
  );
}
