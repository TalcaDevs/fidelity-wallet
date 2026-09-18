import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { PromotionSettings } from './PromotionSettings';

export interface Promotion {
  id: string;
  merchantId: string;
  name: string;
  targetStamps: number;
  rewardName: string;
  isActive: boolean;
  createdAt: string;
}

export function PromotionsModule({ session }: { session: Session | null }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPromotions = useCallback(async (merchantId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('Promotion')
        .select('*')
        .eq('merchantId', merchantId)
        .order('createdAt', { ascending: false });
      
      if (fetchError) throw fetchError;
      if (data) {
        setPromotions(data);
      }
    } catch (err: any) {
      console.error('Error fetching promotions:', err);
      setError('Error al cargar las promociones');
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPromotions(session.user.id);
    }
  }, [session, fetchPromotions]);

  const handleOpenModal = (id: string | null = null) => {
    setEditingPromoId(id);
    setIsModalOpen(true);
  };

  const togglePromotionStatus = async (promoId: string, currentStatus: boolean) => {
    try {
      setError(null);
      const { error: updateError } = await supabase.from('Promotion').update({ isActive: !currentStatus }).eq('id', promoId);
      if (updateError) throw updateError;
      if (session?.user?.id) fetchPromotions(session.user.id);
    } catch (err: any) {
      console.error('Error toggling status:', err);
      setError('Error al actualizar el estado de la promoción');
    }
  };

  return (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <PromotionSettings 
              merchantId={session?.user?.id || ''} 
              promoId={editingPromoId}
              onClose={() => {
                setIsModalOpen(false);
                setEditingPromoId(null);
                if (session?.user?.id) {
                  fetchPromotions(session.user.id);
                }
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

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
          {error}
        </div>
      )}

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
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                    </div>
                    <p className="text-lg font-bold text-slate-600 dark:text-slate-300">No tienes promociones registradas aún.</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Crea tu primera promoción para empezar.</p>
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
                          <p className="font-bold text-slate-900 dark:text-slate-100">{promo.rewardName}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Objetivo: {promo.targetStamps} Sellos</p>
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
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
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
