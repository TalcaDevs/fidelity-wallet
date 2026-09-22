import { useState, useCallback } from 'react';
import { QRCam } from './QRCam';
import { ManualFallback } from './ManualFallback';
import { useAuth } from '../../hooks/useAuth';
import { playSuccessSound, playRewardSound, playErrorSound } from '../../utils/audioFeedback';
import { supabase } from '../../lib/supabase';
import { mockProcessScan, ScanResult } from '../../services/mockScanService';

type ScanState = 'camera' | 'manual' | 'loading' | 'success' | 'reward' | 'error';

export function Scan() {
  const { session } = useAuth();
  const [state, setState] = useState<ScanState>('camera');
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = useCallback(async (text: string) => {
    setState('loading');
    const res = await mockProcessScan(text);
    setResult(res);
    
    if (res.rewardUnlocked) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
      playRewardSound();
      setState('reward');
    } else if (!res.ok) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      playErrorSound();
      setState('error');
    } else {
      if (navigator.vibrate) navigator.vibrate(100);
      playSuccessSound();
      setState('success');
    }
  }, []);

  const resetScanner = () => {
    setResult(null);
    setState('camera');
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col font-sans overflow-hidden relative">
      
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between z-50 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black">QR</div>
          <div>
            <h1 className="font-bold leading-tight">Escáner</h1>
            <p className="text-xs text-slate-400 font-medium">
              {session?.user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state === 'camera' && (
            <button 
              onClick={() => setState('manual')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-full text-sm font-bold shadow-sm"
            >
              Manual
            </button>
          )}
          <button 
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors rounded-full text-sm font-bold shadow-sm"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative w-full h-full pb-8 px-4 flex flex-col">
        {state === 'camera' && (
          <div className="flex-1 relative animate-in fade-in duration-300 flex flex-col">
            <div className="flex-1 w-full relative">
              <QRCam isActive={true} onScanSuccess={handleScan} />
            </div>
            <p className="text-center text-slate-400 mt-6 font-medium px-8">
              Apunta la cámara al pase del cliente para registrar su visita.
            </p>
          </div>
        )}

        {state === 'manual' && (
          <ManualFallback 
            isLoading={false} 
            onSubmit={handleScan} 
            onCancel={() => setState('camera')} 
          />
        )}

        {state === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl animate-pulse flex items-center justify-center shadow-xl shadow-blue-500/20 mb-6">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-black">Procesando...</h2>
          </div>
        )}

        {state === 'success' && result && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 px-6 text-center">
            <div className="w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)] mb-8">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-black mb-2">{result.alreadyScanned ? 'Ya Escaneado' : '¡Visita Registrada!'}</h2>
            <p className="text-slate-400 text-xl font-medium mb-8">Cliente {result.customerLabel}</p>
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm mb-10">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">Sellos Acumulados</p>
              <div className="text-5xl font-black">
                {result.stampsCount} <span className="text-slate-600 text-3xl">/ {result.targetStamps}</span>
              </div>
            </div>

            <button onClick={resetScanner} className="w-full max-w-sm py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xl transition-colors">
              Escanear otro
            </button>
          </div>
        )}

        {state === 'reward' && result && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 px-6 text-center">
            <div className="w-28 h-28 bg-amber-400 rounded-[2rem] rotate-12 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)] mb-8">
              <svg className="w-14 h-14 text-amber-900 -rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h2 className="text-4xl font-black text-amber-400 mb-2">¡Premio Desbloqueado!</h2>
            <p className="text-slate-300 text-xl font-medium mb-2">Entrega el premio ahora:</p>
            <p className="text-3xl font-bold text-white bg-slate-800 px-6 py-4 rounded-2xl mb-10 border border-slate-700">
              {result.rewardName}
            </p>

            <button onClick={resetScanner} className="w-full max-w-sm py-5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-2xl font-black text-xl transition-colors shadow-xl shadow-amber-500/20">
              Confirmar Entrega
            </button>
            <button onClick={resetScanner} className="w-full max-w-sm py-4 mt-3 text-slate-400 font-bold">
              Escanear otro pase
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 px-6 text-center">
            <div className="w-28 h-28 bg-red-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.3)] mb-8">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-black mb-3">Escaneo Fallido</h2>
            <p className="text-red-400 text-lg font-medium mb-10 max-w-xs">{result?.error || 'Ocurrió un error inesperado al leer el código.'}</p>

            <button onClick={resetScanner} className="w-full max-w-sm py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xl transition-colors">
              Intentar de nuevo
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
