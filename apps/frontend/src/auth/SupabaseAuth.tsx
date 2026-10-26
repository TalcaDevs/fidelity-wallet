import { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ROUTES, passwordResetUrl } from '../components/routing/routePaths';
import {
  beginExplicitSignIn,
  consumeLogoutReason,
  endExplicitSignIn,
  setLastActivity,
} from '../utils/sessionActivity';
import { AuthFrame } from './AuthFrame';
import { PasswordRequirements, evaluatePassword } from './PasswordRequirements';
import { translateAuthError } from './authErrorTranslator';

const INACTIVITY_LOGOUT_MESSAGE =
  'Tu sesión ha expirado por inactividad (1 hora). Por favor, inicia sesión nuevamente.';
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

export type AuthMode = 'login' | 'register' | 'reset';

export function SupabaseAuth({ initialMode }: { initialMode?: AuthMode }) {
  const location = useLocation();
  const defaultMode: AuthMode =
    initialMode ?? (location.pathname === ROUTES.register ? 'register' : 'login');

  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  useEffect(() => {
    setMode((prev) => {
      if (initialMode) return initialMode;
      if (location.pathname === ROUTES.register) return 'register';
      if (location.pathname === ROUTES.login && prev !== 'reset') return 'login';
      return prev;
    });
  }, [initialMode, location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isUrlInactivity = params.get('reason') === 'inactivity';
    const isStorageInactivity = consumeLogoutReason() === 'inactivity';
    if (isUrlInactivity || isStorageInactivity) {
      setErrorMsg(INACTIVITY_LOGOUT_MESSAGE);
    }
  }, []);

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
      if (error) {
        setErrorMsg(translateAuthError(error));
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Por favor, ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setErrorMsg('Por favor, ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    beginExplicitSignIn();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        setLastActivity(Date.now());
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      endExplicitSignIn();
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Por favor, ingresa tu correo electrónico.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Por favor, ingresa un correo electrónico válido (ej. contacto@comercio.cl).');
      return;
    }
    const { isValid } = evaluatePassword(password);
    if (!isValid) {
      setErrorMsg('La contraseña debe cumplir con todos los requisitos de seguridad mostrados abajo.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('Debes aceptar los Términos del Servicio y la Política de Privacidad para crear tu cuenta.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setNoticeMsg('');
    beginExplicitSignIn();
    try {
      const trimmedBusiness = businessName.trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: trimmedBusiness ? { business_name: trimmedBusiness } : {},
        },
      });

      if (error) {
        setErrorMsg(translateAuthError(error));
        return;
      }

      if (data.session) {
        setLastActivity(Date.now());
      } else if (data.user) {
        setNoticeMsg(
          '¡Cuenta creada con éxito! Si la confirmación de correo está activa, revisa tu correo electrónico para verificar tu cuenta e ingresar.'
        );
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      endExplicitSignIn();
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Por favor, ingresa tu correo electrónico.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Por favor, ingresa un correo electrónico válido (ej. contacto@comercio.cl).');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordResetUrl(),
      });
      if (error) {
        setErrorMsg(translateAuthError(error));
        return;
      }
      setNoticeMsg('Si ese correo tiene una cuenta, le enviamos un enlace para restablecer la contraseña.');
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setShowPassword(false);
    setErrorMsg('');
    setNoticeMsg('');
  };

  const getTitle = () => {
    if (mode === 'register') return 'Crea tu cuenta';
    if (mode === 'reset') return 'Recupera tu acceso';
    return 'Inicia sesión';
  };

  const getDescription = () => {
    if (mode === 'register') return 'Empieza a fidelizar a tus clientes y haz que vuelvan a tu negocio.';
    if (mode === 'reset') return 'Te enviamos un enlace para crear una contraseña nueva.';
    return 'Entra con el correo de tu cuenta para seguir con tu negocio.';
  };

  const getFormSubmitHandler = (e: SubmitEvent<HTMLFormElement>) => {
    if (mode === 'register') return handleRegister(e);
    if (mode === 'reset') return handleResetRequest(e);
    return handleLogin(e);
  };

  return (
    <AuthFrame title={getTitle()} description={getDescription()}>
      <form
        noValidate
        className="space-y-5"
        aria-busy={isLoading || isGoogleLoading}
        onSubmit={getFormSubmitHandler}
      >
        {mode !== 'reset' && (
          <div>
            <button
              type="button"
              disabled={isLoading || isGoogleLoading}
              onClick={handleGoogleSignIn}
              className={AUTH_OAUTH_BUTTON}
            >
              <GoogleIcon className="h-5 w-5 shrink-0" />
              <span>
                {isGoogleLoading
                  ? 'Conectando con Google…'
                  : mode === 'register'
                    ? 'Registrarme con Google'
                    : 'Continuar con Google'}
              </span>
            </button>
            <div className={AUTH_DIVIDER}>
              <div className={AUTH_DIVIDER_LINE} />
              <span className={AUTH_DIVIDER_TEXT}>o con tu correo</span>
            </div>
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label htmlFor="register-business" className={AUTH_LABEL}>
              Nombre de tu negocio o tienda{' '}
              <span className="text-xs font-normal text-panel-muted">(opcional)</span>
            </label>
            <input
              id="register-business"
              name="businessName"
              type="text"
              autoComplete="organization"
              disabled={isLoading || isGoogleLoading}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={AUTH_FIELD}
              placeholder="Ej. Café Central o Mi Comercio"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className={AUTH_LABEL}>
            Correo electrónico
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isLoading || isGoogleLoading}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={AUTH_FIELD}
            placeholder="tu@comercio.cl"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="auth-password" className="text-sm font-semibold text-panel-text">
                Contraseña
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  disabled={isLoading || isGoogleLoading}
                  className="text-xs font-semibold text-panel-accent transition-colors hover:underline disabled:opacity-60"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                minLength={mode === 'register' ? 8 : undefined}
                disabled={isLoading || isGoogleLoading}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${AUTH_FIELD} pr-20`}
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((shown) => !shown)}
                disabled={isLoading || isGoogleLoading}
                className="absolute inset-y-1 right-1 rounded-lg px-3 text-[11px] font-semibold text-panel-muted transition-colors hover:text-panel-accent"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {mode === 'register' && <PasswordRequirements password={password} />}
          </div>
        )}

        {mode === 'register' && (
          <div
            className={`rounded-xl p-2.5 transition-colors ${
              !termsAccepted && errorMsg.includes('Términos')
                ? 'border border-red-300 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10'
                : ''
            }`}
          >
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-panel-muted cursor-pointer select-none">
              <input
                id="register-terms"
                name="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (errorMsg.includes('Términos')) setErrorMsg('');
                }}
                className="mt-0.5 h-4 w-4 rounded border-panel-border text-panel-primary focus:ring-panel-accent/20 dark:bg-panel-soft"
              />
              <span>
                Acepto los{' '}
                <Link
                  to={ROUTES.terms}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-panel-accent hover:underline"
                >
                  Términos del Servicio y la Política de Privacidad
                </Link>
                .
              </span>
            </label>
          </div>
        )}

        {noticeMsg && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {noticeMsg}
          </p>
        )}

        {errorMsg && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          >
            {errorMsg}
          </p>
        )}

        <button type="submit" disabled={isLoading || isGoogleLoading} className={AUTH_SUBMIT}>
          {mode === 'login'
            ? isLoading
              ? 'Iniciando sesión…'
              : 'Entrar a mi cuenta'
            : mode === 'register'
              ? isLoading
                ? 'Creando tu cuenta…'
                : 'Crear mi cuenta'
              : isLoading
                ? 'Enviando enlace…'
                : 'Enviar enlace de recuperación'}
          {!isLoading && <span aria-hidden="true">→</span>}
        </button>

        {mode === 'login' && (
          <div className="pt-2 text-center">
            <p className="text-xs text-panel-muted">
              ¿No tienes una cuenta aún?{' '}
              <Link
                to={ROUTES.register}
                onClick={() => switchMode('register')}
                className="font-bold text-panel-accent transition-colors hover:underline"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        )}

        {mode === 'register' && (
          <div className="pt-2 text-center">
            <p className="text-xs text-panel-muted">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to={ROUTES.login}
                onClick={() => switchMode('login')}
                className="font-bold text-panel-accent transition-colors hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        )}

        {mode === 'reset' && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => switchMode('login')}
              disabled={isLoading || isGoogleLoading}
              className="mx-auto block py-1 text-xs font-semibold text-panel-accent hover:underline disabled:opacity-60"
            >
              ← Volver a iniciar sesión
            </button>
          </div>
        )}
      </form>
    </AuthFrame>
  );
}
