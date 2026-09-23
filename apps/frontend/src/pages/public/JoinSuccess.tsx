import { useDeviceOS } from '../../hooks/useDeviceOS';

export function JoinSuccess() {
  const { isIOS, isAndroid } = useDeviceOS();

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-4">¡Tarjeta Lista!</h1>
      <p className="text-slate-600 mb-8 max-w-sm text-lg font-medium">
        Agrega tu tarjeta a tu billetera digital. En tu próxima visita, sólo muestra el código QR desde tu teléfono.
      </p>

      <div className="space-y-4 w-full max-w-sm">
        {(!isAndroid || isIOS) && (
          <button className="w-full bg-black text-white rounded-2xl h-14 font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-900 transition-colors active:scale-95 shadow-lg shadow-black/20">
            <svg viewBox="0 0 384 512" className="h-6 w-6 fill-current">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.8 90.1-91.1 102.5-115.1-42.3-17.2-61.2-57.5-61.6-95.5zM207.2 92.5c17.5-21 29.5-50.6 26.3-79.6-24.8 1.5-56.1 17.6-74.8 39.4-16.7 18.9-29.9 49.3-25.9 77.4 27.6 2.1 57.1-15.5 74.4-37.2z"/>
            </svg>
            Add to Apple Wallet
          </button>
        )}
        
        {(!isIOS || isAndroid) && (
          <button className="w-full bg-slate-900 text-white rounded-2xl h-14 font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors active:scale-95 shadow-lg shadow-slate-900/20">
            <svg viewBox="0 0 512 512" className="h-6 w-6 fill-current">
              <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
            </svg>
            Add to Google Wallet
          </button>
        )}
      </div>
    </div>
  );
}
