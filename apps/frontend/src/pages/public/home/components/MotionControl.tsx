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
        fw-motion-control [&_>_.fw-icon]:w-[14px] [&_>_.fw-icon]:h-[14px]
        [&:is(:hover,_:focus-visible)_>_span]:opacity-100 fixed bottom-[18px] left-[18px] z-[28] flex
        items-center justify-center gap-[9px] w-[38px] h-[38px] p-0 [border:1px_solid_var(--fw-border)]
        text-[color:var(--fw-muted)] rounded-full
        [background:color-mix(in_srgb,_var(--fw-bg)_92%,_transparent)] [box-shadow:0_3px_16px_#05142112]
        [backdrop-filter:blur(12px)] max-[700.001px]:left-[11px] max-[700.001px]:bottom-[11px]
        max-[700.001px]:w-[34px] max-[700.001px]:h-[34px]
      `}
      onClick={onToggle}
      aria-label={
        motionPaused || reducedMotion
          ? "Reanudar animaciones"
          : "Pausar animaciones"
      }
      aria-pressed={motionPaused || reducedMotion}
      title={
        reducedMotion
          ? "Movimiento reducido según tu preferencia del sistema"
          : undefined
      }
    >
      <Icon name={motionPaused || reducedMotion ? "play" : "pause"} />
      <span
        className={`
        absolute left-[47px] whitespace-nowrap p-[5px_10px] [color:var(--fw-text)]
        [border:1px_solid_var(--fw-border)] rounded-[6px] text-[10px] opacity-0 pointer-events-none
        [background:var(--fw-bg)] [transition:opacity_0.2s]
      `}
      >
        {reducedMotion
          ? "Activar movimiento"
          : motionPaused
            ? "Reanudar movimiento"
            : "Pausar movimiento"}
      </span>
    </button>
  );
}
