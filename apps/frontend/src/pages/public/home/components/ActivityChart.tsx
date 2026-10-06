import { useActivityChart } from "../hooks/useActivityChart";
import type { ActivityChartProps } from "../types/homeComponent.types.ts";
import type { Metric } from "../types/activityChart.types.ts";
import { SERIES, DAYS } from "../constants/activityChart.constants.ts";
import { ActivityPlot } from "./ActivityPlot";

export function ActivityChart({
  motionPaused = false,
}: ActivityChartProps) {
  const { metric, setMetric, frame, setFrame, ref, stopped, data, values } = useActivityChart(motionPaused);

  return (
    <div
      className={`
        fw-report-demo mt-[25px] p-[19px] [border:1px_solid_var(--fw-border)] rounded-[15px]
        [background:color-mix(in_srgb,_var(--fw-bg)_74%,_transparent)] [box-shadow:0_14px_40px_#06152208]
        min-[701px]:max-[1050.001px]:p-[12px] max-[390.001px]:p-[13px]
      `}
      ref={ref}
    >
      <div className={`
        fw-report-header [&_>_span:last-child]:text-[6px] [&_>_span:last-child]:tracking-[0.1em]
        [&_>_span:last-child]:[color:var(--fw-muted)]
        [&_>_span:last-child]:[border:1px_solid_var(--fw-border)] [&_>_span:last-child]:rounded-[5px]
        [&_>_span:last-child]:p-[3px_6px] [&_>_span:last-child]:whitespace-nowrap flex justify-between
        items-center gap-[12px] text-[10px] font-bold min-[701px]:max-[1050.001px]:flex-wrap
        min-[701px]:max-[1050.001px]:gap-[6px] max-[390.001px]:flex-wrap max-[390.001px]:gap-[8px]
      `}>
        <span>Tu negocio, en perspectiva</span>
        <span>DATOS DE EJEMPLO</span>
      </div>
      <div className={`
        fw-report-metrics [&_strong]:block [&_strong]:text-[31px] [&_strong]:leading-[1.1]
        [&_strong]:font-[750] [&_strong]:tracking-[-0.05em] [&_strong]:tabular-nums
        [&_>_div_>_span]:[color:var(--fw-muted)] [&_>_div_>_span]:text-[8px] flex justify-between gap-[12px]
        mt-[19px] items-start min-[701px]:max-[1050.001px]:flex-wrap min-[701px]:max-[1050.001px]:gap-[9px]
        max-[390.001px]:gap-[7px]
      `}>
        <div>
          <strong>
            {data.total + (frame % 2 === 0 ? 0 : metric === "visits" ? 17 : 4)}
          </strong>
          <span>{data.unit}</span>
        </div>
        <div
          className={`
            fw-report-switch [&_button]:text-[8px] [&_button]:p-[5px_8px] [&_button]:[color:var(--fw-muted)]
            [&_button]:[border:none] [&_button]:rounded-[5px] [&_button]:[background:none]
            [&_button[aria-pressed=true]]:[color:var(--fw-blue)]
            [&_button[aria-pressed=true]]:[background:#087bd717] max-[390.001px]:[&_button]:p-[5px_6px] flex
            gap-[3px] p-[3px] [border:1px_solid_var(--fw-border)] rounded-[7px]
          `}
          role="group"
          aria-label="Métrica del gráfico de ejemplo"
        >
          {(Object.keys(SERIES) as Metric[]).map((key) => (
            <button
              key={key}
              aria-pressed={metric === key}
              onClick={() => {
                setMetric(key);
                setFrame(0);
              }}
            >
              {SERIES[key].label}
            </button>
          ))}
        </div>
      </div>
      <ActivityPlot values={values} label={data.label} stopped={stopped} />
      <div
        className="fw-report-days flex justify-between px-[4px] text-[color:var(--fw-muted)] text-[8px]"
        aria-hidden="true"
      >
        {DAYS.map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div className={`
        fw-report-bottom flex items-center gap-[6px] mt-[15px] [border-top:1px_solid_var(--fw-border)]
        pt-[11px] text-[8px] text-[color:var(--fw-muted)]
      `}>
        <span className="fw-report-dot w-[5px] h-[5px] rounded-full [background:#d69e09]" />
        Visitas que se convierten en información útil.
      </div>
    </div>
  );
}
