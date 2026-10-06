import { useEffect, useId, useRef } from "react";
import { animatePlot } from "./activityPlotMotion";
import PlotAsset from "../../../assets/home/activity-plot.svg?react";

type PlotProps = {
  values: readonly number[];
  label: string;
  stopped: boolean;
};

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
      className="fw-report-chart mt-[15px] h-[128px] w-full overflow-visible text-[color:var(--fw-blue)]"
      aria-label={`${label} de ejemplo de lunes a domingo`}
    />
  );
}
