import { useState } from 'react';
import { useDeviceOS } from '../../hooks/useDeviceOS';
import { requestPassRecovery, verifyPassRecovery } from '../../services/customersService';

interface JoinSuccessProps {
  appleWalletUrl?: string;
  googleWalletUrl?: string;
  alreadyExists?: boolean;
  merchantName?: string;
  merchantId?: string;
  initialRut?: string;
  initialPhone?: string;
}

export function JoinSuccess({
  appleWalletUrl,
  googleWalletUrl,
  alreadyExists: initialAlreadyExists = false,
  merchantName,
  merchantId,
  initialRut = '',
  initialPhone = '',
}: JoinSuccessProps) {
  const { isIOS, isAndroid } = useDeviceOS();

  const [alreadyExists, setAlreadyExists] = useState(initialAlreadyExists);
  const [walletUrls, setWalletUrls] = useState({
    apple: appleWalletUrl,
    google: googleWalletUrl,
  });

  // Estado del flujo de recuperación OTP
  const [recoveryStep, setRecoveryStep] = useState<'idle' | 'requesting' | 'code_sent' | 'verifying'>('idle');
  const [rut, setRut] = useState(initialRut);
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!merchantId) return;

    setError(null);
    setRecoveryStep('requesting');

    const res = await requestPassRecovery({
      merchantId,
      rut,
      phone,
    });

    if (!res.success) {
      setError(res.error ?? 'No se pudo enviar el código');
      setRecoveryStep('idle');
      return;
    }

    setPhoneMasked(res.phoneMasked);
    setDevCode(res.devCode);
    setRecoveryStep('code_sent');
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId || code.length !== 6) return;

    setError(null);
    setRecoveryStep('verifying');

    const res = await verifyPassRecovery({
      merchantId,
      rut,
      phone,
      code,
    });

    if (!res.success) {
      setError(res.error ?? 'Código incorrecto o expirado');
      setRecoveryStep('code_sent');
      return;
    }

    setWalletUrls({
      apple: res.appleWalletUrl,
      google: res.googleWalletUrl,
    });
    setAlreadyExists(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-black text-slate-900 mb-4">
        {alreadyExists ? '¡Ya tienes tu tarjeta!' : '¡Tarjeta Lista!'}
      </h1>

      <p className="text-slate-600 mb-8 max-w-sm text-lg font-medium">
        {alreadyExists
          ? `Ya estás registrado en ${merchantName || 'este local'}. Si la borraste de tu billetera o cambiaste de celular, puedes recuperarla recibiendo un código por SMS.`
          : 'Agrega tu tarjeta a tu billetera digital. En tu próxima visita, sólo muestra el código QR desde tu teléfono.'}
      </p>

      {/* Flujo de recuperación OTP cuando ya existe la tarjeta */}
      {alreadyExists && (
        <div className="w-full max-w-sm space-y-4">
          {recoveryStep === 'idle' || recoveryStep === 'requesting' ? (
            <div className="space-y-4">
              {(!initialRut || !initialPhone) && (
                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">RUT</label>
                    <input
                      type="text"
                      value={rut}
                      onChange={(e) => setRut(e.target.value)}
                      placeholder="12.345.678-5"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-rose-600 text-sm font-medium text-center">{error}</p>}

              <button
                type="button"
                onClick={() => handleRequestCode()}
                disabled={recoveryStep === 'requesting' || !rut || !phone}
                className="w-full bg-blue-600 text-white rounded-2xl h-14 font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recoveryStep === 'requesting' ? 'Enviando código SMS...' : 'Recuperar mi tarjeta'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <p className="text-slate-700 font-semibold text-sm">
                Te enviamos un código de 6 dígitos por SMS a <span className="font-bold text-slate-900">{phoneMasked}</span>
              </p>

              {devCode && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2 rounded-lg font-mono">
                  Código de prueba: <strong>{devCode}</strong>
                </div>
              )}

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full text-center text-3xl font-mono tracking-widest h-14 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
                autoFocus
              />

              {error && <p className="text-rose-600 text-sm font-medium">{error}</p>}

              <button
                type="submit"
                disabled={code.length !== 6 || recoveryStep === 'verifying'}
                className="w-full bg-slate-900 text-white rounded-xl h-12 font-semibold text-base hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recoveryStep === 'verifying' ? 'Verificando...' : 'Confirmar y Obtener Tarjeta'}
              </button>

              <button
                type="button"
                onClick={() => handleRequestCode()}
                className="text-xs text-slate-500 hover:text-slate-800 underline block mx-auto pt-2"
              >
                Reenviar código
              </button>
            </form>
          )}
        </div>
      )}

      {/* Botones oficiales de Apple y Google Wallet una vez emitida o recuperada */}
      {!alreadyExists && (
        <div className="space-y-4 w-full max-w-sm">
          {(!isAndroid || isIOS) && walletUrls.apple && (
            <a
              href={walletUrls.apple}
              className="w-full bg-black text-white rounded-2xl h-14 font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-900 transition-colors active:scale-95 shadow-lg shadow-black/20"
            >
              <svg viewBox="0 0 384 512" className="h-6 w-6 fill-current">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.8 90.1-91.1 102.5-115.1-42.3-17.2-61.2-57.5-61.6-95.5zM207.2 92.5c17.5-21 29.5-50.6 26.3-79.6-24.8 1.5-56.1 17.6-74.8 39.4-16.7 18.9-29.9 49.3-25.9 77.4 27.6 2.1 57.1-15.5 74.4-37.2z" />
              </svg>
              Add to Apple Wallet
            </a>
          )}

          {(!isIOS || isAndroid) && walletUrls.google && (
            <a
              href={walletUrls.google}
              className="w-full bg-slate-900 text-white rounded-2xl h-14 font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors active:scale-95 shadow-lg shadow-slate-900/20"
            >
              <svg viewBox="0 0 512 512" className="h-6 w-6 fill-current">
                <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
              </svg>
              Add to Google Wallet
            </a>
          )}
        </div>
      )}
    </div>
  );
}
