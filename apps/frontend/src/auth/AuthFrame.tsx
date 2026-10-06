import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ROUTES } from '../components/routing/routePaths';
import { WALLET_THEME } from '../components/ui/walletTheme';
import WalletIcon from '../assets/home/wallet.svg?react';
import SunIcon from '../assets/home/sun.svg?react';
import MoonIcon from '../assets/home/moon.svg?react';
import { AuthParticles } from './AuthParticles';
import '../components/admin/panelAnimations.css';

export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <div className={`${WALLET_THEME} relative isolate flex min-h-svh flex-col overflow-x-clip [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-panel-accent [&_:focus-visible]:outline-offset-4 motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none`}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-56 -top-64 h-[800px] w-[800px] rounded-full bg-[radial-gradient(ellipse,#087bd713,transparent_65%)] dark:bg-[radial-gradient(ellipse,#087bd726,transparent_65%)]" />
        <div className="absolute -bottom-72 -right-48 h-[760px] w-[760px] rounded-full bg-[radial-gradient(ellipse,#d69e0910,transparent_65%)] dark:bg-[radial-gradient(ellipse,#d69e0914,transparent_65%)]" />
        <AuthParticles dark={isDarkMode} reducedMotion={reducedMotion} />
      </div>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-10 sm:py-8">
        <Link to={ROUTES.home} aria-label="Fidelity Wallet, inicio" className="inline-flex items-center gap-2.5 whitespace-nowrap">
          <span className="grid h-9 w-9 -rotate-6 place-items-center rounded-xl bg-panel-primary text-white shadow-sm"><WalletIcon className="h-5 w-5" aria-hidden="true" /></span>
          <span className="text-lg font-extrabold tracking-[-0.8px] sm:text-xl">fidelity<span className="font-medium">wallet</span><span className="text-panel-gold">.</span></span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to={ROUTES.home} className="hidden text-xs font-semibold text-panel-muted transition-colors hover:text-panel-accent sm:inline-flex">← Volver al inicio</Link>
          <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'} className="grid h-10 w-10 place-items-center rounded-xl border border-panel-border bg-panel-surface/70 text-panel-muted transition-colors hover:bg-panel-soft">
            {isDarkMode ? <SunIcon className="h-4 w-4" aria-hidden="true" /> : <MoonIcon className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-5 pb-10 pt-4 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:py-8">
        <section aria-label="Tu programa de fidelización" className="fw-auth-story hidden lg:block" data-entry-stagger>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-panel-accent">Más cerca de tus clientes</p>
          <h2 className="text-5xl leading-[1.14] font-extrabold tracking-[-2px]">Tus clientes vuelven.<br /><span className="text-panel-accent">Tu negocio crece.</span></h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-panel-muted">Tu tarjeta, tu equipo y tus recompensas. Todo en un mismo lugar.</p>
          <div aria-hidden="true" className="relative mt-12 max-w-[420px] py-5 pr-8">
            <div className="absolute inset-x-7 inset-y-5 rotate-[-7deg] rounded-3xl border border-panel-accent/15 bg-panel-accent/5" />
            <div className="relative rounded-3xl border border-panel-border bg-panel-surface/90 p-7 shadow-panel">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold text-panel-muted"><WalletIcon className="h-4 w-4 text-panel-accent" />Tu tarjeta digital</span><span className="h-2 w-2 rounded-full bg-panel-gold" /></div>
              <p className="mt-7 text-2xl font-extrabold tracking-tight">Cada visita cuenta.</p>
              <div className="mt-5 flex gap-3">
                {[0, 1, 2, 3, 4].map((stamp) => <span key={stamp} className={`grid h-10 w-10 place-items-center rounded-full border ${stamp === 4 ? 'border-panel-gold/30 bg-panel-gold/10 text-panel-gold' : 'border-panel-accent/20 bg-panel-accent/10 text-panel-accent'}`}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stamp === 4 ? 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z' : 'm5 12 4 4 10-10'} /></svg></span>)}
              </div>
              <div className="mt-7 flex items-center justify-between border-t border-panel-border pt-4 text-[11px] font-semibold text-panel-muted"><span>Apple Wallet · Google Wallet</span><span className="text-panel-orange">Un motivo para volver ↗</span></div>
            </div>
          </div>
        </section>
        <section aria-labelledby="auth-title" className="relative mx-auto w-full max-w-[440px] overflow-hidden rounded-3xl border border-panel-border bg-panel-surface/95 p-6 shadow-panel backdrop-blur-xl motion-safe:animate-[fw-panel-enter_400ms_ease-out] sm:p-9">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-orange opacity-70" />
          <span aria-hidden="true" className="mb-6 grid h-11 w-11 place-items-center rounded-2xl bg-panel-accent/10 text-panel-accent"><WalletIcon className="h-6 w-6" /></span>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-panel-muted">Tu espacio de trabajo</p>
          <h1 id="auth-title" className="text-3xl font-extrabold tracking-tight text-panel-text">{title}</h1>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-panel-muted">{description}</p>
          {children}
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 pb-6 text-[11px] text-panel-muted sm:px-10">
        <span>Fidelización que se siente cerca.</span>
        <Link to={ROUTES.home} className="font-semibold hover:text-panel-accent sm:hidden">Volver al inicio ↗</Link>
        <span className="hidden sm:block">Fidelity Wallet</span>
      </footer>
    </div>
  );
}
