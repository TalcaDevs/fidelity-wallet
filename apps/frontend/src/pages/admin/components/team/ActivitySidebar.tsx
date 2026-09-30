import { useCallback, useEffect } from 'react';
import type { StaffActivityDto, StaffMemberDto, StaffScanType } from '@fidelity/shared';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { formatDateTime } from '../../../../lib/formatDate';

const SCAN_LABELS: Record<StaffScanType, string> = {
  STAMP_ADDED: 'Sello entregado',
  REWARD_REDEEMED: 'Premio canjeado',
};

const METHOD_LABELS: Record<StaffActivityDto['method'], string> = {
  QR: 'QR',
  MANUAL: 'Ingreso manual',
};

/** Se monta por miembro (key = userId): cada apertura carga su propia actividad. */
export function ActivitySidebar({
  member,
  onClose,
  onLoadActivity,
}: {
  member: StaffMemberDto;
  onClose: () => void;
  onLoadActivity: (userId: string) => Promise<StaffActivityDto[]>;
}) {
  const fetcher = useCallback(() => onLoadActivity(member.userId), [onLoadActivity, member.userId]);
  const { data, loading, error } = useAsyncData(fetcher);
  const activity = data ?? [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
        className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <h2 id="activity-title" className="text-xl font-bold text-slate-900 dark:text-white">Actividad reciente</h2>
            <p className="text-sm text-slate-500 truncate">{member.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
            </div>
          ) : error ? (
            <ErrorAlert message={error} />
          ) : activity.length === 0 ? (
            <p className="text-center py-12 text-slate-500 font-medium">No hay actividad registrada para este usuario.</p>
          ) : (
            <ul className="space-y-5">
              {activity.map((scan) => (
                <li key={scan.id} className="flex gap-4">
                  <div className={`w-2 rounded-full shrink-0 ${scan.type === 'STAMP_ADDED' ? 'bg-brand-blue' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="font-bold text-slate-900 dark:text-white">{SCAN_LABELS[scan.type]}</p>
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{formatDateTime(scan.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {scan.locationName} · Cliente {scan.customerPhone ?? 'sin teléfono'}
                    </p>
                    {scan.promotionName && <p className="text-sm text-slate-500 mt-0.5">Premio: {scan.promotionName}</p>}
                    <span className="inline-block mt-2 text-[10px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {METHOD_LABELS[scan.method]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
