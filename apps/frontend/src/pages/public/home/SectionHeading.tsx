import type { ReactNode } from "react";

type HeadingProps = {
  id: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
  reveal?: boolean;
  className?: string;
};

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
      className={`fw-section-heading mb-[44px] flex items-end justify-between gap-[32px] ${className}`}
      data-reveal={reveal || undefined}
    >
      <div>
        <span className="fw-section-label mb-[17px] block text-[9px] font-extrabold tracking-[0.16em] text-[color:var(--fw-blue)]">
          {label}
        </span>
        <h2 id={id}>{title}</h2>
      </div>
      <p>{children}</p>
    </div>
  );
}
