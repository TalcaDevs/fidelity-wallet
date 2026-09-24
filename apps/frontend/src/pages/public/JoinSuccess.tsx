import { useDeviceOS } from '../../hooks/useDeviceOS';

interface JoinSuccessProps {
  appleWalletUrl?: string;
  googleWalletUrl?: string;
  alreadyExists?: boolean;
  merchantName?: string;
}

export function JoinSuccess({ appleWalletUrl, googleWalletUrl, alreadyExists, merchantName }: JoinSuccessProps) {
  const { isIOS, isAndroid } = useDeviceOS();

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
          ? `Ya estás registrado en ${merchantName}. Si borraste tu pase, pronto podrás recuperarlo.`
          : 'Agrega tu tarjeta a tu billetera digital. En tu próxima visita, sólo muestra el código QR desde tu teléfono.'}
      </p>

      {!alreadyExists && (
        <div className="space-y-4 w-full max-w-sm">
          {(!isAndroid || isIOS) && appleWalletUrl && (
            <a href={appleWalletUrl} className="block w-full active:scale-95 transition-transform">
              <img src="/apple-wallet-es.svg" alt="Añadir a Apple Wallet" className="h-[50px] w-auto mx-auto" />
            </a>
          )}
          
          {(!isIOS || isAndroid) && googleWalletUrl && (
            <a href={googleWalletUrl} className="block w-full active:scale-95 transition-transform">
              <img src="/google-wallet-es.svg" alt="Añadir a Google Wallet" className="h-[50px] w-auto mx-auto" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
