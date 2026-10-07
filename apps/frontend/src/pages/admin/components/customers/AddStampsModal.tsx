import { useCallback, useId, useMemo, useState, type FormEvent } from 'react';
import {
  OWNER_STAMP_REASON_MAX,
  POINTS_PER_SCAN_MAX,
  OWNER_STAMP_REASON_MIN,
  PURCHASE_AMOUNT_MAX,
  PURCHASE_NOTE_MAX,
  RECEIPT_MIME_TYPES,
  balanceUnit,
  type CardType,
  type PanelStampsResultDto,
} from '@fidelity/shared';
import { Modal } from '../../../../components/ui/Modal';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { errorMessage, useAsyncData } from '../../../../hooks/useAsyncData';
import { addStampsFromPanel } from '../../../../services/customersService';
import { prepareReceiptPhoto } from '../../../../lib/receiptPhoto';
import { listBrandLocations } from '../../../../services/locationsService';

interface AddStampsModalProps {
  brandId: string;
  customerId: string;
  customerName: string;
  homeLocationId: string;
  cardType: CardType;
  maxStampsPerLoad: number;
  maxPointsPerLoad?: number;
  stampsEnabled?: boolean;
  pointsEnabled?: boolean;
  onClose: () => void;
  onAdded: (result: PanelStampsResultDto) => void;
}

const clp = new Intl.NumberFormat('es-CL');
const INPUT =
  'w-full px-4 py-3 bg-panel-surface rounded-xl border border-panel-border focus:outline-none focus:ring-4 focus:ring-panel-accent/20 focus:border-panel-accent text-panel-text font-medium';
const LABEL = 'block text-sm font-bold text-panel-text mb-2';

/**
 * El dueño suma sellos sin pasar por la caja. El cliente no está presente, así que el motivo es
 * obligatorio: queda en el historial y en la auditoría.
 */
