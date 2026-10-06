import { WALLET_THEME } from '../ui/walletTheme';

export const PANEL_ROOT = `${WALLET_THEME} fw-admin
  [&_:where(button,a,input,select,textarea)]:duration-200
  [&_:where(button,a,input,select,textarea):focus-visible]:outline-2
  [&_:where(button,a,input,select,textarea):focus-visible]:outline-panel-accent
  [&_:where(button,a,input,select,textarea):focus-visible]:outline-offset-4
  [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed
  [&_[role=dialog]]:bg-panel-surface [&_[role=dialog]]:border-panel-border
  [&_[role=dialog]_h2]:text-panel-text
  motion-safe:[&_[role=dialog]]:animate-[fw-panel-enter_240ms_ease-out]
  [&_[role=dialog]>p]:text-panel-muted
  [&_[role=dialog]_:where(input,select,textarea)]:bg-panel-soft
  [&_[role=dialog]_:where(input,select,textarea)]:text-panel-text
  [&_[role=dialog]_:where(input,select,textarea)]:border-panel-border
  data-[motion-reduced=true]:[&_*]:animate-none!
  data-[motion-reduced=true]:[&_*]:transition-none!
  data-[motion-reduced=true]:[&_*]:scroll-auto!
  data-[motion-reduced=true]:[&_*::before]:animate-none!
  data-[motion-reduced=true]:[&_*::after]:animate-none!
  data-[motion-reduced=true]:[&_[role=dialog]]:animate-none!
`;

export const PANEL_PAGE = 'fw-panel-section-entry';
export const PANEL_HEADING = 'text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text';
export const PANEL_SURFACE = 'bg-panel-surface rounded-2xl border border-panel-border shadow-panel';
