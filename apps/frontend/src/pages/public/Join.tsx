import { PublicFrame } from '../../components/PublicFrame';
import { useState, FormEvent, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CUSTOMER_NAME_MAX,
  DEFAULT_REGISTRATION,
  balanceUnit,
  type RegistrationField,
} from '@fidelity/shared';
import { EmailField, FieldValue, PhoneField, RutField } from '../../components/ui/IdentifierInput';
import { ROUTES } from '../../components/routing/routePaths';
import { getMerchantWithActivePromo, MerchantWithPromo } from '../../services/merchantService';
import { JoinNotFound } from './JoinNotFound';
import { JoinSuccess } from './JoinSuccess';
import { BirthdayField, type BirthdayValue } from './BirthdayField';
import { apiUrl } from '../../lib/api';
import { extractApiError } from '../../lib/apiError';

/** Respuesta de POST /api/customers (CustomerResponseDto): las URLs solo vienen si el pase es nuevo. */
interface CustomerApiResponse {
  appleWalletUrl?: string;
  googleWalletUrl?: string;
}

export function Join() {
  const { merchantName } = useParams<{ merchantName: string }>();

  const [merchant, setMerchant] = useState<MerchantWithPromo | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Teléfono o correo (al menos uno) y la aceptación de los términos; lo demás es opcional.
  const [name, setName] = useState('');
  const [rut, setRut] = useState<FieldValue>({ value: '', isValid: false, isEmpty: true });
  const [phone, setPhone] = useState<FieldValue>({ value: '', isValid: false, isEmpty: true });
  const [email, setEmail] = useState<FieldValue>({ value: '', isValid: false, isEmpty: true });
  const [birthday, setBirthday] = useState<BirthdayValue>({ isValid: true });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [walletUrls, setWalletUrls] = useState<{ apple?: string, google?: string }>({});
  const [alreadyExists, setAlreadyExists] = useState(false);
  // Error de red o del servidor al cargar el local: distinto de "este local no existe".
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetchMerchant() {
      if (!merchantName) return;
      setLoadingData(true);
      setLoadError(false);
      try {
        const data = await getMerchantWithActivePromo(merchantName);
        if (!data) {
          setNotFound(true);
        } else {
          setMerchant(data);
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoadingData(false);
      }
    }
    fetchMerchant();
  }, [merchantName, reloadKey]);

  // Lo que pide la marca en el registro; sin tarjeta configurada, todo opcional como siempre.
  const registration = merchant?.card?.registration ?? DEFAULT_REGISTRATION;
  const asks = (field: RegistrationField) => registration[field] !== 'HIDDEN';
  const requires = (field: RegistrationField) => registration[field] === 'REQUIRED';
  const cardType = merchant?.card?.type ?? 'STAMPS';
  const stampsEnabled = merchant?.card?.stampsEnabled ?? cardType !== 'POINTS';
  const pointsEnabled = merchant?.card?.pointsEnabled ?? cardType === 'POINTS';
  const unit = stampsEnabled && pointsEnabled ? 'sellos y puntos' : stampsEnabled ? 'sellos' : 'puntos';

  const hasContact = phone.isValid || email.isValid;
  // Ni el teléfono ni el correo son obligatorios por sí solos: basta uno de los dos.
  const eitherContact = asks('phone') && asks('email') && !requires('phone') && !requires('email');
  const birthdayOk = birthday.isValid && (!requires('birthday') || Boolean(birthday.day && birthday.month));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    setSubmitted(true);
    // Los errores de formato los muestra cada campo; el de contacto y el de términos, abajo.
    const typedWrong = [rut, phone, email].some((f) => !f.isEmpty && !f.isValid);
    const missingRequired =
      (requires('phone') && !phone.isValid) ||
      (requires('email') && !email.isValid) ||
      (requires('rut') && !rut.isValid) ||
      (requires('name') && !name.trim());
    if (typedWrong || missingRequired || !hasContact || !birthdayOk || !acceptedTerms) return;

    setLoading(true);

    if (import.meta.env.VITE_USE_MOCKS === 'true') {
      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
        setWalletUrls({ apple: '#', google: '#' });
      }, 1500);
    } else {
      try {
        const response = await fetch(apiUrl('/api/customers'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: merchant?.id,
            ...(asks('name') && name.trim() ? { name: name.trim() } : {}),
            ...(asks('rut') && rut.isValid ? { rut: rut.value } : {}),
            ...(asks('phone') && phone.isValid ? { phone: phone.value } : {}),
            ...(asks('email') && email.isValid ? { email: email.value } : {}),
            ...(asks('birthday') && birthday.day && birthday.month
              ? { birthDay: birthday.day, birthMonth: birthday.month, ...(birthday.year ? { birthYear: birthday.year } : {}) }
              : {}),
            acceptedTerms
          })
        });

        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(extractApiError(body) ?? 'Error al generar pase');
        }

        const data = (body ?? {}) as CustomerApiResponse;

        if (data.appleWalletUrl || data.googleWalletUrl) {
          setWalletUrls({ apple: data.appleWalletUrl, google: data.googleWalletUrl });
          setAlreadyExists(false);
        } else {
          setAlreadyExists(true);
        }

        setLoading(false);
        setSuccess(true);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || 'Ocurrió un error al procesar tu solicitud.');
        } else {
          setError('Ocurrió un error al procesar tu solicitud.');
        }
        setLoading(false);
      }
    }
  };

  if (loadingData) {
    return (
      <PublicFrame>
        <div className="min-h-[65svh] flex items-center justify-center bg-panel-canvas">
          <div className="w-10 h-10 border-4 border-panel-accent border-t-transparent rounded-full motion-safe:animate-spin" />
        </div>
      </PublicFrame>
    );
  }

  if (loadError) {
    return (
      <PublicFrame>
        <div className="min-h-[65svh] flex flex-col items-center justify-center gap-4 bg-panel-canvas p-6 text-center">
          <p role="alert" className="text-lg font-bold text-panel-text">
            No pudimos cargar la información del local. Revisa tu conexión.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-2xl bg-panel-primary px-6 py-3 font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      </PublicFrame>
    );
  }

  if (notFound || !merchant) {
    return <JoinNotFound />;
  }

  if (merchant.card?.closed) {
    return (
      <PublicFrame>
        <div className="min-h-[65svh] flex flex-col items-center justify-center bg-panel-canvas p-6 text-center">
          <h1 className="text-3xl font-extrabold text-panel-text mb-3">{merchant.name}</h1>
          <p role="status" className="max-w-sm text-lg font-medium text-panel-muted">
            Este programa de fidelidad ya terminó: no se entregan tarjetas nuevas.
          </p>
        </div>
      </PublicFrame>
    );
  }

  // Sin promociones activas el alta falla en el backend: no se deja llenar el formulario en vano.
  if (merchant.Promotion.length === 0) {
    return (
      <PublicFrame>
        <div className="min-h-[65svh] flex flex-col items-center justify-center bg-panel-canvas p-6 text-center">
          <h1 className="text-3xl font-extrabold text-panel-text mb-3">{merchant.name}</h1>
          <p role="status" className="max-w-sm text-lg font-medium text-panel-muted">
            Este local aún no tiene un programa de {unit} activo. Vuelve a intentarlo más adelante.
          </p>
        </div>
      </PublicFrame>
    );
  }

  if (success) {
    return (
      <JoinSuccess 
        appleWalletUrl={walletUrls.apple} 
        googleWalletUrl={walletUrls.google} 
        alreadyExists={alreadyExists}
        merchantName={merchant.name}
      />
    );
  }

  // Se destaca la promoción activa más reciente, pero los sellos son un saldo único:
  // sirven para cualquiera de las activas y el cliente elige en caja cuál canjear.
  const promo = merchant.Promotion && merchant.Promotion.length > 0 ? merchant.Promotion[0] : null;
  const otherPromos = merchant.Promotion ? merchant.Promotion.slice(1) : [];
  const clp = new Intl.NumberFormat('es-CL');
  const rewardText = promo
    ? `Junta ${clp.format(promo.targetStamps)} ${balanceUnit(promo.currency ?? cardType, promo.targetStamps)}, llévate ${promo.rewardName}`
    : `Acumula ${unit} y gana increíbles premios`;
  const welcomeStamps = stampsEnabled ? (merchant.card?.welcomeStamps ?? (cardType === 'STAMPS' ? merchant.card?.welcomeBalance ?? 0 : 0)) : 0;
  const welcomePoints = pointsEnabled ? (merchant.card?.welcomePoints ?? (cardType === 'POINTS' ? merchant.card?.welcomeBalance ?? 0 : 0)) : 0;
  const welcome = [
    welcomeStamps > 0 ? `${clp.format(welcomeStamps)} ${balanceUnit('STAMPS', welcomeStamps)}` : '',
    welcomePoints > 0 ? `${clp.format(welcomePoints)} ${balanceUnit('POINTS', welcomePoints)}` : '',
  ].filter(Boolean).join(' y ');
  const brandColor = merchant.card?.backgroundColor;

  return (
    <PublicFrame>
      <div className="mx-auto w-full max-w-xl px-5 py-8 sm:px-8 sm:py-10 flex flex-col items-center relative">


        <div data-public-entry className="w-full max-w-md flex flex-col items-center">

          {/* Encabezado del Local */}
          {merchant.card?.logoUrl ? (
            <img
              src={merchant.card.logoUrl}
              alt=""
              className="w-20 h-20 rounded-3xl object-cover shadow-xl mb-5 border-4 border-panel-surface bg-panel-surface"
            />
          ) : (
            <div
              className="w-20 h-20 bg-panel-primary text-white rounded-3xl flex items-center justify-center font-extrabold text-3xl shadow-xl shadow-panel-primary/15 mb-5 border-4 border-panel-surface"
              style={brandColor ? { backgroundColor: brandColor } : undefined}
            >
              {merchant.name.charAt(0).toUpperCase()}
            </div>
          )}

          <h2 className="text-sm font-bold text-panel-muted tracking-wider uppercase mb-1">¡Bienvenido a!</h2>
          <h1 className="text-4xl font-extrabold text-center leading-tight mb-4 text-panel-text">
            {merchant.name}
          </h1>

          <div
            className="inline-block px-5 py-3 bg-panel-primary rounded-2xl shadow-lg shadow-panel-primary/15 mb-8 text-white w-full text-center relative overflow-hidden"
            style={brandColor ? { backgroundColor: brandColor } : undefined}
          >
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <svg className="w-16 h-16 transform rotate-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <p className="font-extrabold text-xl relative z-10">
              {rewardText}
            </p>
            {welcome && (
              <p className="relative z-10 text-sm font-bold opacity-90 mt-1">
                Y te regalamos {welcome} al obtener tu tarjeta.
              </p>
            )}
          </div>

          {otherPromos.length > 0 && (
            <div className="w-full -mt-4 mb-8 rounded-2xl border border-panel-accent/15 bg-panel-accent/5 px-5 py-4">
              <p className="text-sm font-bold text-panel-text mb-2">
                Tus {unit} también sirven para:
              </p>
              <ul className="space-y-1.5 mb-3">
                {otherPromos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-panel-text">{p.rewardName}</span>
                    <span className="shrink-0 font-bold text-panel-accent">{clp.format(p.targetStamps)} {balanceUnit(p.currency ?? cardType, p.targetStamps)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs font-medium text-panel-muted">
                Sigue juntando y elige en caja en qué premio gastarlos, siempre que tus {unit} estén vigentes.
              </p>
            </div>
          )}

          {/* Modo de uso */}
          <div className="w-full bg-panel-surface rounded-3xl p-6 mb-8 border border-panel-border shadow-sm">
            <h3 className="font-bold text-panel-text mb-4 text-lg">¿Cómo funciona?</h3>
            <ul className="space-y-4 text-panel-muted font-medium text-sm">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-panel-accent/10 text-panel-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                <p>Ingresa tus datos para obtener tu tarjeta digital.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-panel-accent/10 text-panel-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                <p>Guárdala en Apple Wallet o Google Wallet (sin instalar apps).</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-panel-accent/10 text-panel-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                <p>
                  {cardType === 'POINTS'
                    ? `Muéstrala en caja en cada compra: sumas 1 punto cada $${clp.format(merchant.card?.pesosPerPoint ?? 1000)}.`
                    : 'Muéstrala en caja cuando nos visites para acumular sellos.'}
                </p>
              </li>
            </ul>

            {merchant.stampValidityDays && (
              <div className="mt-5 pt-4 border-t border-panel-border flex items-center gap-2">
                <svg className="w-5 h-5 text-panel-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-bold text-panel-muted">
                  Tus {unit} expiran después de {merchant.stampValidityDays} días.
                </p>
              </div>
            )}
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="w-full rounded-3xl border border-panel-border bg-panel-surface p-5 sm:p-7 shadow-panel">
            <div className="space-y-4 mb-2">
              {asks('name') && (
                <div>
                  <label htmlFor="join-name" className="block text-sm font-bold mb-2 px-1 text-panel-text">
                    Nombre {!requires('name') && <span className="font-medium text-panel-muted">(opcional)</span>}
                  </label>
                  <input
                    id="join-name"
                    type="text"
                    autoComplete="name"
                    maxLength={CUSTOMER_NAME_MAX}
                    value={name}
                    aria-invalid={submitted && requires('name') && !name.trim()}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    placeholder="María Pérez"
                    className="w-full bg-panel-surface border-2 border-panel-border focus:border-panel-accent focus:ring-4 focus:ring-panel-accent/10 rounded-2xl px-5 py-4 text-lg font-medium text-panel-text outline-none shadow-sm placeholder:text-panel-muted"
                  />
                  {submitted && requires('name') && !name.trim() && (
                    <p role="alert" className="text-red-600 dark:text-red-400 text-sm font-bold px-1 mt-2">Ingresa tu nombre.</p>
                  )}
                </div>
              )}

              <div className={eitherContact ? 'rounded-2xl border border-panel-border bg-panel-canvas/60 p-4 space-y-4' : 'space-y-4'}>
                {eitherContact && (
                  <p className="text-sm font-bold text-panel-text px-1">
                    Tu teléfono o tu correo <span className="font-medium text-panel-muted">(al menos uno)</span>
                  </p>
                )}
                {asks('phone') && (
                  <PhoneField
                    variant="wallet"
                    label="Teléfono celular"
                    autoComplete="tel-national"
                    optional={!requires('phone')}
                    onChange={(next) => { setPhone(next); setError(''); }}
                    showErrors={submitted}
                  />
                )}
                {asks('email') && (
                  <EmailField
                    variant="wallet"
                    label="Correo electrónico"
                    autoComplete="email"
                    optional={!requires('email')}
                    onChange={(next) => { setEmail(next); setError(''); }}
                    showErrors={submitted}
                  />
                )}
                {submitted && eitherContact && !hasContact && phone.isEmpty && email.isEmpty && (
                  <p role="alert" className="text-red-600 dark:text-red-400 text-sm font-bold px-1">
                    Ingresa tu teléfono o tu correo para recibir tu tarjeta.
                  </p>
                )}
              </div>

              {asks('rut') && (
                <RutField
                  variant="wallet"
                  label={requires('rut') ? 'RUT' : 'RUT (opcional)'}
                  optional={!requires('rut')}
                  onChange={(next) => { setRut(next); setError(''); }}
                  showErrors={submitted}
                />
              )}

              {asks('birthday') && (
                <BirthdayField
                  required={requires('birthday')}
                  showErrors={submitted}
                  onChange={(next) => { setBirthday(next); setError(''); }}
                />
              )}

              <label className="flex items-start gap-3 px-1 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  aria-invalid={submitted && !acceptedTerms}
                  aria-describedby={submitted && !acceptedTerms ? 'terms-error' : undefined}
                  checked={acceptedTerms}
                  onChange={(e) => { setAcceptedTerms(e.target.checked); setError(''); }}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-panel-border accent-panel-primary"
                />
                <span className="text-sm text-panel-muted font-medium leading-snug">
                  Acepto los{' '}
                  {/* Pestaña nueva: volver atrás desde /terminos borraría lo que ya escribió */}
                  <a
                    href={ROUTES.terms}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-panel-accent underline underline-offset-2"
                  >
                    términos y condiciones
                  </a>{' '}
                  y el tratamiento de mis datos para gestionar mis {unit}.
                </span>
              </label>
              {submitted && !acceptedTerms && (
                <p id="terms-error" role="alert" className="text-red-600 dark:text-red-400 text-sm font-bold px-1">
                  Debes aceptar los términos y condiciones para obtener tu tarjeta.
                </p>
              )}

              {/* Errores del servidor; los de formato los muestra cada campo */}
              {error && (
                <p role="alert" className="text-red-600 dark:text-red-400 text-sm font-bold px-1">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-6 bg-panel-primary hover:bg-panel-primary/90 disabled:opacity-50 text-white font-extrabold text-lg rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-panel-surface/30 border-t-white rounded-full motion-safe:animate-spin" />
              ) : (
                'Obtener mi Tarjeta'
              )}
            </button>
          </form>

          <p className="text-[11px] text-panel-muted mt-8 text-center max-w-xs leading-relaxed font-medium">
            Usamos tus datos únicamente para identificar tu tarjeta y gestionar tus {unit}, conforme a la Ley 19.628 de Protección de la Vida Privada. Puedes pedir su eliminación cuando quieras.
          </p>
        </div>
      </div>
    </PublicFrame>
  );
}
