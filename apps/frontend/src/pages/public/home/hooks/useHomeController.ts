import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "../../../../hooks/useTheme";
import { useHomeIntro } from "./useHomeIntro";
import { useHomeMenu } from "./useHomeMenu";
import { useHomeSceneObservers } from "./useHomeSceneObservers";
import { usePageVisibility } from "./usePageVisibility";

export function useHomeController() {
  const theme = useTheme();
  const intro = useHomeIntro();
  const menu = useHomeMenu();
  const [motionPaused, setMotionPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisibility();
  const homeRef = useRef<HTMLDivElement>(null);
  const motionStopped = motionPaused || !!reducedMotion || !pageVisible;
  useHomeSceneObservers(homeRef, !!reducedMotion);
  useEffect(() => {
    const root = document.documentElement;
    const classes = ["scroll-smooth", "motion-reduce:scroll-auto"];
    const added = classes.filter((name) => !root.classList.contains(name));
    root.classList.add(...added);
    return () => root.classList.remove(...added);
  }, []);
  return { ...theme, ...intro, ...menu, motionPaused, setMotionPaused, reducedMotion, motionStopped, homeRef };
}
