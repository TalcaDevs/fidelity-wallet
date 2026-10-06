import { useEffect } from "react";
import type { HomeRootRef } from "../types/homeMotion.types.ts";
import { SCENE_SELECTOR, REVEAL_SELECTOR, SCENE_OBSERVER_OPTIONS, REVEAL_OBSERVER_OPTIONS } from "../constants/homeMotion.constants.ts";

export function useHomeSceneObservers(homeRef: HomeRootRef, reducedMotion: boolean) {
  useEffect(() => {
    const root = homeRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("fw-scene-visible", entry.isIntersecting));
    }, SCENE_OBSERVER_OPTIONS);
    root.querySelectorAll(SCENE_SELECTOR).forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, [homeRef]);

  useEffect(() => {
    const root = homeRef.current;
    if (!root || reducedMotion || typeof IntersectionObserver === "undefined") return;
    const nodes = root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        entry.target.classList.add("fw-visible");
        observer.unobserve(entry.target);
      });
    }, REVEAL_OBSERVER_OPTIONS);
    nodes.forEach((node) => { node.classList.add("fw-reveal"); observer.observe(node); });
    return () => {
      observer.disconnect();
      nodes.forEach((node) => node.classList.remove("fw-reveal", "fw-visible"));
    };
  }, [homeRef, reducedMotion]);
}
