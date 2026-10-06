import type { DemoState } from "../types/loyaltyCardControls.types.ts";
import type { COPY } from "../constants/loyaltyCardControls.constants.ts";
export function getDemoPhase({
  mode,
  complete,
  ready,
  autoRunning,
}: DemoState): keyof typeof COPY {
  if (mode === "manual") return complete ? "manualComplete" : "manual";
  if (complete) return "autoComplete";
  if (!ready) return "intro";
  return autoRunning ? "playing" : "paused";
}

export function getButton({ mode, complete }: DemoState) {
  if (mode === "auto") return { text: "Probar yo", symbol: "↗" };
  if (complete) return { text: "Volver a probar", symbol: "↻" };
  return { text: "Sumar un sello", symbol: "+" };
}

export function getAnnouncement({ mode, complete, autoRunning, stamps }: DemoState) {
  if (complete) {
    const next =
      mode === "auto"
        ? "Elige Probar yo para sumar tus propios sellos."
        : "Puedes volver a probar.";
    return "10 de 10 sellos. ¡Recompensa desbloqueada! " + next;
  }
  const automatic = autoRunning
    ? "Demostración automática en curso."
    : "Demostración automática en pausa.";
  const prefix = mode === "manual" ? "Demostración manual." : automatic;
  return (
    prefix +
    " " +
    stamps +
    " de 10 sellos. Faltan " +
    (10 - stamps) +
    " para tu recompensa."
  );
}
