import React, { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getMerchant, updateMerchantName } from '../../services/merchantService';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useToast } from '../../hooks/useToast';

export function Settings({ session }: { session: Session | null }) {
  const merchantId = session?.user?.id;
  const { notifySuccess } = useToast();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchant = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const merchant = await getMerchant(id);
      setName(merchant?.name ?? '');
    } catch (err) {
      console.error('Error fetching merchant:', err);
      setError('No pudimos cargar los datos de tu local.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (merchantId) fetchMerchant(merchantId);
  }, [merchantId, fetchMerchant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId) return;

    setIsSaving(true);
    setError(null);
    try {
      await updateMerchantName(merchantId, name.trim());
      notifySuccess('Nombre del local actualizado.');
    } catch (err) {
      console.error('Error updating merchant:', err);
      setError(err instanceof Error ? err.message : 'No pudimos guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Los datos de tu local, tal como los verán tus clientes.</p>
      </header>

      {error && <ErrorAlert message={error} />}

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            <div className="h-6 w-40 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
            <div className="h-14 w-full rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div>
              <label htmlFor="merchant-name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                Nombre del Local
              </label>
              <input
                id="merchant-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-800 dark:text-slate-100 font-medium text-lg placeholder-slate-400"
                placeholder="ej. Café Central"
                required
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Este nombre aparece en la tarjeta que tus clientes guardan en su billetera y en la página donde se registran.
              </p>
            </div>

            <div>
              <span className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                Correo de la cuenta
              </span>
              <p className="px-5 py-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                {session?.user?.email}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
