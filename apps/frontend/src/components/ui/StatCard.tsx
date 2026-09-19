import type { ReactNode } from 'react';

type StatCardColor = 'blue' | 'yellow' | 'orange';

const COLOR_STYLES: Record<StatCardColor, { glow: string; iconBg: string; iconText: string }> = {
  blue: {
    glow: 'bg-brand-blue/10 dark:bg-brand-blue/20',
    iconBg: 'bg-brand-blue/10 dark:bg-brand-blue/20',
    iconText: 'text-brand-blue dark:text-blue-400',
  },
  yellow: {
    glow: 'bg-brand-yellow/10 dark:bg-brand-yellow/20',
    iconBg: 'bg-brand-yellow/10 dark:bg-brand-yellow/20',
    iconText: 'text-brand-yellow',
  },
  orange: {
    glow: 'bg-brand-orange/10 dark:bg-brand-orange/20',
    iconBg: 'bg-brand-orange/10 dark:bg-brand-orange/20',
    iconText: 'text-brand-orange',
  },
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
    <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
      <div className={`absolute -right-6 -top-6 w-40 h-40 ${styles.glow} rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700`} />
      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className={`w-16 h-16 rounded-2xl ${styles.iconBg} flex items-center justify-center ${styles.iconText} shadow-inner`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">{title}</h3>
      </div>
      {loading ? (
        <div className="h-[60px] flex items-center relative z-10">
          <div className="h-10 w-24 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
        </div>
      ) : (
        <p className="text-6xl font-black mb-3 relative z-10 tracking-tight text-slate-900 dark:text-white">{value}</p>
      )}
      {footnoteTone === 'positive' ? (
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center relative z-10 bg-emerald-50 dark:bg-emerald-500/10 inline-flex px-3 py-1 rounded-full">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
          {footnote}
        </p>
      ) : (
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center relative z-10 bg-slate-100 dark:bg-slate-700 inline-flex px-3 py-1 rounded-full">
          {footnote}
        </p>
      )}
    </div>
  );
}
