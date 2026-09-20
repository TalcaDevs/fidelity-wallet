import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ErrorAlert } from '../components/ui/ErrorAlert';

const MIN_LENGTH = 8;

export function UpdatePassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < MIN_LENGTH) {
      setErrorMsg(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    onDone();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#15202b] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-blue flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-brand-blue/30">
            W
          </div>
        </div>
        <h2 className="mt-2 text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Crea tu nueva contraseña
        </h2>
        <p className="mt-3 text-base text-slate-500 dark:text-slate-400 font-medium">
          Después de guardarla entrarás directo al panel.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-brand-slate py-10 px-6 sm:px-12 shadow-2xl shadow-brand-blue/5 dark:shadow-black/50 sm:rounded-3xl border border-slate-100 dark:border-brand-slate/50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="new-password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                Repite la contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="appearance-none block w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && <ErrorAlert message={errorMsg} />}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-brand-blue/20 text-base font-bold text-white bg-brand-blue hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-brand-blue/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
