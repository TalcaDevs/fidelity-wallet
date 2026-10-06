import { useHomeMotionPreference } from "./useHomeMotionPreference";
import { useEffect, useRef, useState } from "react";
import { usePageVisibility } from "./usePageVisibility";
import {
  SERIES,
  CHART_UPDATE_INTERVAL_MS,
  CHART_VISIBILITY_THRESHOLD,
} from "../constants/activityChart.constants.ts";
import type { Metric } from "../types/activityChart.types.ts";

export function useActivityChart(motionPaused: boolean) {
  const [metric, setMetric] = useState<Metric>("visits");
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(false);
  const pageVisible = usePageVisibility();
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useHomeMotionPreference();
  const stopped = motionPaused || !!reducedMotion;
  const data = SERIES[metric];
  const values = frame % 2 === 0 ? data.points : data.next;

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: CHART_VISIBILITY_THRESHOLD },
    );
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (stopped || !visible || !pageVisible) return;
    const timer = window.setInterval(
      () => setFrame((value) => value + 1),
      CHART_UPDATE_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [stopped, visible, pageVisible]);

  return { metric, setMetric, frame, setFrame, ref, stopped, data, values };
}
