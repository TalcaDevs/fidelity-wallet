import type { PlotProps } from "../types/activityPlot.types.ts";
import { useEffect, useId, useRef } from "react";
import { animatePlot } from "../models/activityPlotMotion";
import PlotAsset from "../../../../assets/home/activity-plot.svg?react";

export function ActivityPlot({ values, label, stopped }: PlotProps) {
  const ref = useRef<SVGSVGElement>(null);
  const initialized = useRef(false);
  const gradientId = useId();

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    svg.querySelector("linearGradient")?.setAttribute("id", gradientId);
    const area = svg.querySelector<SVGPathElement>("[data-chart-area]");
    area?.setAttribute("fill", `url(#${gradientId})`);
    const duration = stopped || !initialized.current ? 0 : 1.35;
    initialized.current = true;
    return animatePlot(svg, values, duration);
  }, [values, stopped, gradientId]);

  return (
    <PlotAsset
      ref={ref}
      className={`
        fw-report-chart [&_.fw-report-grid]:[stroke:var(--fw-border)]
        [&_.fw-report-grid]:[stroke-width:0.7px] [&_.fw-report-grid]:[stroke-dasharray:3_4] mt-[15px]
        h-[128px] w-full overflow-visible text-[color:var(--fw-blue)]
        min-[701px]:max-[1050.001px]:h-[110px]
      `}
      aria-label={`${label} de ejemplo de lunes a domingo`}
    />
  );
}
