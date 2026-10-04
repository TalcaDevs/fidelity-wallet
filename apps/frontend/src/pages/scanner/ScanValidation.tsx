import { useId, useState } from 'react';
import {
  OWNER_STAMP_REASON_MAX,
  OWNER_STAMP_REASON_MIN,
  PURCHASE_AMOUNT_MAX,
  PURCHASE_NOTE_MAX,
  RECEIPT_MIME_TYPES,
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

/**
 * Paso entre el escaneo y el sello: el cajero ve a quién escaneó y puede registrar la compra.
 * Nada se suma hasta "Agregar sello"; "Escanear otro" descarta y vuelve a la cámara (una mesa
 * que divide la cuenta: cada cliente con su tarjeta).
 */
export function ScanValidation({ validation, onAddStamp, onScanAnother, onRedeem }: ScanValidationProps) {
  const ids = useId();
  const isOwnerLoad = validation.maxStampsPerLoad > 1;
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

  const needsReason = isOwnerLoad && (stampCount > 1 || validation.reasonRequired);
  const reasonText = reason.trim();
  const reasonProblem =
    needsReason && reasonText.length < OWNER_STAMP_REASON_MIN
      ? `Indica el motivo (al menos ${OWNER_STAMP_REASON_MIN} caracteres): queda registrado`
      : null;
  const amountValue = amount ? Number(amount) : undefined;
  const amountProblem =
    amountValue !== undefined && amountValue > PURCHASE_AMOUNT_MAX ? 'El monto es demasiado alto' : null;
  const progress = Math.min(100, Math.round((validation.stampsCount / Math.max(1, validation.targetStamps)) * 100));

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
    if (!validation.canStamp || preparingReceipt || reasonProblem || amountProblem) return;
    onAddStamp({
      purchaseAmount: amountValue,
      note: note.trim() || undefined,
      receipt: receipt ?? undefined,
      ...(isOwnerLoad ? { stampCount, reason: reasonText || undefined } : {}),
    });
  };

  const inputClass =
    'w-full bg-slate-800 border-2 border-slate-700 focus:border-blue-500 rounded-2xl px-4 py-3 text-base font-medium text-white outline-none placeholder:text-slate-500';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto pt-2 pb-4 space-y-4">
        <section aria-label="Cliente" className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <div aria-hidden="true" className="w-14 h-14 shrink-0 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-black">
              {validation.hasName ? validation.customerLabel.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Cliente</p>
              <h2 className="text-2xl font-black truncate">{validation.customerLabel || 'Sin nombre'}</h2>
              <p className="text-slate-400 text-sm font-medium">
                {validation.method === 'QR' ? 'Tarjeta escaneada' : 'Búsqueda manual'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-slate-400 text-sm font-bold">Sellos</span>
              <span className="text-2xl font-black">
                {validation.stampsCount} <span className="text-slate-500 text-lg">/ {validation.targetStamps}</span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Progreso hacia el premio"
              aria-valuemin={0}
              aria-valuemax={validation.targetStamps}
              aria-valuenow={validation.stampsCount}
              className="h-2 rounded-full bg-slate-800 overflow-hidden"
            >
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {validation.rewardUnlocked && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-bold text-amber-200">Puede canjear un premio</p>
              <button
                type="button"
                onClick={onRedeem}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm transition-colors"
              >
                Canjear premio
              </button>
            </div>
          )}
        </section>

        {validation.nextStampAvailableAt && (
          <p role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
            {validation.canStamp
              ? `Ya sumó un sello hace poco. Puedes sumar otro indicando el motivo.`
              : `Este cliente ya recibió un sello. Podrá sumar otro a las ${timeOf(validation.nextStampAvailableAt)}.`}
          </p>
        )}

        <section aria-label="Datos de la compra" className="space-y-4">
          {isOwnerLoad && (
            <div>
              <span id={`${ids}-count`} className="block text-sm font-bold text-slate-300 mb-2 px-1">Sellos a sumar</span>
              <div role="group" aria-labelledby={`${ids}-count`} className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Un sello menos"
                  disabled={stampCount <= 1}
                  onClick={() => setStampCount((n) => Math.max(1, n - 1))}
                  className="w-12 h-12 rounded-2xl bg-slate-800 text-2xl font-black disabled:opacity-40"
                >
                  −
                </button>
                <output aria-live="polite" className="w-12 text-center text-3xl font-black">{stampCount}</output>
                <button
                  type="button"
                  aria-label="Un sello más"
                  disabled={stampCount >= validation.maxStampsPerLoad}
                  onClick={() => setStampCount((n) => Math.min(validation.maxStampsPerLoad, n + 1))}
                  className="w-12 h-12 rounded-2xl bg-slate-800 text-2xl font-black disabled:opacity-40"
                >
                  +
                </button>
                <span className="text-sm text-slate-500 font-medium">Máximo {validation.maxStampsPerLoad}</span>
              </div>
            </div>
          )}

          {needsReason && (
            <div>
              <label htmlFor={`${ids}-reason`} className="block text-sm font-bold text-slate-300 mb-2 px-1">Motivo</label>
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
                <p id={`${ids}-reason-error`} role="alert" className="text-sm font-bold text-red-400 mt-2 px-1">{reasonProblem}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor={`${ids}-amount`} className="block text-sm font-bold text-slate-300 mb-2 px-1">
              Monto de la compra <span className="font-medium text-slate-500">(opcional)</span>
            </label>
            <div className="flex items-center bg-slate-800 border-2 border-slate-700 focus-within:border-blue-500 rounded-2xl">
              <span aria-hidden="true" className="pl-4 pr-2 text-lg font-bold text-slate-400">$</span>
              <input
                id={`${ids}-amount`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={amount ? clp.format(Number(amount)) : ''}
                onChange={(e) => setAmount(amountDigits(e.target.value))}
                placeholder="0"
                aria-invalid={Boolean(amountProblem)}
                className="w-full min-w-0 bg-transparent pr-4 py-3 text-lg font-bold text-white outline-none placeholder:text-slate-500"
              />
            </div>
            {amountProblem && <p role="alert" className="text-sm font-bold text-red-400 mt-2 px-1">{amountProblem}</p>}
          </div>

          <div>
            <label htmlFor={`${ids}-note`} className="block text-sm font-bold text-slate-300 mb-2 px-1">
              Nota <span className="font-medium text-slate-500">(opcional)</span>
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

          <div>
            <span className="block text-sm font-bold text-slate-300 mb-2 px-1">
              Foto de la boleta <span className="font-medium text-slate-500">(opcional)</span>
            </span>
            {receipt && previewUrl ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-800 border-2 border-slate-700 p-2">
                <img src={previewUrl} alt="Foto de la boleta" className="w-16 h-16 rounded-xl object-cover" />
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-300">{receipt.name}</span>
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-red-300 hover:bg-red-950/40"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <label
                htmlFor={`${ids}-receipt`}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 hover:border-slate-500 py-4 text-slate-300 font-bold cursor-pointer"
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
            {receiptProblem && <p role="alert" className="text-sm font-bold text-red-400 mt-2 px-1">{receiptProblem}</p>}
          </div>
        </section>
      </div>

      <div className="shrink-0 pt-3 space-y-2 border-t border-slate-800">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!validation.canStamp || preparingReceipt}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 rounded-2xl font-black text-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
        >
          {stampCount > 1 ? `Agregar ${stampCount} sellos` : 'Agregar sello'}
        </button>
        <button
          type="button"
          onClick={onScanAnother}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-lg transition-colors"
        >
          Escanear otro sello
        </button>
      </div>
    </div>
  );
}
