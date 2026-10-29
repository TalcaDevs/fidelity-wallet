import { StatCard, formatChange } from '../../../../components/ui/StatCard';

export { formatChange };

export interface KpiCardProps {
  title: string;
  current: number;
  previous: number;
  changePercentage: number | null;
  suffix?: string;
  tooltip?: string;
}

export function KpiCard({
  title,
  current,
  previous,
  changePercentage,
  suffix = '',
  tooltip,
}: KpiCardProps) {
  return (
    <StatCard
      title={title}
      value={current}
      suffix={suffix}
      previousValue={previous}
      changePercentage={changePercentage}
      tooltip={tooltip}
      className="motion-safe:animate-[fw-panel-enter_300ms_ease-out]"
    />
  );
}
