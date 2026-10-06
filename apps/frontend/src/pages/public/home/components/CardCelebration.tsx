import { PARTICLES } from "../constants/loyaltyCardVisuals.constants";
import type { CardProps } from "../types/loyaltyCardVisuals.types";
export function CardCelebration({
  burst,
  motionAllowed,
}: Pick<CardProps, "burst" | "motionAllowed">) {
  if (!motionAllowed || burst?.stamp !== 10) return null;
  return (
    <div
      className="fw-card-celebration absolute inset-0 z-[4] overflow-hidden pointer-events-none"
      key={burst.id}
      aria-hidden="true"
    >
      <span
        className={`
        fw-card-celebration-halo absolute left-[calc(50%_-_90px)] top-[calc(52%_-_90px)] w-[180px]
        h-[180px] [border:2px_solid_rgb(214_158_9_/_55%)] rounded-full
        [animation:fw-card-reward-halo_1100ms_ease-out_both]
        group-data-[reduced-motion=true]/home:[animation:none]
      `}
      />
      {PARTICLES.map((style, index) => (
        <span
          className={`
        fw-card-particle [&:nth-child(3n)]:w-[7px] [&:nth-child(3n)]:h-[7px]
        [&:nth-child(3n)]:rounded-full [&:nth-child(3n)]:[background:#d66409]
        [&:nth-child(3n_+_1)]:w-[4px] [&:nth-child(3n_+_1)]:h-[9px]
        [&:nth-child(3n_+_1)]:[background:#087bd7] absolute left-[50%] top-[52%] w-[6px] h-[11px]
        rounded-[2px] [background:#d69e09]
        [animation:fw-card-reward-particle_1350ms_cubic-bezier(0.12,_0.7,_0.32,_1)_var(--fw-particle-delay)_both]
        group-data-[reduced-motion=true]/home:[animation:none]
      `}
          key={index}
          style={style}
        />
      ))}
    </div>
  );
}
