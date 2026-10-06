import type { HeadingProps } from "../types/sectionHeading.types.ts";

export function SectionHeading({
  id,
  label,
  title,
  children,
  reveal = false,
  className = "",
}: HeadingProps) {
  return (
    <div
      className={`
        fw-section-heading mb-[44px] flex items-end justify-between gap-[32px] max-[700.001px]:block
        max-[700.001px]:mb-[32px]
      ${className}

      `}
      data-reveal={reveal || undefined}
    >
      <div>
        <span
          className={`
        fw-section-label mb-[17px] block text-[9px] font-extrabold tracking-[0.16em]
        text-[color:var(--fw-blue)] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
      `}
        >
          {label}
        </span>
        <h2
          id={id}
          className="text-[clamp(32px,_3.2vw,_46px)] leading-[1.16] font-[750] tracking-[-0.05em] max-[700.001px]:text-[35px]"
        >
          {title}
        </h2>
      </div>
      <p
        className={`
        [color:var(--fw-muted)] text-[14px] leading-[1.85] pb-[5px] max-[700.001px]:mt-[20px]
        max-[700.001px]:text-[12px]
      `}
      >
        {children}
      </p>
    </div>
  );
}
