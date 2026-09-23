import { useState, useCallback } from 'react';
import { QRCam } from './QRCam';
import { ManualFallback } from './ManualFallback';
import { useAuth } from '../../hooks/useAuth';
import { useScanFeedback } from '../../hooks/useScanFeedback';
import { supabase } from '../../lib/supabase';
import { processScan, ScanResult } from '../../services/scanService';
import { ScanLoading, ScanSuccess, ScanAlreadyScanned, ScanReward, ScanError } from './ScanViews';

type ScanState = 'camera' | 'manual' | 'loading' | 'success' | 'alreadyScanned' | 'reward' | 'error';

export function Scan() {
  const { session } = useAuth();
  const triggerFeedback = useScanFeedback();
  const [state, setState] = useState<ScanState>('camera');
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = useCallback(async (text: string) => {
    setState('loading');
    const res = await processScan(text);
    setResult(res);
    
    if (res.rewardUnlocked) {
      triggerFeedback('reward');
      setState('reward');
    } else if (!res.ok) {
      triggerFeedback('error');
      setState('error');
    } else if (res.alreadyScanned) {
      triggerFeedback('alreadyScanned');
      setState('alreadyScanned');
    } else {
      triggerFeedback('success');
      setState('success');
    }
  }, [triggerFeedback]);

  const resetScanner = () => {
    setResult(null);
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
        {state === 'camera' && (
          <div className="flex-1 relative duration-300 flex flex-col">
            <div className="flex-1 w-full relative">
              <QRCam isActive={true} onScanSuccess={handleScan} />
            </div>
            <p className="text-center text-slate-400 mt-6 font-medium px-8">
              Apunta la cámara al pase del cliente para registrar su visita.
            </p>
          </div>
        )}

        {state === 'manual' && <ManualFallback isLoading={false} onSubmit={handleScan} onCancel={resetScanner} />}
        {state === 'loading' && <ScanLoading />}
        {state === 'success' && result && <ScanSuccess result={result} onReset={resetScanner} />}
        {state === 'alreadyScanned' && result && <ScanAlreadyScanned result={result} onReset={resetScanner} />}
        {state === 'reward' && result && <ScanReward result={result} onReset={resetScanner} />}
        {state === 'error' && <ScanError result={result} onReset={resetScanner} />}
      </main>
    </div>
  );
}
