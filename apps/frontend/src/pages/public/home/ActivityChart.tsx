import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
  const gradientId = useId().replace(/:/g, "");
  const reducedMotion = useReducedMotion();
  const stopped = motionPaused || !!reducedMotion;
  const data = SERIES[metric];
  const values = frame % 2 === 0 ? data.points : data.next;
  const points = values.map(
    (value, index) => [14 + index * 43, 110 - value] as const,
  );
  const line = points
    .map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`)
    .join(" ");

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
    <div className="fw-report-demo" ref={ref}>
      <div className="fw-report-header">
        <span>Tu negocio, en perspectiva</span>
        <span>DATOS DE EJEMPLO</span>
      </div>
      <div className="fw-report-metrics">
        <div>
          <strong>
            {data.total + (frame % 2 === 0 ? 0 : metric === "visits" ? 17 : 4)}
          </strong>
          <span>{data.unit}</span>
        </div>
        <div
          className="fw-report-switch"
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
      <svg
        className="fw-report-chart"
        viewBox="0 0 286 128"
        role="img"
        aria-label={`${data.label} de ejemplo de lunes a domingo`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 65, 100].map((y) => (
          <line
            key={y}
            x1="10"
            x2="277"
            y1={y}
            y2={y}
            className="fw-report-grid"
          />
        ))}
        <motion.path
          d={`${line} L 272 118 L 14 118 Z`}
          animate={{ d: `${line} L 272 118 L 14 118 Z` }}
          initial={false}
          transition={{ duration: stopped ? 0 : 1.35, ease: "easeInOut" }}
          fill={`url(#${gradientId})`}
        />
        <motion.path
          d={line}
          animate={{ d: line }}
          initial={false}
          transition={{ duration: stopped ? 0 : 1.35, ease: "easeInOut" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            animate={{ cy: y }}
            initial={false}
            transition={{ duration: stopped ? 0 : 1.35, ease: "easeInOut" }}
            r={i === 6 ? 4 : 2}
            fill="currentColor"
          />
        ))}
      </svg>
      <div className="fw-report-days" aria-hidden="true">
        {DAYS.map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div className="fw-report-bottom">
        <span className="fw-report-dot" />
        Visitas que se convierten en información útil.
      </div>
    </div>
  );
}
