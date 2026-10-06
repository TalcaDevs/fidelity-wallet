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
        fw-section-heading [&_>_p]:[color:var(--fw-muted)] [&_>_p]:text-[14px] [&_>_p]:leading-[1.85]
        [&_>_p]:pb-[5px] max-[700.001px]:[&_>_p]:mt-[20px] max-[700.001px]:[&_>_p]:text-[12px] mb-[44px]
        flex items-end justify-between gap-[32px] max-[700.001px]:block max-[700.001px]:mb-[32px]
      ${className}`}
      data-reveal={reveal || undefined}
    >
      <div>
        <span className={`
          fw-section-label mb-[17px] block text-[9px] font-extrabold tracking-[0.16em]
          text-[color:var(--fw-blue)] max-[700.001px]:text-[8px] max-[700.001px]:mb-[14px]
        `}>
          {label}
        </span>
        <h2 id={id}>{title}</h2>
      </div>
      <p>{children}</p>
    </div>
  );
}
