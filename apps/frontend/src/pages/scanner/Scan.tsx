import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCam } from './QRCam';
import { ManualFallback } from './ManualFallback';

import { useScanFeedback } from '../../hooks/useScanFeedback';
import { useSignOut } from '../../hooks/useSignOut';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import {
  processScan,
  validateScan,
  type LookupTarget,
  type ScanResult,
  type ScanValidation as Validation,
  type StampExtras,
} from '../../services/scanService';
import { IdentifierValue } from '../../components/ui/IdentifierInput';
import { ROUTES } from '../../components/routing/routePaths';
import type { MerchantRole } from '../../hooks/useMembership';
import { ScanLoading, ScanSuccess, ScanAlreadyScanned, ScanReward, ScanError, ScanRedeemSuccess, ScanOffline, ScanSessionExpired } from './ScanViews';
import { ScanValidation } from './ScanValidation';

type ScanState = 'camera' | 'manual' | 'loading' | 'validation' | 'success' | 'alreadyScanned' | 'reward' | 'error' | 'redeemSuccess';

/** El canje usa la misma pantalla venga de la validación o de un sello recién sumado. */
const rewardFromValidation = (v: Validation): ScanResult => ({
  ok: true,
  passId: v.passId,
  customerLabel: v.customerLabel,
  stampsCount: v.stampsCount,
  targetStamps: v.targetStamps,
  rewardUnlocked: v.rewardUnlocked,
  rewardName: v.rewardName,
  availablePromotions: v.availablePromotions,
});

