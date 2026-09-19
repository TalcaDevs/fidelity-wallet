import React, { useEffect, useState, useCallback } from 'react';
import { createPromotion, getPromotion, updatePromotion } from '../../services/promotionsService';
import { ErrorAlert } from '../../components/ui/ErrorAlert';

export function PromotionSettings({ onClose, merchantId, promoId }: { onClose: () => void, merchantId: string, promoId?: string | null }) {
  const [targetStamps, setTargetStamps] = useState(8);
  const [rewardName, setRewardName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPromotion = useCallback(async () => {
    if (!promoId) return;
    try {
      const data = await getPromotion(promoId);
      if (data) {
        setTargetStamps(data.targetStamps);
        setRewardName(data.rewardName);
      }
    } catch (err) {
      console.error('Error fetching promotion:', err);
      setError('Error al cargar la promoción');
    }
  }, [promoId]);

  useEffect(() => {
    if (merchantId && promoId) {
      fetchPromotion();
    }
  }, [merchantId, promoId, fetchPromotion]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const values = { targetStamps, rewardName };
      if (promoId) {
        await updatePromotion(promoId, values);
      } else {
        await createPromotion(merchantId, values);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al guardar la promoción');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-brand-slate rounded-3xl border border-slate-100 dark:border-brand-slate/50 shadow-2xl shadow-brand-blue/10 dark:shadow-black/50 p-8 max-w-xl w-[450px] relative">
      {error && <ErrorAlert message={error} />}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <div className="mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-brand-yellow/10 dark:bg-brand-yellow/20 rounded-2xl mb-4 text-brand-yellow">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Regla de Promoción</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Configura la meta que debe alcanzar tu cliente.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            Nombre del Premio
          </label>
          <input
            type="text"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-800 dark:text-slate-100 font-medium text-lg placeholder-slate-400"
            placeholder="ej. 1 Producto Gratis, 20% dcto..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            Sellos Requeridos
          </label>
          <div className="flex items-center gap-6">
            <input
              type="range"
              min="2"
              max="20"
              value={targetStamps}
              onChange={(e) => setTargetStamps(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-orange"
            />
            <div className="w-16 h-12 flex items-center justify-center bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange font-black text-xl rounded-xl">
              {targetStamps}
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
            El cliente recibirá su premio al completar {targetStamps} compras.
          </p>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800/50">
          <div className="bg-gradient-to-br from-brand-blue/5 to-brand-blue/10 dark:from-brand-blue/10 dark:to-brand-blue/20 p-6 rounded-2xl border border-brand-blue/10 flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-brand-blue dark:text-blue-400 uppercase tracking-wider mb-1">Vista Previa:</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-snug">
                "Por cada {targetStamps} compras, lleva {rewardName}"
              </p>
            </div>
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg text-2xl flex-shrink-0 ml-4">
              🎁
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-brand-blue text-white font-bold text-lg py-4 px-6 rounded-2xl hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-brand-blue/30 transition-all active:scale-[0.98] shadow-lg shadow-brand-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
