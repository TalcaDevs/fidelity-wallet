import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { passwordResetUrl } from '../components/routing/routePaths';
import { AuthFrame } from './AuthFrame';
import { AUTH_FIELD, AUTH_LABEL, AUTH_SUBMIT } from './authStyles';

export function SupabaseAuth() {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMsg(error.message);
    } catch {
      setErrorMsg('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: passwordResetUrl(),
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      // Neutro: no confirma si el correo tiene una cuenta.
      setNoticeMsg('Si ese correo tiene una cuenta, le enviamos un enlace para restablecer la contraseña.');
    } catch {
      setErrorMsg('No pudimos conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'reset') => {
    setMode(next);
    setShowPassword(false);
    setErrorMsg('');
    setNoticeMsg('');
  };

  return (
    <AuthFrame
      title={mode === 'login' ? 'Inicia sesión' : 'Recupera tu acceso'}
      description={mode === 'login' ? 'Entra con el correo de tu cuenta para seguir con tu negocio.' : 'Te enviamos un enlace para crear una contraseña nueva.'}
    >
      <form className="space-y-5" aria-busy={isLoading} onSubmit={mode === 'login' ? handleSubmit : handleResetRequest}>
        <div>
          <label htmlFor="login-email" className={AUTH_LABEL}>Correo electrónico</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required disabled={isLoading} value={email} onChange={(event) => setEmail(event.target.value)} className={AUTH_FIELD} placeholder="tu@comercio.cl" />
        </div>
        {mode === 'login' && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="text-sm font-semibold text-panel-text">Contraseña</label>
              <button type="button" onClick={() => switchMode('reset')} disabled={isLoading} className="text-xs font-semibold text-panel-accent transition-colors hover:underline disabled:opacity-60">¿Olvidaste tu contraseña?</button>
            </div>
            <div className="relative">
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={isLoading} value={password} onChange={(event) => setPassword(event.target.value)} className={`${AUTH_FIELD} pr-20`} placeholder="Tu contraseña" />
              <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)} className="absolute inset-y-1 right-1 rounded-lg px-3 text-[11px] font-semibold text-panel-muted transition-colors hover:text-panel-accent">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </div>
        )}
        {noticeMsg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{noticeMsg}</p>}
        {errorMsg && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{errorMsg}</p>}
        <button type="submit" disabled={isLoading} className={AUTH_SUBMIT}>
          {mode === 'login' ? (isLoading ? 'Iniciando sesión…' : 'Entrar a mi cuenta') : (isLoading ? 'Enviando enlace…' : 'Enviar enlace de recuperación')}
          {!isLoading && <span aria-hidden="true">→</span>}
        </button>
        {mode === 'reset' ? (
          <button type="button" onClick={() => switchMode('login')} disabled={isLoading} className="mx-auto block py-1 text-xs font-semibold text-panel-accent hover:underline disabled:opacity-60">← Volver a iniciar sesión</button>
        ) : (
          <p className="text-center text-xs leading-relaxed text-panel-muted">Para el dueño y el equipo de tu comercio.</p>
        )}
      </form>
    </AuthFrame>
  );
}
