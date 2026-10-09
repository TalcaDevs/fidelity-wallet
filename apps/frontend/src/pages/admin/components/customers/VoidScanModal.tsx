import { useId, useState, type FormEvent } from 'react';
import {
  OWNER_STAMP_REASON_MAX,
  OWNER_STAMP_REASON_MIN,
  balanceUnit,
  type PurchaseHistoryEntryDto,
  type VoidScanResultDto,
} from '@fidelity/shared';
import { Modal } from '../../../../components/ui/Modal';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { errorMessage } from '../../../../hooks/useAsyncData';
import { formatDateTime } from '../../../../lib/formatDate';
import { voidCustomerScan } from '../../../../services/customersService';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const INPUT =
  'w-full px-4 py-3 bg-panel-surface rounded-xl border border-panel-border focus:outline-none focus:ring-4 focus:ring-panel-accent/20 focus:border-panel-accent text-panel-text font-medium';
const LABEL = 'block text-sm font-bold text-panel-text mb-2';

interface VoidScanModalProps {
  brandId: string;
  customerId: string;
  customerName: string;
  entry: PurchaseHistoryEntryDto;
  onClose: () => void;
  onVoided: (result: VoidScanResultDto) => void;
}

/**
 * Modal para que el dueño anule una carga de sellos o puntos mal realizada.
 * Requiere motivo obligatorio (mínimo 5 caracteres) que queda en AuditLog y en el historial.
 */
export function VoidScanModal({
  brandId,
  customerId,
  customerName,
  entry,
  onClose,
  onVoided,
}: VoidScanModalProps) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonText = reason.trim();
  const reasonProblem =
    reasonText.length < OWNER_STAMP_REASON_MIN
      ? `Indica el motivo (al menos ${OWNER_STAMP_REASON_MIN} caracteres): queda registrado en la auditoría`
      : reasonText.length > OWNER_STAMP_REASON_MAX
        ? `El motivo no puede superar los ${OWNER_STAMP_REASON_MAX} caracteres`
        : null;

  const quantities = [
    entry.stamps > 0 ? `${entry.stamps} ${balanceUnit('STAMPS', entry.stamps)}` : '',
    (entry.points ?? 0) > 0 ? `${entry.points} ${balanceUnit('POINTS', entry.points)}` : '',
  ].filter(Boolean).join(' y ');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (reasonProblem) return;

    setBusy(true);
    setError(null);
    try {
      const result = await voidCustomerScan(customerId, entry.id, brandId, reasonText);
      onVoided(result);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const modalTitle =
    entry.stamps > 0 && (entry.points ?? 0) > 0
      ? 'Anular carga de sellos y puntos'
      : (entry.points ?? 0) > 0
        ? 'Anular carga de puntos'
        : 'Anular carga de sellos';

  return (
    <Modal
      title={modalTitle}
      description={`Anula la carga realizada a ${customerName}. Esta acción descuenta el saldo y queda auditada.`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-4 rounded-2xl bg-panel-soft/60 border border-panel-border space-y-2 text-sm">
          <div className="flex justify-between items-center text-panel-text font-bold">
            <span>Carga a anular:</span>
            <span className="text-panel-accent">{quantities || 'Carga'}</span>
          </div>
          <div className="flex justify-between items-center text-panel-muted text-xs">
            <span>Fecha y hora:</span>
            <span>{formatDateTime(entry.createdAt)}</span>
          </div>
          <div className="flex justify-between items-center text-panel-muted text-xs">
            <span>Sucursal:</span>
            <span>{entry.locationName}</span>
          </div>
          {entry.purchaseAmount !== null && (
            <div className="flex justify-between items-center text-panel-muted text-xs">
              <span>Monto compra:</span>
              <span className="font-semibold">{clp.format(entry.purchaseAmount)}</span>
            </div>
          )}
          {entry.note && (
            <div className="text-xs text-panel-muted pt-1 border-t border-panel-border/50">
              <span className="font-bold">Nota original:</span> “{entry.note}”
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
          <p className="font-bold mb-1">Aviso importante</p>
          <p>
            Al confirmar, se descontarán los sellos o puntos correspondientes, la tarjeta digital del
            cliente se actualizará y quedará un registro permanente en el registro de auditoría.
          </p>
        </div>

        <div>
          <label htmlFor={reasonId} className={LABEL}>
            Motivo de la anulación <span className="text-rose-500">*</span>
          </label>
          <textarea
            id={reasonId}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Carga duplicada por error de tipeo en caja"
            maxLength={OWNER_STAMP_REASON_MAX}
            aria-invalid={submitted && Boolean(reasonProblem)}
            aria-describedby={submitted && reasonProblem ? `${reasonId}-err` : undefined}
            className={`${INPUT} resize-none`}
          />
          <div className="flex justify-between items-center mt-1 text-xs">
            {submitted && reasonProblem ? (
              <span id={`${reasonId}-err`} role="alert" className="text-rose-500 font-semibold">
                {reasonProblem}
              </span>
            ) : (
              <span className="text-panel-muted">Mínimo {OWNER_STAMP_REASON_MIN} caracteres</span>
            )}
            <span className="text-panel-muted ml-auto">
              {reasonText.length} / {OWNER_STAMP_REASON_MAX}
            </span>
          </div>
        </div>

        {error && (
          <div role="alert" aria-live="assertive">
            <ErrorAlert message={error} />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl font-bold bg-panel-soft text-panel-text hover:bg-panel-border/60 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Anulando...</span>
              </>
            ) : (
              'Confirmar anulación'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
