import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "../../../hooks/useTheme";
export function useHomeController() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [introReady, setIntroReady] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const reducedMotion = useReducedMotion();
  const motionStopped = motionPaused || !!reducedMotion || pageHidden;
  const homeRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const onCardReady = useCallback(() => setIntroReady(true), []);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const scenes = homeRef.current?.querySelectorAll("[data-motion-scene]");
    if (!scenes || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.target.classList.toggle(
            "fw-scene-visible",
            entry.isIntersecting,
          ),
        );
      },
      { rootMargin: "80px" },
    );
    scenes.forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nodes =
      homeRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (
      !nodes ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fw-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    nodes.forEach((node) => {
      node.classList.add("fw-reveal");
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Keep copy available if the browser interrupts the entrance animation.
    const timeout = window.setTimeout(onCardReady, 3200);
    return () => window.clearTimeout(timeout);
  }, [onCardReady, replayKey]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const replay = () => {
    setIntroReady(false);
    setReplayKey((key) => key + 1);
  };

  return {
    isDarkMode,
    toggleDarkMode,
    introReady,
    replayKey,
    menuOpen,
    setMenuOpen,
    motionPaused,
    setMotionPaused,
    reducedMotion,
    motionStopped,
    homeRef,
    menuToggleRef,
    onCardReady,
    replay,
  };
}
