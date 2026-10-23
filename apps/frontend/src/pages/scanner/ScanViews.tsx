import { useState } from 'react';
import { balanceUnit, isRewardEnabled, resolveRewardCurrency, type CardType } from '@fidelity/shared';
import { ScanResult } from '../../services/scanService';
import { SCAN_PRIMARY } from './scannerStyles';

export function ScanReady({ onStart }: { onStart: () => void }) {
  return (
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
        <button onClick={onStart} className={SCAN_PRIMARY}>Comenzar a escanear</button>
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
  );
}

const clp = new Intl.NumberFormat('es-CL');

export function ScanLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-20 h-20 bg-panel-primary rounded-3xl animate-pulse flex items-center justify-center shadow-xl shadow-panel-primary/15 mb-6">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
      <h2 className="text-2xl font-extrabold">Procesando...</h2>
    </div>
  );
}

export function ScanSuccess({ result, cardType = 'STAMPS', onReset, onRedeem }: { result: ScanResult, cardType?: CardType, onReset: () => void, onRedeem?: () => void }) {
  const stampsEnabled = result.stampsEnabled ?? cardType !== 'POINTS';
  const pointsEnabled = result.pointsEnabled ?? cardType === 'POINTS';
  const stampsAdded = result.stampsAdded ?? (stampsEnabled ? 1 : 0);
  const pointsAdded = result.pointsAdded ?? 0;
  const title = stampsAdded > 0 && pointsAdded > 0
    ? `¡${stampsAdded} ${balanceUnit('STAMPS', stampsAdded)} y ${clp.format(pointsAdded)} ${balanceUnit('POINTS', pointsAdded)} agregados!`
    : pointsAdded > 0 ? `¡${clp.format(pointsAdded)} ${balanceUnit('POINTS', pointsAdded)} ${pointsAdded === 1 ? 'agregado' : 'agregados'}!`
    : stampsAdded > 1 ? `¡${stampsAdded} sellos agregados!` : '¡Sello agregado!';
  return (
    <div data-scan-entry className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto py-5 px-2 sm:px-6 text-center [&>*]:shrink-0 [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
      <div className="w-20 h-20 shrink-0 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)] mb-5">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">{title}</h2>
      <p className="text-panel-muted text-xl font-medium mb-5">Cliente {result.customerLabel}</p>

      <div className="bg-panel-surface border border-panel-border rounded-3xl p-6 w-full max-w-sm mb-6">
        {stampsEnabled && <div><p className="text-panel-muted font-bold uppercase tracking-widest text-sm mb-2">Sellos acumulados</p><p className="text-4xl font-extrabold">{clp.format(result.stampsCount ?? 0)}</p></div>}
        {pointsEnabled && <div className={stampsEnabled ? 'mt-4' : ''}><p className="text-panel-muted font-bold uppercase tracking-widest text-sm mb-2">Puntos acumulados</p><p className="text-4xl font-extrabold">{clp.format(result.pointsCount ?? 0)}</p></div>}
      </div>

      {onRedeem && (
        <button onClick={onRedeem} className="w-full max-w-sm py-5 mb-3 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-2xl font-extrabold text-xl transition-colors shadow-xl shadow-amber-500/20">
          Canjear premio
        </button>
      )}
      <button onClick={onReset} className="w-full max-w-sm py-5 bg-panel-soft hover:bg-panel-border/60 rounded-2xl font-bold text-xl transition-colors">
        Escanear otro
      </button>
    </div>
  );
}

export function ScanAlreadyScanned({ result, onReset }: { result?: ScanResult | null, onReset: () => void }) {
  return (
    <div data-scan-entry className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto py-5 px-2 sm:px-6 text-center [&>*]:shrink-0 [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
      <div className="w-20 h-20 shrink-0 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.3)] mb-5">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 text-panel-gold">Ya Escaneado</h2>
      <p className="text-panel-muted text-xl font-medium mb-5">
        {result?.message ?? 'Este cliente ya sumó hace poco'}
      </p>

      <button onClick={onReset} className="w-full max-w-sm py-5 bg-panel-soft hover:bg-panel-border/60 rounded-2xl font-bold text-xl transition-colors">
        Escanear otro
      </button>
    </div>
  );
}

/**
 * El saldo del cliente alcanza para al menos un premio. Los sellos sirven para cualquier
 * promoción activa, así que el cliente elige cuál canjear, o ninguna, y sigue juntando.
 */
export function ScanReward({ result, cardType = 'STAMPS', onReset, onRedeem }: { result: ScanResult, cardType?: CardType, onReset: () => void, onRedeem?: (promotionId?: string) => void }) {
  const stampsEnabled = result.stampsEnabled ?? cardType !== 'POINTS';
  const pointsEnabled = result.pointsEnabled ?? cardType === 'POINTS';
  const promotions = (result.availablePromotions ?? []).filter((p) => isRewardEnabled(p, { type: cardType, stampsEnabled, pointsEnabled }));
  const redeemable = promotions.filter((p) => p.canRedeem);
  // Con una sola opción canjeable no hay nada que elegir.
  const [selectedId, setSelectedId] = useState<string | undefined>(
    redeemable.length === 1 ? redeemable[0].id : undefined,
  );
  const selected = promotions.find((p) => p.id === selectedId);

  return (
    <div data-scan-entry className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto py-5 px-2 sm:px-6 text-center [&>*]:shrink-0 [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
      <div className="w-20 h-20 bg-amber-400 rounded-[1.5rem] rotate-12 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)] mb-6 shrink-0">
        <svg className="w-10 h-10 text-amber-900 -rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      </div>
      <h2 className="text-3xl font-extrabold text-panel-gold mb-1">¡Puede canjear un premio!</h2>
      {result.alreadyScanned && (
        // El cliente está en el bloqueo de 30 min: le alcanza para un premio, pero el sello de
        // esta visita NO se sumó. Sin este aviso, el cajero cree que registró la visita.
        <p role="status" className="w-full max-w-sm mt-2 mb-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-panel-gold">
          {cardType === 'POINTS' ? 'Puntos de esta compra no sumados.' : 'Sello de esta visita no sumado.'} {result.message}
        </p>
      )}
      <p className="text-panel-muted text-lg font-medium mb-6">
        {result.customerLabel && <>Cliente {result.customerLabel} &middot; </>}
        <span className="font-extrabold text-panel-text">
          {stampsEnabled && `${clp.format(result.stampsCount ?? 0)} sellos`}
          {stampsEnabled && pointsEnabled && ' · '}
          {pointsEnabled && `${clp.format(result.pointsCount ?? 0)} puntos`}
        </span>
      </p>

      {promotions.length > 0 ? (
        <div role="group" aria-label="Premio a canjear" className="w-full max-w-sm space-y-2 mb-6 text-left">
          <p className="text-panel-muted text-sm font-bold uppercase tracking-widest mb-1">¿Qué premio elige el cliente?</p>
          {promotions.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isSelected}
                disabled={!p.canRedeem}
                onClick={() => setSelectedId(p.id)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-2 transition-colors ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/10'
                    : p.canRedeem
                      ? 'border-panel-border bg-panel-soft hover:border-panel-accent/50'
                      : 'border-panel-border bg-panel-surface opacity-50 cursor-not-allowed'
                }`}
              >
                <span>
                  <span className="block font-bold text-panel-text">{p.rewardName}</span>
                  <span className="block text-sm text-panel-muted">{p.name}</span>
                </span>
                {(() => {
                  const pUnit = resolveRewardCurrency(p, cardType) === 'POINTS' ? 'Puntos' : 'Sellos';
                  const pBalance = resolveRewardCurrency(p, cardType) === 'POINTS' ? (result.pointsCount ?? 0) : (result.stampsCount ?? 0);
                  return (
                    <span className={`shrink-0 text-sm font-extrabold ${p.canRedeem ? 'text-panel-gold' : 'text-panel-muted'}`}>
                      {p.canRedeem ? `${clp.format(p.targetStamps)} ${pUnit}` : `Faltan ${clp.format(p.targetStamps - pBalance)}`}
                    </span>
                  );
                })()}
              </button>
            );
          })}
        </div>
      ) : (
        // Respaldo por si el backend no envía la lista: se canjea la promoción de referencia.
        <p className="text-3xl font-bold text-panel-text bg-panel-soft px-6 py-4 rounded-2xl mb-5 border border-panel-border">
          {result.rewardName}
        </p>
      )}

      <button
        onClick={() => onRedeem?.(selectedId)}
        disabled={promotions.length > 0 && !selected}
        className="w-full max-w-sm py-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-amber-950 rounded-2xl font-extrabold text-xl transition-colors shadow-xl shadow-amber-500/20"
      >
        {selected ? `Entregar ${selected.rewardName}` : promotions.length > 0 ? 'Elige un premio' : 'Confirmar Entrega'}
      </button>
      <button onClick={onReset} className="w-full max-w-sm py-4 mt-3 text-panel-muted font-bold">
        No canjear ahora, seguir juntando
      </button>
    </div>
  );
}

export function ScanError({ result, onReset }: { result: ScanResult | null, onReset: () => void }) {
  return (
    <div data-scan-entry className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto py-5 px-2 sm:px-6 text-center [&>*]:shrink-0 [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
      <div className="w-20 h-20 shrink-0 bg-red-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.3)] mb-5">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-3xl font-extrabold mb-3">Escaneo Fallido</h2>
      <p className="text-red-600 dark:text-red-400 text-lg font-medium mb-6 max-w-xs">{result?.error || 'Ocurrió un error inesperado al leer el código.'}</p>

      <button onClick={onReset} className="w-full max-w-sm py-5 bg-panel-soft hover:bg-panel-border/60 rounded-2xl font-bold text-xl transition-colors">
        Intentar de nuevo
      </button>
    </div>
  );
}

export function ScanRedeemSuccess({ result, onReset }: { result: ScanResult, onReset: () => void }) {
  return (
    <div data-scan-entry className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto py-5 px-2 sm:px-6 text-center [&>*]:shrink-0 [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
      <div className="w-20 h-20 shrink-0 bg-panel-primary rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.3)] mb-5">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">¡Premio entregado!</h2>
      <p className="text-panel-muted text-xl font-medium mb-1">Cliente {result.customerLabel}</p>
      {result.message && (
        <p className="text-panel-text text-lg font-bold mb-5 max-w-sm">{result.message}</p>
      )}
      
      <button onClick={onReset} className="w-full max-w-sm py-5 bg-panel-soft hover:bg-panel-border/60 rounded-2xl font-bold text-xl transition-colors">
        Escanear otro
      </button>
    </div>
  );
}

export function ScanOffline() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-panel-canvas/95 backdrop-blur-md px-6 text-center">
      <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m1.336-1.336l2.671-2.671a4.5 4.5 0 016.364 0l1.757 1.757M16 16v.01" />
        </svg>
      </div>
      <h2 className="text-3xl font-extrabold text-panel-text mb-2">Sin Conexión</h2>
      <p className="text-panel-muted text-lg font-medium max-w-xs">
        Se perdió la conexión a internet. El escáner se reactivará automáticamente cuando vuelva la red.
      </p>
    </div>
  );
}

export function ScanSessionExpired({ onRelogin }: { onRelogin: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-panel-canvas/95 backdrop-blur-md px-6 text-center">
      <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-3xl font-extrabold text-panel-text mb-2">Sesión Caducada</h2>
      <p className="text-panel-muted text-lg font-medium max-w-xs mb-5">
        Por tu seguridad, tu sesión ha expirado. Vuelve a iniciar sesión para continuar.
      </p>
      <button 
        onClick={onRelogin} 
        className="w-full max-w-sm py-4 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-2xl font-extrabold text-lg transition-colors"
      >
        Volver al Login
      </button>
    </div>
  );
}
