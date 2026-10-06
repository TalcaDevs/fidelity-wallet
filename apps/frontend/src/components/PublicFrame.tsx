import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from './routing/routePaths';
import { WALLET_THEME } from './ui/walletTheme';
import WalletIcon from '../assets/home/wallet.svg?react';
import SunIcon from '../assets/home/sun.svg?react';
import MoonIcon from '../assets/home/moon.svg?react';
import './admin/panelAnimations.css';

/** Public pages share a quiet backdrop; merchant branding stays inside their content. */
export function PublicFrame({ children, brandLabel = 'Fidelity Wallet, inicio' }: { children: ReactNode; brandLabel?: string }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  return (
    <div className={`${WALLET_THEME} fw-public relative isolate flex min-h-svh flex-col overflow-x-clip [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-panel-accent [&_:focus-visible]:outline-offset-4 motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top_left,#087bd712,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top_left,#087bd722,transparent_65%)]" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link to={ROUTES.home} aria-label={brandLabel} className="inline-flex items-center gap-2.5 whitespace-nowrap">
          <span aria-hidden="true" className="grid h-9 w-9 -rotate-6 place-items-center rounded-xl bg-panel-primary text-white"><WalletIcon className="h-5 w-5" /></span>
          <span className="text-lg font-extrabold tracking-[-0.8px]">fidelity<span className="font-medium">wallet</span><span className="text-panel-gold">.</span></span>
        </Link>
        <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'} className="grid h-11 w-11 place-items-center rounded-xl border border-panel-border bg-panel-surface text-panel-muted transition-colors hover:bg-panel-soft">
          {isDarkMode ? <SunIcon className="h-4 w-4" aria-hidden="true" /> : <MoonIcon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-panel-muted sm:px-8">
        <span>Fidelización que se siente cerca.</span>
        <Link to={ROUTES.home} className="font-semibold hover:text-panel-accent">Volver al inicio ↗</Link>
      </footer>
    </div>
  );
}
