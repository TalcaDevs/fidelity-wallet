import { useState, FormEvent, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CUSTOMER_NAME_MAX } from '@fidelity/shared';
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

  const hasContact = phone.isValid || email.isValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    setSubmitted(true);
    // Los errores de formato los muestra cada campo; el de contacto y el de términos, abajo.
    const typedWrong = [rut, phone, email].some((f) => !f.isEmpty && !f.isValid);
    if (typedWrong || !hasContact || !birthday.isValid || !acceptedTerms) return;

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
            ...(name.trim() ? { name: name.trim() } : {}),
            ...(rut.isValid ? { rut: rut.value } : {}),
            ...(phone.isValid ? { phone: phone.value } : {}),
            ...(email.isValid ? { email: email.value } : {}),
            ...(birthday.day && birthday.month
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
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <p role="alert" className="text-lg font-bold text-slate-700">
          No pudimos cargar la información del local. Revisa tu conexión.
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (notFound || !merchant) {
    return <JoinNotFound />;
  }

  // Sin promociones activas el alta falla en el backend: no se deja llenar el formulario en vano.
  if (merchant.Promotion.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h1 className="text-3xl font-black text-slate-900 mb-3">{merchant.name}</h1>
        <p role="status" className="max-w-sm text-lg font-medium text-slate-600">
          Este local aún no tiene un programa de sellos activo. Vuelve a intentarlo más adelante.
        </p>
      </div>
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
  const rewardText = promo ? `Junta ${promo.targetStamps} sellos, llévate ${promo.rewardName}` : 'Acumula sellos y gana increíbles premios';

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-start p-6 pt-12 font-sans text-slate-900 relative">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-50 via-blue-50/50 to-white -z-10" />
      
      <div className="w-full max-w-md flex flex-col items-center duration-500">
        
        {/* Encabezado del Local */}
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-blue-600/30 mb-5 border-4 border-white">
          {merchant.name.charAt(0).toUpperCase()}
        </div>
        
        <h2 className="text-sm font-bold text-slate-500 tracking-wider uppercase mb-1">¡Bienvenido a!</h2>
        <h1 className="text-4xl font-black text-center leading-tight mb-4 text-slate-900">
          {merchant.name}
        </h1>
        
        <div className="inline-block px-5 py-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-8 text-white w-full text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <svg className="w-16 h-16 transform rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className="font-black text-xl relative z-10">
            {rewardText}
          </p>
        </div>

        {otherPromos.length > 0 && (
          <div className="w-full -mt-4 mb-8 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4">
            <p className="text-sm font-bold text-slate-700 mb-2">
              Tus sellos también sirven para:
            </p>
            <ul className="space-y-1.5 mb-3">
              {otherPromos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-800">{p.rewardName}</span>
                  <span className="shrink-0 font-bold text-blue-700">{p.targetStamps} sellos</span>
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium text-slate-500">
              Sigue juntando y elige en caja en qué premio gastarlos, siempre que tus sellos estén vigentes.
            </p>
          </div>
        )}

        {/* Modo de uso */}
        <div className="w-full bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">¿Cómo funciona?</h3>
          <ul className="space-y-4 text-slate-600 font-medium text-sm">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <p>Ingresa tus datos para obtener tu tarjeta digital.</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <p>Guárdala en Apple Wallet o Google Wallet (sin instalar apps).</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
              <p>Muéstrala en caja cuando nos visites para acumular sellos.</p>
            </li>
          </ul>
          
          {merchant.stampValidityDays && (
            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-bold text-slate-500">
                Tus sellos expiran después de {merchant.stampValidityDays} días.
              </p>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="w-full bg-white p-1">
          <div className="space-y-4 mb-2">
            <div>
              <label htmlFor="join-name" className="block text-sm font-bold mb-2 px-1 text-slate-700">
                Nombre <span className="font-medium text-slate-400">(opcional)</span>
              </label>
              <input
                id="join-name"
                type="text"
                autoComplete="name"
                maxLength={CUSTOMER_NAME_MAX}
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="María Pérez"
                className="w-full bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-2xl px-5 py-4 text-lg font-medium text-slate-900 outline-none shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
              <p className="text-sm font-bold text-slate-700 px-1">
                Tu teléfono o tu correo <span className="font-medium text-slate-500">(al menos uno)</span>
              </p>
              <PhoneField
                label="Teléfono celular"
                autoComplete="tel-national"
                optional
                onChange={(next) => { setPhone(next); setError(''); }}
                showErrors={submitted}
              />
              <EmailField
                label="Correo electrónico"
                autoComplete="email"
                optional
                onChange={(next) => { setEmail(next); setError(''); }}
                showErrors={submitted}
              />
              {submitted && !hasContact && phone.isEmpty && email.isEmpty && (
                <p role="alert" className="text-red-500 text-sm font-bold px-1">
                  Ingresa tu teléfono o tu correo para recibir tu tarjeta.
                </p>
              )}
            </div>

            <RutField
              label="RUT (opcional)"
              optional
              onChange={(next) => { setRut(next); setError(''); }}
              showErrors={submitted}
            />

            <BirthdayField
              showErrors={submitted}
              onChange={(next) => { setBirthday(next); setError(''); }}
            />

            <label className="flex items-start gap-3 px-1 pt-1 cursor-pointer">
              <input
                type="checkbox"
                aria-invalid={submitted && !acceptedTerms}
                aria-describedby={submitted && !acceptedTerms ? 'terms-error' : undefined}
                checked={acceptedTerms}
                onChange={(e) => { setAcceptedTerms(e.target.checked); setError(''); }}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-600"
              />
              <span className="text-sm text-slate-600 font-medium leading-snug">
                Acepto los{' '}
                {/* Pestaña nueva: volver atrás desde /terminos borraría lo que ya escribió */}
                <a
                  href={ROUTES.terms}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-700 underline underline-offset-2"
                >
                  términos y condiciones
                </a>{' '}
                y el tratamiento de mis datos para gestionar mis sellos.
              </span>
            </label>
            {submitted && !acceptedTerms && (
              <p id="terms-error" role="alert" className="text-red-500 text-sm font-bold px-1">
                Debes aceptar los términos y condiciones para obtener tu tarjeta.
              </p>
            )}

            {/* Errores del servidor; los de formato los muestra cada campo */}
            {error && (
              <p role="alert" className="text-red-500 text-sm font-bold px-1">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 mt-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Obtener mi Tarjeta'
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 mt-8 text-center max-w-xs leading-relaxed font-medium">
          Usamos tus datos únicamente para identificar tu tarjeta y gestionar tus sellos, conforme a la Ley 19.628 de Protección de la Vida Privada. Puedes pedir su eliminación cuando quieras.
        </p>
      </div>
    </div>
  );
}
