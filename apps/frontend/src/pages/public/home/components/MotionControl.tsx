import type { MotionControlProps } from "../types/homeComponent.types.ts";
import { HomeIcon as Icon } from "./HomeIcon";
export function MotionControl({
  motionPaused,
  reducedMotion,
  onToggle,
}: MotionControlProps) {
  return (
    <button
      className={`
        fw-motion-control [&_>_.fw-icon]:w-[14px] [&_>_.fw-icon]:h-[14px] [&_>_span]:absolute
        [&_>_span]:left-[47px] [&_>_span]:whitespace-nowrap [&_>_span]:p-[5px_10px]
        [&_>_span]:[color:var(--fw-text)] [&_>_span]:[border:1px_solid_var(--fw-border)]
        [&_>_span]:rounded-[6px] [&_>_span]:text-[10px] [&_>_span]:opacity-0 [&_>_span]:pointer-events-none
        [&_>_span]:[background:var(--fw-bg)] [&_>_span]:[transition:opacity_0.2s]
        [&:is(:hover,_:focus-visible)_>_span]:opacity-100 fixed bottom-[18px] left-[18px] z-[28] flex
        items-center justify-center gap-[9px] w-[38px] h-[38px] p-0 [border:1px_solid_var(--fw-border)]
        text-[color:var(--fw-muted)] rounded-full
        [background:color-mix(in_srgb,_var(--fw-bg)_92%,_transparent)] [box-shadow:0_3px_16px_#05142112]
        [backdrop-filter:blur(12px)] max-[700.001px]:left-[11px] max-[700.001px]:bottom-[11px]
        max-[700.001px]:w-[34px] max-[700.001px]:h-[34px] motion-reduce:hidden
      `}
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