export function AddStampsModal({
  brandId,
  customerId,
  customerName,
  homeLocationId,
  cardType,
  maxStampsPerLoad,
  maxPointsPerLoad = POINTS_PER_SCAN_MAX,
  stampsEnabled = cardType !== 'POINTS',
  pointsEnabled = cardType === 'POINTS',
  onClose,
  onAdded,
}: AddStampsModalProps) {
  const [currency, setCurrency] = useState<CardType>(stampsEnabled ? 'STAMPS' : 'POINTS');
  const isPoints = currency === 'POINTS';
  const unit = balanceUnit(currency);
  const maxLoad = isPoints ? maxPointsPerLoad : maxStampsPerLoad;
  const ids = useId();
  const [stampCount, setStampCount] = useState(1);
  const [reason, setReason] = useState('');
  const [locationId, setLocationId] = useState(homeLocationId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptProblem, setReceiptProblem] = useState<string | null>(null);
  const [preparingReceipt, setPreparingReceipt] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(() => listBrandLocations(brandId), [brandId]);
  const { data: locations } = useAsyncData(fetchLocations);
  const activeLocations = useMemo(() => (locations ?? []).filter((l) => l.isActive), [locations]);

  // Si el local de registro ya no opera, se propone el primero activo.
  const effectiveLocationId =
    activeLocations.length === 0 || activeLocations.some((l) => l.id === locationId)
      ? locationId
      : activeLocations[0].id;

  const reasonText = reason.trim();
  const reasonProblem =
    reasonText.length < OWNER_STAMP_REASON_MIN
      ? `Indica el motivo (al menos ${OWNER_STAMP_REASON_MIN} caracteres): queda en el historial`
      : null;
  const amountValue = amount ? Number(amount) : undefined;
  const amountProblem =
    amountValue !== undefined && amountValue > PURCHASE_AMOUNT_MAX ? 'El monto es demasiado alto' : null;

  const handleReceipt = async (file: File | undefined) => {
    if (!file) return;
    setPreparingReceipt(true);
    const result = await prepareReceiptPhoto(file);
    setPreparingReceipt(false);
    setReceiptProblem(result.problem);
    setReceipt(result.file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (reasonProblem || amountProblem || !effectiveLocationId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await addStampsFromPanel(customerId, {
        brandId,
        merchantId: effectiveLocationId,
        stampCount,
        currency,
        reason: reasonText,
        purchaseAmount: amountValue,
        note: note.trim() || undefined,
        receipt: receipt ?? undefined,
      });
      onAdded(result);
    } catch (err) {
      setError(errorMessage(err, `No pudimos sumar los ${unit}.`));
      setBusy(false);
    }
  };

  return (
    <Modal trapFocus
      title={`Sumar ${unit}`}
      description={`A ${customerName}. Queda en su historial como sumado desde el panel.`}
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {stampsEnabled && pointsEnabled && <div>
          <label htmlFor={`${ids}-currency`} className={LABEL}>Modalidad a sumar</label>
          <select id={`${ids}-currency`} value={currency} onChange={(e) => { setCurrency(e.target.value as CardType); setStampCount(1); }} className={INPUT}>
            <option value="STAMPS">Sellos</option><option value="POINTS">Puntos</option>
          </select>
        </div>}
        <div>
          <span id={`${ids}-count`} className={LABEL}>{isPoints ? 'Puntos a sumar' : 'Sellos a sumar'}</span>
          {isPoints ? (
            <div className="flex items-center gap-3">
              <input
                aria-labelledby={`${ids}-count`}
                inputMode="numeric"
                value={String(stampCount)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setStampCount(Math.max(1, Math.min(maxLoad, digits ? Number(digits) : 1)));
                }}
                className={`${INPUT} w-36 text-xl font-black tabular-nums`}
              />
              <span className="text-sm text-panel-muted">Máximo {clp.format(maxLoad)} por vez</span>
            </div>
          ) : (
          <div role="group" aria-labelledby={`${ids}-count`} className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Un sello menos"
              disabled={stampCount <= 1}
              onClick={() => setStampCount((n) => Math.max(1, n - 1))}
              className="w-11 h-11 rounded-xl bg-panel-soft text-xl font-black disabled:opacity-40"
            >
              −
            </button>
            <output aria-live="polite" className="w-10 text-center text-3xl font-black text-panel-text tabular-nums">
              {stampCount}
            </output>
            <button
              type="button"
              aria-label="Un sello más"
              disabled={stampCount >= maxStampsPerLoad}
              onClick={() => setStampCount((n) => Math.min(maxLoad, n + 1))}
              className="w-11 h-11 rounded-xl bg-panel-soft text-xl font-black disabled:opacity-40"
            >
              +
            </button>
            <span className="text-sm text-panel-muted">Máximo {maxStampsPerLoad} por vez</span>
          </div>
          )}
        </div>

        <div>
          <label htmlFor={`${ids}-reason`} className={LABEL}>Motivo</label>
          <textarea
            id={`${ids}-reason`}
            rows={2}
            maxLength={OWNER_STAMP_REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: compró sin su tarjeta, compensación por un reclamo"
            aria-invalid={submitted && Boolean(reasonProblem)}
            aria-describedby={submitted && reasonProblem ? `${ids}-reason-error` : undefined}
            className={`${INPUT} resize-none`}
          />
          {submitted && reasonProblem && (
            <p id={`${ids}-reason-error`} role="alert" className="mt-2 text-sm font-bold text-red-600 dark:text-red-400">
              {reasonProblem}
            </p>
          )}
        </div>

        {activeLocations.length > 1 && (
          <div>
            <label htmlFor={`${ids}-location`} className={LABEL}>Local</label>
            <select id={`${ids}-location`} value={effectiveLocationId} onChange={(e) => setLocationId(e.target.value)} className={INPUT}>
              {activeLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${ids}-amount`} className={LABEL}>
              Monto <span className="font-medium text-panel-muted">(opcional)</span>
            </label>
            <input
              id={`${ids}-amount`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={amount ? `$${clp.format(Number(amount))}` : ''}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9))}
              placeholder="$0"
              aria-invalid={Boolean(amountProblem)}
              className={INPUT}
            />
            {amountProblem && <p role="alert" className="mt-2 text-sm font-bold text-red-600">{amountProblem}</p>}
          </div>
          <div>
            <label htmlFor={`${ids}-receipt`} className={LABEL}>
              Foto de la boleta <span className="font-medium text-panel-muted">(opcional)</span>
            </label>
            <input
              id={`${ids}-receipt`}
              type="file"
              accept={RECEIPT_MIME_TYPES.join(',')}
              onChange={(e) => void handleReceipt(e.target.files?.[0])}
              className="block w-full text-sm text-panel-muted file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-panel-soft dark:file:bg-panel-muted/20 file:font-bold"
            />
            {receiptProblem && <p role="alert" className="mt-2 text-sm font-bold text-red-600">{receiptProblem}</p>}
          </div>
        </div>

        <div>
          <label htmlFor={`${ids}-note`} className={LABEL}>
            Nota <span className="font-medium text-panel-muted">(opcional)</span>
          </label>
          <textarea
            id={`${ids}-note`}
            rows={2}
            maxLength={PURCHASE_NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${INPUT} resize-none`}
          />
        </div>

        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-5 py-3 rounded-xl font-bold text-panel-text bg-panel-soft hover:bg-panel-soft"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || preparingReceipt}
            className="px-5 py-3 rounded-xl font-bold text-white bg-panel-primary hover:bg-panel-primary/90 shadow-lg shadow-brand-blue/20 disabled:opacity-50"
          >
            {busy ? 'Sumando…' : `Sumar ${clp.format(stampCount)} ${balanceUnit(currency, stampCount)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
