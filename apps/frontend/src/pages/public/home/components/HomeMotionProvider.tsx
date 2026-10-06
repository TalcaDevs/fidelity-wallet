import type { HomeMotionProviderProps } from "../types/homeComponent.types";
import { useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { HomeMotionPreferenceContext } from "../context/homeMotionPreference.context";
export function HomeMotionProvider({ children }: HomeMotionProviderProps) {
  const systemReducedMotion = useReducedMotion();
  const [allowMotion, setAllowMotion] = useState(false);
  const preference = useMemo(
    () => ({
      reducedMotion: Boolean(systemReducedMotion) && !allowMotion,
      enableMotion: () => setAllowMotion(true),
    }),
    [systemReducedMotion, allowMotion],
  );
  return (
    <HomeMotionPreferenceContext value={preference}>
      {children}
    </HomeMotionPreferenceContext>
  );
}
