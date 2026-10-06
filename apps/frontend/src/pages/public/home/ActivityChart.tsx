import { ActivityPlot } from "./ActivityPlot";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import "./ActivityChart.css";

const SERIES = {
  visits: {
    label: "Visitas",
    unit: "visitas esta semana",
    points: [24, 38, 30, 52, 44, 73, 86],
    next: [34, 43, 55, 46, 65, 80, 92],
    total: 347,
  },
  rewards: {
    label: "Canjes",
    unit: "recompensas entregadas",
    points: [8, 16, 12, 30, 23, 36, 44],
    next: [14, 12, 22, 27, 34, 30, 51],
    total: 38,
  },
} as const;
type Metric = keyof typeof SERIES;
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function ActivityChart({
  motionPaused = false,
}: {
  motionPaused?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("visits");
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const stopped = motionPaused || !!reducedMotion;
  const data = SERIES[metric];
  const values = frame % 2 === 0 ? data.points : data.next;

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return () =>
        document.removeEventListener("visibilitychange", onVisibility);
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (stopped || !visible || !pageVisible) return;
    const timer = window.setInterval(
      () => setFrame((value) => value + 1),
      3400,
    );
    return () => window.clearInterval(timer);
  }, [stopped, visible, pageVisible]);

  return (
    <div
      className="fw-report-demo mt-[25px] p-[19px] [border:1px_solid_var(--fw-border)] rounded-[15px]"
      ref={ref}
    >
      <div className="fw-report-header flex justify-between items-center gap-[12px] text-[10px] font-bold">
        <span>Tu negocio, en perspectiva</span>
        <span>DATOS DE EJEMPLO</span>
      </div>
      <div className="fw-report-metrics flex justify-between gap-[12px] mt-[19px] items-start">
        <div>
          <strong>
            {data.total + (frame % 2 === 0 ? 0 : metric === "visits" ? 17 : 4)}
          </strong>
          <span>{data.unit}</span>
        </div>
        <div
          className="fw-report-switch flex gap-[3px] p-[3px] [border:1px_solid_var(--fw-border)] rounded-[7px]"
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
      <div className="fw-report-bottom flex items-center gap-[6px] mt-[15px] [border-top:1px_solid_var(--fw-border)] pt-[11px] text-[8px] text-[color:var(--fw-muted)]">
        <span className="fw-report-dot w-[5px] h-[5px] rounded-full" />
        Visitas que se convierten en información útil.
      </div>
    </div>
  );
}
