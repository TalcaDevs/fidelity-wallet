import { useState, useCallback, useEffect } from 'react';
import { QRCam } from './QRCam';
import { ManualFallback } from './ManualFallback';

import { useScanFeedback } from '../../hooks/useScanFeedback';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { processScan, ScanResult, ScanTarget } from '../../services/scanService';
import { IdentifierValue } from '../../components/ui/IdentifierInput';
import { ScanLoading, ScanSuccess, ScanAlreadyScanned, ScanReward, ScanError, ScanRedeemSuccess, ScanOffline, ScanSessionExpired } from './ScanViews';

type ScanState = 'camera' | 'manual' | 'loading' | 'success' | 'alreadyScanned' | 'reward' | 'error' | 'redeemSuccess';

export function Scan({ merchantId, session }: { merchantId: string, session: Session }) {
  const { triggerFeedback, resumeAudio } = useScanFeedback();
  const [isStarted, setIsStarted] = useState(false);
  const [state, setState] = useState<ScanState>('camera');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [target, setTarget] = useState<ScanTarget | null>(null);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Supabase auth state for unexpected session invalidation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setIsSessionExpired(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleScan = useCallback(async (nextTarget: ScanTarget) => {
    setState('loading');
    setTarget(nextTarget);
    const res = await processScan({ merchantId, action: 'STAMP', target: nextTarget });
    
    setResult(res);
    
    if (res.rewardUnlocked) {
      triggerFeedback('reward');
      setState('reward');
    } else if (!res.ok) {
      triggerFeedback('error');
      if (res.error === 'No tienes permisos para realizar esta acción' || res.error?.includes('sesión')) {
        setIsSessionExpired(true);
      } else {
        setState('error');
      }
    } else if (res.alreadyScanned) {
      triggerFeedback('alreadyScanned');
      setState('alreadyScanned');
    } else {
      setState('success');
    }
  }, [triggerFeedback, merchantId]);

  // promotionId: el premio que eligió el cliente (los sellos sirven para cualquier promoción activa).
  const handleRedeem = useCallback(async (promotionId?: string) => {
    if (!target) return;
    setState('loading');
    const res = await processScan({ merchantId, action: 'REDEEM', target, promotionId });
    setResult(res);

    if (!res.ok) {
      triggerFeedback('error');
      if (res.error === 'No tienes permisos para realizar esta acción' || res.error?.includes('sesión')) {
        setIsSessionExpired(true);
      } else {
        setState('error');
      }
    } else if (res.alreadyScanned) {
      // Doble toque sobre el mismo premio: el canje ya estaba hecho. NO es un "premio entregado"
      // nuevo; mostrarlo así haría que el cajero lo entregue dos veces.
      triggerFeedback('alreadyScanned');
      setState('alreadyScanned');
    } else {
      triggerFeedback('success');
      setState('redeemSuccess');
    }
  }, [target, merchantId, triggerFeedback]);

  const handleManual = useCallback((identifier: IdentifierValue) => {
    void handleScan({
      customer: identifier.kind === 'rut' ? { rut: identifier.value } : { phone: identifier.value },
    });
  }, [handleScan]);

  const resetScanner = () => {
    setResult(null);
    setTarget(null);
    setState('camera');
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col font-sans overflow-hidden relative">
      <header className="px-6 py-4 flex items-center justify-between z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black">QR</div>
          <div>
            <h1 className="font-bold leading-tight">Escáner</h1>
            <p className="text-xs text-slate-400 font-medium">{session?.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state === 'camera' && (
            <button onClick={() => setState('manual')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-full text-sm font-bold shadow-sm">
              Manual
            </button>
          )}
          <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors rounded-full text-sm font-bold shadow-sm">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 relative w-full h-full pb-8 px-4 flex flex-col">
        {!isStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2">Listo para escanear</h2>
            <p className="text-slate-400 mb-8 max-w-xs">Presiona el botón para activar la cámara y el sonido.</p>
            <button 
              onClick={() => { resumeAudio(); setIsStarted(true); }}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-95"
            >
              Comenzar a escanear
            </button>
          </div>
        ) : state === 'camera' && (
          <div className="flex-1 relative duration-300 flex flex-col">
            <div className="flex-1 w-full relative">
              {!isOnline ? (
                <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                  <p className="text-slate-500 font-bold">Cámara pausada (Sin red)</p>
                </div>
              ) : (
                <QRCam isActive={!isSessionExpired} onScanSuccess={(passToken) => handleScan({ passToken })} />
              )}
            </div>
            <p className="text-center text-slate-400 mt-6 font-medium px-8">
              Apunta la cámara al pase del cliente para registrar su visita.
            </p>
          </div>
        )}

        {isStarted && state === 'manual' && <ManualFallback onSubmit={handleManual} onCancel={resetScanner} />}
        {state === 'loading' && <ScanLoading />}
        {state === 'success' && result && <ScanSuccess result={result} onReset={resetScanner} />}
        {state === 'redeemSuccess' && result && <ScanRedeemSuccess result={result} onReset={resetScanner} />}
        {state === 'alreadyScanned' && result && <ScanAlreadyScanned result={result} onReset={resetScanner} />}
        {state === 'reward' && result && <ScanReward key={result.scanId ?? result.passId} result={result} onReset={resetScanner} onRedeem={handleRedeem} />}
        {state === 'error' && <ScanError result={result} onReset={resetScanner} />}
      </main>

      {!isOnline && <ScanOffline />}
      {isSessionExpired && <ScanSessionExpired onRelogin={() => supabase.auth.signOut()} />}
    </div>
  );
}
