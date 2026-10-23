import { useReducer, useCallback } from 'react';
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
  type StampExtras,
} from '../../services/scanService';
import { IdentifierValue } from '../../components/ui/IdentifierInput';
import { ROUTES } from '../../components/routing/routePaths';
import type { MerchantRole } from '../../hooks/useMembership';
import {
  ScanReady,
  ScanLoading,
  ScanSuccess,
  ScanAlreadyScanned,
  ScanReward,
  ScanError,
  ScanRedeemSuccess,
  ScanOffline,
  ScanSessionExpired,
} from './ScanViews';
import { ScanValidation } from './ScanValidation';
import { WALLET_THEME } from '../../components/ui/walletTheme';
import { useTheme } from '../../hooks/useTheme';
import WalletIcon from '../../assets/home/wallet.svg?react';
import SunIcon from '../../assets/home/sun.svg?react';
import MoonIcon from '../../assets/home/moon.svg?react';
import { SCAN_SECONDARY } from './scannerStyles';
import '../../components/admin/panelAnimations.css';
import { useScannerLocation } from './useScannerLocation';
import { scanReducer, initialScanState, type RewardSource } from './scanReducer';

export function Scan({
  merchantId: initialMerchantId,
  session,
  role,
  brandId,
}: {
  merchantId: string;
  session: Session;
  role: MerchantRole | null;
  brandId?: string | null;
}) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { triggerFeedback, resumeAudio } = useScanFeedback();
  const signOut = useSignOut();
  const isOnline = useOnlineStatus();

  const [state, dispatch] = useReducer(scanReducer, initialScanState);
  const { isStarted, status, result, validation, isSessionExpired } = state;

  const { merchantId, locations, activeLocation, selectLocation } = useScannerLocation({
    brandId,
    initialMerchantId,
    role,
  });

  const resetScanner = useCallback(() => {
    dispatch({ type: 'RESET_SCANNER' });
  }, []);

  const handleLocationChange = (newMerchantId: string) => {
    selectLocation(newMerchantId);
    resetScanner();
  };

  const handleFailure = useCallback(
    (res: ScanResult) => {
      triggerFeedback('error');
      if (res.errorCode === 'UNAUTHORIZED') {
        dispatch({
          type: 'FAILURE',
          isSessionExpired: true,
          result: res,
        });
      } else {
        dispatch({
          type: 'FAILURE',
          result: res,
        });
      }
    },
    [triggerFeedback],
  );

  // Escanear o buscar a mano solo valida: nada se suma hasta "Agregar sello".
  const handleLookup = useCallback(
    async (lookup: LookupTarget) => {
      dispatch({ type: 'START_LOOKUP' });
      const res = await validateScan({ merchantId, target: lookup });
      if (!res.ok) {
        handleFailure({ ok: false, error: res.error, errorCode: res.errorCode });
        return;
      }
      const { ok: _ok, ...found } = res;
      dispatch({ type: 'LOOKUP_SUCCESS', validation: found });
    },
    [merchantId, handleFailure],
  );

  const handleAddStamp = useCallback(
    async (extras: StampExtras) => {
      if (!validation) return;
      dispatch({ type: 'START_ACTION' });
      const res = await processScan({
        merchantId,
        action: 'STAMP',
        target: { validationToken: validation.validationToken },
        extras,
      });

      if (!res.ok) {
        handleFailure(res);
      } else if (res.alreadyScanned) {
        triggerFeedback('alreadyScanned');
        dispatch({ type: 'ACTION_ALREADY_SCANNED', result: res });
      } else {
        triggerFeedback(res.rewardUnlocked ? 'reward' : 'success');
        dispatch({ type: 'ACTION_SUCCESS', result: res });
      }
    },
    [validation, merchantId, handleFailure, triggerFeedback],
  );

  const openReward = useCallback((from: RewardSource) => {
    dispatch({ type: 'OPEN_REWARD', from });
  }, []);

  // promotionId: el premio que eligió el cliente (los sellos sirven para cualquier promoción activa).
  const handleRedeem = useCallback(
    async (promotionId?: string) => {
      if (!validation) return;
      dispatch({ type: 'START_ACTION' });
      const res = await processScan({
        merchantId,
        action: 'REDEEM',
        target: { validationToken: validation.validationToken },
        promotionId,
      });

      if (!res.ok) {
        handleFailure(res);
      } else if (res.alreadyScanned) {
        // Doble toque sobre el mismo premio: el canje ya estaba hecho. NO es un "premio entregado"
        // nuevo; mostrarlo así haría que el cajero lo entregue dos veces.
        triggerFeedback('alreadyScanned');
        dispatch({ type: 'ACTION_ALREADY_SCANNED', result: res });
      } else {
        triggerFeedback('success');
        dispatch({ type: 'ACTION_REDEEM_SUCCESS', result: res });
      }
    },
    [validation, merchantId, handleFailure, triggerFeedback],
  );

  const handleManual = useCallback(
    (identifier: IdentifierValue) => {
      resumeAudio();
      const customer =
        identifier.kind === 'rut'
          ? { rut: identifier.value }
          : identifier.kind === 'phone'
            ? { phone: identifier.value }
            : { email: identifier.value };
      void handleLookup({ customer });
    },
    [handleLookup, resumeAudio],
  );

  const leaveReward = useCallback(() => {
    dispatch({ type: 'LEAVE_REWARD' });
  }, []);

  const startScanning = useCallback(() => {
    resumeAudio();
    dispatch({ type: 'START_CAMERA' });
  }, [resumeAudio]);

  const switchToManual = useCallback(() => {
    resumeAudio();
    dispatch({ type: 'SWITCH_TO_MANUAL' });
  }, [resumeAudio]);

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
              <p className="max-w-[260px] truncate text-xs text-panel-muted font-medium">
                {activeLocation?.name ? `${activeLocation.name} · ` : ''}{session?.user.email}
              </p>
            </div>
          </div>
          <nav aria-label="Herramientas del escáner" className="flex items-center gap-2">
            {role === 'OWNER' && locations.length > 1 && (
              <div className="relative inline-flex items-center">
                <select
                  aria-label="Seleccionar sucursal"
                  value={merchantId}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className={`${SCAN_SECONDARY} appearance-none pr-8 cursor-pointer focus:outline-none focus:border-panel-accent`}
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-panel-surface text-panel-text">
                      {loc.name}
                    </option>
                  ))}
                </select>
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-panel-muted text-[10px]">
                  ▼
                </span>
              </div>
            )}
            {status === 'camera' ? (
              <button onClick={switchToManual} className={SCAN_SECONDARY}>Manual</button>
            ) : status === 'manual' ? (
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
        {status === 'manual' && <ManualFallback onSubmit={handleManual} onCancel={resetScanner} />}
        {status === 'camera' && !isStarted && <ScanReady onStart={startScanning} />}
        {status === 'camera' && isStarted && (
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

        {status === 'loading' && <ScanLoading />}
        {status === 'validation' && validation && (
          <ScanValidation
            key={validation.validationToken}
            validation={validation}
            onAddStamp={(extras) => void handleAddStamp(extras)}
            onScanAnother={resetScanner}
            onRedeem={() => openReward('validation')}
          />
        )}
        {status === 'success' && result && (
          <ScanSuccess
            cardType={validation?.cardType ?? 'STAMPS'}
            result={result}
            onReset={resetScanner}
            onRedeem={result.rewardUnlocked ? () => openReward('stamped') : undefined}
          />
        )}
        {status === 'redeemSuccess' && result && <ScanRedeemSuccess result={result} onReset={resetScanner} />}
        {status === 'alreadyScanned' && result && <ScanAlreadyScanned result={result} onReset={resetScanner} />}
        {status === 'reward' && result && (
          <ScanReward
            key={result.scanId ?? result.passId}
            result={result}
            cardType={validation?.cardType ?? 'STAMPS'}
            onReset={leaveReward}
            onRedeem={(id) => void handleRedeem(id)}
          />
        )}
        {status === 'error' && <ScanError result={result} onReset={resetScanner} />}
      </main>

      {!isOnline ? (
        <ScanOffline />
      ) : isSessionExpired ? (
        <ScanSessionExpired onRelogin={() => supabase.auth.signOut()} />
      ) : null}
    </div>
  );
}
