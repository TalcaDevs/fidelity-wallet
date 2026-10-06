import { PublicFrame } from '../../components/PublicFrame';
import { useDeviceOS } from '../../hooks/useDeviceOS';

interface JoinSuccessProps {
  appleWalletUrl?: string;
  googleWalletUrl?: string;
  alreadyExists?: boolean;
  merchantName?: string;
}

export function JoinSuccess({
  appleWalletUrl,
  googleWalletUrl,
  alreadyExists = false,
  merchantName,
}: JoinSuccessProps) {
  const { isIOS, isAndroid } = useDeviceOS();

  return (
    <PublicFrame>
      <div data-public-entry className="min-h-[65svh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-panel-text mb-4">
          {alreadyExists ? '¡Ya tienes tu tarjeta!' : '¡Tarjeta Lista!'}
        </h1>

        <p className="text-panel-muted mb-8 max-w-sm text-lg font-medium">
          {alreadyExists
            ? `Ya estás registrado en ${merchantName || 'este local'}. Tu tarjeta fue emitida previamente. Si perdiste tu tarjeta o cambiaste de celular, acércate al mesón del local para recibir asistencia.`
            : 'Agrega tu tarjeta a tu billetera digital. En tu próxima visita, sólo muestra el código QR desde tu teléfono.'}
        </p>

        {/* Botones oficiales de Apple y Google Wallet una vez emitida */}
        {!alreadyExists && (
          <div className="space-y-4 w-full max-w-sm">
            {(!isAndroid || isIOS) && appleWalletUrl && (
              <a href={appleWalletUrl} aria-label="Add to Apple Wallet (Añadir a Apple Wallet)" className="block w-full active:scale-95 transition-transform">
                <span className="sr-only">Add to Apple Wallet (Añadir a Apple Wallet)</span>
                <img src="/apple-wallet-es.svg" alt="" className="h-[50px] w-auto mx-auto" />
              </a>
            )}

            {(!isIOS || isAndroid) && googleWalletUrl && (
              <a href={googleWalletUrl} aria-label="Add to Google Wallet (Añadir a Google Wallet)" className="block w-full active:scale-95 transition-transform">
                <span className="sr-only">Add to Google Wallet (Añadir a Google Wallet)</span>
                <img src="/google-wallet-es.svg" alt="" className="h-[50px] w-auto mx-auto" />
              </a>
            )}
          </div>
        )}
      </div>
    </PublicFrame>
  );
}
