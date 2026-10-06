import type { ReactNode } from 'react';
import { PANEL_SURFACE } from '../admin/panelStyles';

type StatCardColor = 'blue' | 'yellow' | 'orange';

const COLOR_STYLES: Record<StatCardColor, { glow: string; iconBg: string; iconText: string }> = {
  blue: {
    glow: 'bg-panel-accent/10',
    iconBg: 'bg-panel-accent/10',
    iconText: 'text-panel-accent',
  },
  yellow: {
    glow: 'bg-panel-gold/10',
    iconBg: 'bg-panel-gold/10',
    iconText: 'text-panel-gold',
  },
  orange: {
    glow: 'bg-panel-orange/10',
    iconBg: 'bg-panel-orange/10',
    iconText: 'text-panel-orange',
  },
};

const FOOTNOTE_STYLES: Record<'positive' | 'neutral', string> = {
  positive: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  neutral: 'text-panel-muted bg-panel-soft',
};

export function StatCard({
  title,
  value,
  icon,
  color,
  footnote,
  footnoteTone = 'positive',
  loading = false,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color: StatCardColor;
  footnote: string;
  footnoteTone?: 'positive' | 'neutral';
  loading?: boolean;
}) {
  const styles = COLOR_STYLES[color];

  return (
    <div className={`${PANEL_SURFACE} relative overflow-hidden p-5 sm:p-6 group`}>
      <div className={`absolute -right-10 -top-10 w-32 h-32 ${styles.glow} rounded-full blur-3xl `} />
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className={`w-11 h-11 shrink-0 rounded-xl [&>svg]:h-6 [&>svg]:w-6 ${styles.iconBg} flex items-center justify-center ${styles.iconText}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-panel-muted">{title}</h3>
      </div>
      {loading ? (
        <div className="h-[60px] flex items-center relative z-10">
          <div data-testid="stat-skeleton" className="h-10 w-24 rounded-xl bg-panel-soft animate-pulse" />
        </div>
      ) : (
        <p className="text-4xl sm:text-5xl font-extrabold mb-4 relative z-10 tracking-tight tabular-nums text-panel-text">{value.toLocaleString('es-CL')}</p>
      )}
      <p className={`text-sm font-semibold relative z-10 inline-flex items-center px-3 py-1 rounded-full ${FOOTNOTE_STYLES[footnoteTone]}`}>
        {footnoteTone === 'positive' && (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
        )}
        {footnote}
      </p>
    </div>
  );
}
