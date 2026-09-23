import { ScanResult } from '../../services/scanService';

export function ScanLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center duration-200">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl animate-pulse flex items-center justify-center shadow-xl shadow-blue-500/20 mb-6">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
      <h2 className="text-2xl font-black">Procesando...</h2>
    </div>
  );
}

export function ScanSuccess({ result, onReset }: { result: ScanResult, onReset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center duration-300 px-6 text-center">
      <div className="w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)] mb-8">
        <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-4xl font-black mb-2">¡Visita Registrada!</h2>
      <p className="text-slate-400 text-xl font-medium mb-8">Cliente {result.customerLabel}</p>
      
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm mb-10">
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">Sellos Acumulados</p>
        <div className="text-5xl font-black">
          {result.stampsCount} <span className="text-slate-600 text-3xl">/ {result.targetStamps}</span>
        </div>
      </div>

      <button onClick={onReset} className="w-full max-w-sm py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xl transition-colors">
        Escanear otro
      </button>
    </div>
  );
}

export function ScanAlreadyScanned({ result, onReset }: { result: ScanResult, onReset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center duration-300 px-6 text-center">
      <div className="w-28 h-28 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.3)] mb-8">
        <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-4xl font-black mb-2 text-amber-500">Ya Escaneado</h2>
      <p className="text-slate-400 text-xl font-medium mb-8">Pase ya registrado hace un momento</p>

      <button onClick={onReset} className="w-full max-w-sm py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xl transition-colors">
        Escanear otro
      </button>
    </div>
  );
}

export function ScanReward({ result, onReset }: { result: ScanResult, onReset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center duration-300 px-6 text-center">
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

      <button onClick={onReset} className="w-full max-w-sm py-5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-2xl font-black text-xl transition-colors shadow-xl shadow-amber-500/20">
        Confirmar Entrega
      </button>
      <button onClick={onReset} className="w-full max-w-sm py-4 mt-3 text-slate-400 font-bold">
        Escanear otro pase
      </button>
    </div>
  );
}

export function ScanError({ result, onReset }: { result: ScanResult | null, onReset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center duration-300 px-6 text-center">
      <div className="w-28 h-28 bg-red-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.3)] mb-8">
        <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-3xl font-black mb-3">Escaneo Fallido</h2>
      <p className="text-red-400 text-lg font-medium mb-10 max-w-xs">{result?.error || 'Ocurrió un error inesperado al leer el código.'}</p>

      <button onClick={onReset} className="w-full max-w-sm py-5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xl transition-colors">
        Intentar de nuevo
      </button>
    </div>
  );
}
