import { useContext } from "react";
import { useReducedMotion } from "motion/react";
import { HomeMotionPreferenceContext } from "../context/homeMotionPreference.context";
export function useHomeMotionPreference() {
  const preference = useContext(HomeMotionPreferenceContext);
  const systemReducedMotion = useReducedMotion();
  return {
    reducedMotion: preference?.reducedMotion ?? Boolean(systemReducedMotion),
    enableMotion: preference?.enableMotion,
  };
}
