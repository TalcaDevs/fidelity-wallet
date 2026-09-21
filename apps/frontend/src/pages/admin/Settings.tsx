import React, { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getMerchant, updateMerchantSettings } from '../../services/merchantService';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { isValidStampValidityDays } from '../../lib/stampExpiry';
import { useToast } from '../../hooks/useToast';

// Un select con plazos redondos en vez de un input libre de días: el dueño
// piensa en meses ("los sellos duran 3 meses"), no en 90 días, y así no puede
// escribir un valor absurdo. Guardamos días porque es lo que vive en la BD.
const VALIDITY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Sin vencimiento' },
  { value: 30, label: '1 mes (30 días)' },
  { value: 60, label: '2 meses (60 días)' },
  { value: 90, label: '3 meses (90 días)' },
  { value: 180, label: '6 meses (180 días)' },
  { value: 365, label: '12 meses (365 días)' },
];

const NO_EXPIRY = '';

export function Settings({ session, merchantId }: { session: Session | null; merchantId: string | null }) {
  const { notifySuccess } = useToast();

  const [name, setName] = useState('');
  const [stampValidityDays, setStampValidityDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchant = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const merchant = await getMerchant(id);
      setName(merchant?.name ?? '');
      setStampValidityDays(merchant?.stampValidityDays ?? null);
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

    if (!isValidStampValidityDays(stampValidityDays)) {
      setError('La vigencia de los sellos debe ser un número entero de días mayor que cero.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateMerchantSettings(merchantId, { name: name.trim(), stampValidityDays });
      notifySuccess('Configuración del local actualizada.');
    } catch (err) {
      console.error('Error updating merchant:', err);
      setError(err instanceof Error ? err.message : 'No pudimos guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  // Un local puede tener un plazo que no está entre los preajustes (cargado a
  // mano en la BD); lo agregamos para no pisárselo al guardar.
  const options = VALIDITY_OPTIONS.some((option) => option.value === stampValidityDays)
    ? VALIDITY_OPTIONS
    : [...VALIDITY_OPTIONS, { value: stampValidityDays, label: `${stampValidityDays} días` }];

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
              <label htmlFor="stamp-validity" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                Vigencia de los Sellos
              </label>
              <select
                id="stamp-validity"
                value={stampValidityDays === null ? NO_EXPIRY : String(stampValidityDays)}
                onChange={(e) => setStampValidityDays(e.target.value === NO_EXPIRY ? null : Number(e.target.value))}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-800 dark:text-slate-100 font-medium text-lg"
              >
                {options.map((option) => (
                  <option key={option.value ?? NO_EXPIRY} value={option.value === null ? NO_EXPIRY : String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                {stampValidityDays === null
                  ? 'Los sellos de tu local no vencen: tus clientes pueden juntarlos sin apuro.'
                  : `Cada sello vence ${stampValidityDays} días después de que el cliente lo gana.`}
                {' '}Aplica a todas tus promociones. Los sellos ya entregados no cambian si después
                modificas este valor: su vencimiento queda fijado en el momento en que se dan.
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
