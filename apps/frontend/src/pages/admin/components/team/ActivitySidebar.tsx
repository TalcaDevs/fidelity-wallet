import { useEffect, useState } from 'react';
import type { StaffMember, ScanActivity } from '../../hooks/useTeam';

export function ActivitySidebar({
  user,
  onClose,
  onLoadActivity,
}: {
  user: StaffMember | null;
  onClose: () => void;
  onLoadActivity: (userId: string) => Promise<ScanActivity[]>;
}) {
  const [activity, setActivity] = useState<ScanActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingActivity(true);
      onLoadActivity(user.userId).then((data) => {
        setActivity(data);
        setLoadingActivity(false);
      });
    }
  }, [user, onLoadActivity]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Actividad Reciente</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loadingActivity ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-slate-500 font-medium">No hay actividad registrada para este usuario.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activity.map(scan => (
                <div key={scan.id} className="flex gap-4 relative">
                  <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center shadow-sm z-10 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700">
                    {scan.type === 'STAMP_ADDED' ? (
                      <svg className="w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {scan.type === 'STAMP_ADDED' ? 'Sello Entregado' : 'Premio Canjeado'}
                      </p>
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        {new Date(scan.createdAt).toLocaleDateString()} {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Cliente: <span className="font-medium">{scan.customerPhone}</span>
                    </p>
                    {scan.promotionName && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        Premio: {scan.promotionName}
                      </p>
                    )}
                    <span className="inline-block mt-2 text-[10px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      Vía {scan.method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
