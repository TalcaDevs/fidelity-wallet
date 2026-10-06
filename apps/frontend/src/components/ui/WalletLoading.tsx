import { useTheme } from '../../hooks/useTheme';
import WalletIcon from '../../assets/home/wallet.svg?react';
import { WALLET_THEME } from './walletTheme';

export function WalletLoading({ label = 'Cargando...' }: { label?: string }) {
  useTheme();
  return (
    <div className={`${WALLET_THEME} flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center`} role="status">
      <span aria-hidden="true" className="grid h-14 w-14 -rotate-6 place-items-center rounded-2xl border border-panel-accent/20 bg-panel-surface text-panel-accent shadow-panel motion-safe:animate-pulse"><WalletIcon className="h-7 w-7" /></span>
      <p className="text-sm font-semibold text-panel-muted">{label}</p>
    </div>
  );
}