export function Scan({ merchantId, session, role }: { merchantId: string, session: Session, role: MerchantRole | null }) {
  const { triggerFeedback, resumeAudio } = useScanFeedback();
  const signOut = useSignOut();
  const [isStarted, setIsStarted] = useState(false);
  const [state, setState] = useState<ScanState>('camera');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  // Desde dónde se abrió el canje: "seguir juntando" vuelve a la validación si aún no se selló.
  const [rewardFrom, setRewardFrom] = useState<'validation' | 'stamped'>('stamped');
  
  const isOnline = useOnlineStatus();
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const handleFailure = useCallback((res: { errorCode?: string }) => {
    triggerFeedback('error');
    if (res.errorCode === 'UNAUTHORIZED') {
      setIsSessionExpired(true);
    } else {
      setState('error');
    }
  }, [triggerFeedback]);

  // Escanear o buscar a mano solo valida: nada se suma hasta "Agregar sello".
  const handleLookup = useCallback(async (lookup: LookupTarget) => {
    setState('loading');
    setResult(null);
    const res = await validateScan({ merchantId, target: lookup });
    if (!res.ok) {
      setResult({ ok: false, error: res.error, errorCode: res.errorCode });
      handleFailure(res);
      return;
    }
    const { ok: _ok, ...found } = res;
    setValidation(found);
    setState('validation');
  }, [merchantId, handleFailure]);

  const handleAddStamp = useCallback(async (extras: StampExtras) => {
    if (!validation) return;
    setState('loading');
    const res = await processScan({
      merchantId,
      action: 'STAMP',
      target: { validationToken: validation.validationToken },
      extras,
    });
    setResult(res);

    if (!res.ok) {
      handleFailure(res);
    } else if (res.alreadyScanned) {
      triggerFeedback('alreadyScanned');
      setState('alreadyScanned');
    } else {
      triggerFeedback(res.rewardUnlocked ? 'reward' : 'success');
      setState('success');
    }
  }, [validation, merchantId, handleFailure, triggerFeedback]);

  const openReward = useCallback((from: 'validation' | 'stamped') => {
    if (from === 'validation' && validation) setResult(rewardFromValidation(validation));
    setRewardFrom(from);
    setState('reward');
  }, [validation]);

  // promotionId: el premio que eligió el cliente (los sellos sirven para cualquier promoción activa).
  const handleRedeem = useCallback(async (promotionId?: string) => {
    if (!validation) return;
    setState('loading');
    const res = await processScan({
      merchantId,
      action: 'REDEEM',
      target: { validationToken: validation.validationToken },
      promotionId,
    });
    setResult(res);

    if (!res.ok) {
      handleFailure(res);
    } else if (res.alreadyScanned) {
      // Doble toque sobre el mismo premio: el canje ya estaba hecho. NO es un "premio entregado"
      // nuevo; mostrarlo así haría que el cajero lo entregue dos veces.
      triggerFeedback('alreadyScanned');
      setState('alreadyScanned');
    } else {
      triggerFeedback('success');
      setState('redeemSuccess');
    }
  }, [validation, merchantId, handleFailure, triggerFeedback]);

  const handleManual = useCallback((identifier: IdentifierValue) => {
    resumeAudio();
    const customer =
      identifier.kind === 'rut'
        ? { rut: identifier.value }
        : identifier.kind === 'phone'
          ? { phone: identifier.value }
          : { email: identifier.value };
    void handleLookup({ customer });
  }, [handleLookup, resumeAudio]);

  const resetScanner = () => {
    setResult(null);
    setValidation(null);
    setState('camera');
  };

  const leaveReward = () => {
    if (rewardFrom === 'validation' && validation) {
      setState('validation');
    } else {
      resetScanner();
    }
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
          {state === 'camera' ? (
            <button
              onClick={() => {
                resumeAudio();
                setState('manual');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-full text-sm font-bold shadow-sm"
            >
              Manual
            </button>
          ) : state === 'manual' ? (
            <button
              onClick={resetScanner}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-full text-sm font-bold shadow-sm"
            >
              Cámara
            </button>
          ) : null}
          {/* El dueño también escanea, pero su casa es el panel: sin esto quedaba atrapado acá. */}
          {role === 'OWNER' && (
            <Link to={ROUTES.dashboard} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-full text-sm font-bold shadow-sm">
              Panel
            </Link>
          )}
          <button onClick={() => void signOut()} className="px-4 py-2 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors rounded-full text-sm font-bold shadow-sm">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative w-full h-full pb-8 px-4 flex flex-col">
        {state === 'manual' && (
          <ManualFallback onSubmit={handleManual} onCancel={resetScanner} />
        )}

        {state === 'camera' && !isStarted && (
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
        )}

        {state === 'camera' && isStarted && (
          <div className="flex-1 relative duration-300 flex flex-col">
            <div className="flex-1 w-full relative">
              {!isOnline ? (
                <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                  <p className="text-slate-500 font-bold">Cámara pausada (Sin red)</p>
                </div>
              ) : (
                <QRCam isActive={!isSessionExpired} onScanSuccess={(passToken) => void handleLookup({ passToken })} />
              )}
            </div>
            <p className="text-center text-slate-400 mt-6 font-medium px-8">
              Apunta la cámara al pase del cliente para validarlo.
            </p>
          </div>
        )}

        {state === 'loading' && <ScanLoading />}
        {state === 'validation' && validation && (
          <ScanValidation
            key={validation.validationToken}
            validation={validation}
            onAddStamp={(extras) => void handleAddStamp(extras)}
            onScanAnother={resetScanner}
            onRedeem={() => openReward('validation')}
          />
        )}
        {state === 'success' && result && (
          <ScanSuccess
            cardType={validation?.cardType ?? 'STAMPS'}
            result={result}
            onReset={resetScanner}
            onRedeem={result.rewardUnlocked ? () => openReward('stamped') : undefined}
          />
        )}
        {state === 'redeemSuccess' && result && <ScanRedeemSuccess result={result} onReset={resetScanner} />}
        {state === 'alreadyScanned' && result && <ScanAlreadyScanned result={result} onReset={resetScanner} />}
        {state === 'reward' && result && <ScanReward key={result.scanId ?? result.passId} result={result} cardType={validation?.cardType ?? 'STAMPS'} onReset={leaveReward} onRedeem={(id) => void handleRedeem(id)} />}
        {state === 'error' && <ScanError result={result} onReset={resetScanner} />}
      </main>

      {!isOnline ? (
        <ScanOffline />
      ) : isSessionExpired ? (
        <ScanSessionExpired onRelogin={() => supabase.auth.signOut()} />
      ) : null}
    </div>
  );
}
