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
import { WALLET_THEME } from '../../components/ui/walletTheme';
import { useTheme } from '../../hooks/useTheme';
import WalletIcon from '../../assets/home/wallet.svg?react';
import SunIcon from '../../assets/home/sun.svg?react';
import MoonIcon from '../../assets/home/moon.svg?react';
import { SCAN_PRIMARY, SCAN_SECONDARY } from './scannerStyles';
import '../../components/admin/panelAnimations.css';

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
  const { isDarkMode, toggleDarkMode } = useTheme();
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
    <div className={`${WALLET_THEME} fw-scanner h-[100dvh] w-full flex flex-col overflow-hidden relative isolate [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-panel-accent [&_:focus-visible]:outline-offset-4 motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[650px] w-[650px] rounded-full bg-[radial-gradient(ellipse,#087bd712,transparent_65%)] dark:bg-[radial-gradient(ellipse,#087bd722,transparent_65%)]" />
        <div className="absolute -right-48 bottom-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(ellipse,#d69e0910,transparent_65%)]" />
      </div>
      <header className="shrink-0 border-b border-panel-border bg-panel-surface/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8 sm:py-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 -rotate-6 place-items-center rounded-xl bg-panel-primary text-white"><WalletIcon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="font-extrabold leading-tight tracking-tight">Escáner<span className="text-panel-gold">.</span></h1>
              <p className="max-w-[220px] truncate text-xs text-panel-muted font-medium">{session?.user.email}</p>
            </div>
          </div>
          <nav aria-label="Herramientas del escáner" className="flex items-center gap-2">
            {state === 'camera' ? (
              <button onClick={() => { resumeAudio(); setState('manual'); }} className={SCAN_SECONDARY}>Manual</button>
            ) : state === 'manual' ? (
              <button onClick={resetScanner} className={SCAN_SECONDARY}>Cámara</button>
            ) : null}
            {role === 'OWNER' && <Link to={ROUTES.dashboard} className={SCAN_SECONDARY}>Panel</Link>}
            <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'} className="grid h-11 w-11 place-items-center rounded-xl border border-panel-border bg-panel-surface text-panel-muted transition-colors hover:bg-panel-soft">
              {isDarkMode ? <SunIcon aria-hidden="true" className="h-4 w-4" /> : <MoonIcon aria-hidden="true" className="h-4 w-4" />}
            </button>
            <button onClick={() => void signOut()} className="min-h-11 px-3 py-2 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">Salir</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex-1 min-h-0 relative w-full max-w-3xl px-4 py-5 sm:px-8 sm:py-8 flex flex-col">
        {state === 'manual' && <ManualFallback onSubmit={handleManual} onCancel={resetScanner} />}
        {state === 'camera' && !isStarted && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <section aria-labelledby="scan-ready-title" className="flex min-h-full flex-col items-center justify-center text-center py-4" data-entry-stagger>
              <div aria-hidden="true" className="relative w-24 h-24 shrink-0 rounded-3xl border border-panel-accent/20 bg-panel-surface flex items-center justify-center mb-7 shadow-panel">
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-panel-canvas bg-panel-gold" />
                <svg className="w-10 h-10 text-panel-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-panel-accent">Cada visita cuenta</p>
                <h2 id="scan-ready-title" className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Listo para escanear</h2>
                <p className="text-panel-muted mb-7 max-w-sm text-sm leading-relaxed">Presiona el botón para activar la cámara y el sonido.</p>
              </div>
              <button onClick={() => { resumeAudio(); setIsStarted(true); }} className={SCAN_PRIMARY}>Comenzar a escanear</button>
              <ol className="mt-9 grid w-full max-w-xl grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                {[
                  ['01', 'Escanea', 'Lee el QR de la tarjeta del cliente.'],
                  ['02', 'Revisa', 'Confirma el cliente y su saldo.'],
                  ['03', 'Suma o canjea', 'Elige la acción antes de registrarla.'],
                ].map(([step, title, description]) => (
                  <li key={step} className="flex gap-3 sm:block rounded-2xl border border-panel-border bg-panel-surface/80 p-4 shadow-panel">
                    <span className="text-[11px] font-extrabold text-panel-gold sm:mb-3 sm:block">{step}</span>
                    <div><p className="text-sm font-extrabold">{title}</p><p className="mt-1 text-xs leading-relaxed text-panel-muted">{description}</p></div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
        {state === 'camera' && isStarted && (
          <div className="flex-1 min-h-0 relative flex flex-col">
            <div className="flex-1 min-h-0 w-full relative">
              {!isOnline ? (
                <div className="w-full h-full bg-panel-surface rounded-2xl flex items-center justify-center">
                  <p className="text-panel-muted font-bold">Cámara pausada (Sin red)</p>
                </div>
              ) : (
                <QRCam isActive={!isSessionExpired} onScanSuccess={(passToken) => void handleLookup({ passToken })} />
              )}
            </div>
            <p className="shrink-0 text-center text-panel-muted mt-4 text-sm leading-relaxed font-medium px-4">Apunta la cámara al pase del cliente para validarlo.</p>
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
