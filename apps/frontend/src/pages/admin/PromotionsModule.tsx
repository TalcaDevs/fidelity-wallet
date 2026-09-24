import { useEffect, useState, useCallback } from 'react';
import { deletePromotion, listPromotions, setPromotionActive, type Promotion } from '../../services/promotionsService';
import { PromotionSettings } from './PromotionSettings';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../hooks/useToast';

export type { Promotion };

export function PromotionsModule({ merchantId }: { merchantId: string | null }) {
  const { notifySuccess } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoToDelete, setPromoToDelete] = useState<Promotion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPromotions = useCallback(async (merchantId: string) => {
    setLoading(true);
    try {
      const data = await listPromotions(merchantId);
      setPromotions(data);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setError('Error al cargar las promociones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (merchantId) {
      fetchPromotions(merchantId);
    }
  }, [merchantId, fetchPromotions]);

  const handleOpenModal = (id: string | null = null) => {
    setEditingPromoId(id);
    setIsModalOpen(true);
  };

  const togglePromotionStatus = async (promoId: string, currentStatus: boolean) => {
    try {
      setError(null);
      await setPromotionActive(promoId, !currentStatus);
      notifySuccess(currentStatus ? 'Promoción desactivada.' : 'Promoción activada.');
      if (merchantId) fetchPromotions(merchantId);
    } catch (err) {
      console.error('Error toggling status:', err);
      setError('Error al actualizar el estado de la promoción');
    }
  };

  const handleDelete = async () => {
    if (!promoToDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deletePromotion(promoToDelete.id);
      notifySuccess(`Promoción "${promoToDelete.name}" eliminada.`);
      setPromoToDelete(null);
      if (merchantId) fetchPromotions(merchantId);
    } catch (err) {
      console.error('Error deleting promotion:', err);
      setError('Error al eliminar la promoción');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {promoToDelete && (
        <ConfirmDialog
          title="Eliminar promoción"
          message={`Vas a eliminar "${promoToDelete.name}". Esta acción no se puede deshacer y la promoción desaparecerá de tu lista.`}
          confirmLabel="Sí, eliminar"
          isBusy={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setPromoToDelete(null)}
        />
      )}

      {isModalOpen && merchantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="duration-200">
            <PromotionSettings
              merchantId={merchantId}
              promoId={editingPromoId}
              onClose={() => {
                setIsModalOpen(false);
                setEditingPromoId(null);
                fetchPromotions(merchantId);
              }}
            />
          </div>
        </div>
      )}

      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Promociones Activas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Administra las reglas de lealtad y recompensas para tus clientes.</p>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
          className="px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          Nueva Promoción
        </button>
      </header>

      {error && <ErrorAlert message={error} />}

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Regla de Recompensa</th>
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha de Creación</th>
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="p-5">
                      <div className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                    </div>
                    <p className="text-lg font-bold text-slate-600 dark:text-slate-300">No tienes promociones registradas aún.</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">
                      Sin una promoción activa, tus clientes no pueden juntar sellos.
                    </p>
                    <button
                      onClick={() => handleOpenModal(null)}
                      className="px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all"
                    >
                      Crear mi primera promoción
                    </button>
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue font-bold">
                          {promo.targetStamps}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{promo.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {promo.rewardName} · Objetivo: {promo.targetStamps} Sellos
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-slate-600 dark:text-slate-300 font-medium">
                      {new Date(promo.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-5">
                      <button
                        onClick={() => togglePromotionStatus(promo.id, promo.isActive)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                          promo.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mr-2 ${promo.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {promo.isActive ? 'Activa' : 'Pausada'}
                      </button>
                    </td>
                    <td className="p-5 text-right">
                      <button
                        onClick={() => handleOpenModal(promo.id)}
                        className="p-2 text-slate-400 hover:text-brand-blue dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Editar"
                        aria-label={`Editar ${promo.name}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button
                        onClick={() => setPromoToDelete(promo)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar"
                        aria-label={`Eliminar ${promo.name}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
