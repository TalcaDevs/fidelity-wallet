import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { AuthFrame } from './AuthFrame';
import { AUTH_FIELD, AUTH_LABEL, AUTH_SUBMIT } from './authStyles';

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
    <AuthFrame title="Crea tu nueva contraseña" description="Después de guardarla entrarás directo al panel.">
      <form aria-busy={isLoading} className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="new-password" className={AUTH_LABEL}>
            Nueva contraseña
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_FIELD}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className={AUTH_LABEL}>
            Repite la contraseña
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={AUTH_FIELD}
            placeholder="••••••••"
          />
        </div>

        {errorMsg && <ErrorAlert message={errorMsg} />}

        <button
          type="submit"
          disabled={isLoading}
          className={AUTH_SUBMIT}
        >
          {isLoading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthFrame>
  );
}
