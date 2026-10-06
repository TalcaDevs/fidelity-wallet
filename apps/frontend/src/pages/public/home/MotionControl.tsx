import { HomeIcon as Icon } from "./HomeIcon";
export function MotionControl({
  motionPaused,
  reducedMotion,
  onToggle,
}: {
  motionPaused: boolean;
  reducedMotion: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="fw-motion-control fixed bottom-[18px] left-[18px] z-[28] flex items-center justify-center gap-[9px] w-[38px] h-[38px] p-0 [border:1px_solid_var(--fw-border)] text-[color:var(--fw-muted)] rounded-full"
      onClick={onToggle}
      aria-label={motionPaused ? "Reanudar animaciones" : "Pausar animaciones"}
      aria-pressed={motionPaused}
      title={
        reducedMotion
          ? "Movimiento reducido según tu preferencia del sistema"
          : undefined
      }
    >
      <Icon name={motionPaused || reducedMotion ? "play" : "pause"} />
      <span>{motionPaused ? "Reanudar movimiento" : "Pausar movimiento"}</span>
    </button>
  );
}
