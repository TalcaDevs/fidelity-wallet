import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { ROUTES, passwordResetUrl } from '../components/routing/routePaths';
import { AuthFrame } from './AuthFrame';
import {
  AUTH_DIVIDER,
  AUTH_DIVIDER_LINE,
  AUTH_DIVIDER_TEXT,
  AUTH_FIELD,
  AUTH_LABEL,
  AUTH_OAUTH_BUTTON,
  AUTH_SUBMIT,
} from './authStyles';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function SupabaseAuth() {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const redirectTarget = window.location.search
        ? `${ROUTES.admin}${window.location.search}`
        : ROUTES.admin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectTarget}`,
        },
      });
      if (error) setErrorMsg(error.message);
    } catch {
      setErrorMsg('No pudimos conectar con Google. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
      <form className="space-y-5" aria-busy={isLoading || isGoogleLoading} onSubmit={mode === 'login' ? handleSubmit : handleResetRequest}>
        {mode === 'login' && (
          <div>
            <button
              type="button"
              disabled={isLoading || isGoogleLoading}
              onClick={handleGoogleSignIn}
              className={AUTH_OAUTH_BUTTON}
            >
              <GoogleIcon className="h-5 w-5 shrink-0" />
              <span>{isGoogleLoading ? 'Conectando con Google…' : 'Continuar con Google'}</span>
            </button>
            <div className={AUTH_DIVIDER}>
              <div className={AUTH_DIVIDER_LINE} />
              <span className={AUTH_DIVIDER_TEXT}>o con tu correo</span>
            </div>
          </div>
        )}
        <div>
          <label htmlFor="login-email" className={AUTH_LABEL}>Correo electrónico</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required disabled={isLoading || isGoogleLoading} value={email} onChange={(event) => setEmail(event.target.value)} className={AUTH_FIELD} placeholder="tu@comercio.cl" />
        </div>
        {mode === 'login' && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="text-sm font-semibold text-panel-text">Contraseña</label>
              <button type="button" onClick={() => switchMode('reset')} disabled={isLoading || isGoogleLoading} className="text-xs font-semibold text-panel-accent transition-colors hover:underline disabled:opacity-60">¿Olvidaste tu contraseña?</button>
            </div>
            <div className="relative">
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={isLoading || isGoogleLoading} value={password} onChange={(event) => setPassword(event.target.value)} className={`${AUTH_FIELD} pr-20`} placeholder="Tu contraseña" />
              <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)} disabled={isLoading || isGoogleLoading} className="absolute inset-y-1 right-1 rounded-lg px-3 text-[11px] font-semibold text-panel-muted transition-colors hover:text-panel-accent">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </div>
        )}
        {noticeMsg && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{noticeMsg}</p>}
        {errorMsg && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{errorMsg}</p>}
        <button type="submit" disabled={isLoading || isGoogleLoading} className={AUTH_SUBMIT}>
          {mode === 'login' ? (isLoading ? 'Iniciando sesión…' : 'Entrar a mi cuenta') : (isLoading ? 'Enviando enlace…' : 'Enviar enlace de recuperación')}
          {!isLoading && <span aria-hidden="true">→</span>}
        </button>
        {mode === 'reset' ? (
          <button type="button" onClick={() => switchMode('login')} disabled={isLoading || isGoogleLoading} className="mx-auto block py-1 text-xs font-semibold text-panel-accent hover:underline disabled:opacity-60">← Volver a iniciar sesión</button>
        ) : (
          <p className="text-center text-xs leading-relaxed text-panel-muted">Para el dueño y el equipo de tu comercio.</p>
        )}
      </form>
    </AuthFrame>
  );
}
