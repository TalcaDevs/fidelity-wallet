import type { BranchSelectionProps } from "../types/branch.types";
import { BRANCHES } from "../constants/locations.constants";
export function BranchSelector({
  branchIndex,
  onSelect,
}: BranchSelectionProps) {
  return (
    <div
      className={`
        fw-branch-selector grid [grid-template-columns:repeat(3,_1fr)] gap-[8px] max-[480.001px]:gap-[6px]
      `}
      role="group"
      aria-label="Explora las sucursales de ejemplo"
    >
      {BRANCHES.map((item, index) => (
        <button
          className={`
        aria-pressed:[color:var(--fw-blue)]
        aria-pressed:[border-color:color-mix(in_srgb,_var(--fw-blue)_30%,_transparent)]
        aria-pressed:[background:color-mix(in_srgb,_var(--fw-blue)_9%,_transparent)]
        hover:[border-color:var(--fw-blue)] flex justify-center items-center gap-[7px] p-[9px_6px]
        min-h-[40px] [border:1px_solid_var(--fw-border)] [color:var(--fw-muted)] rounded-[10px]
        text-[10px] font-[750] [background:transparent]
        [transition:background_0.2s_ease,_border-color_0.2s_ease,_color_0.2s_ease]
        max-[480.001px]:text-[9px] max-[480.001px]:gap-[4px] max-[480.001px]:[padding-inline:4px]
      `}
          key={item.name}
          type="button"
          aria-pressed={branchIndex === index}
          aria-controls="fw-branch-detail"
          onClick={() => onSelect(index)}
        >
          <span className="text-[8px] [opacity:0.6]">{item.number}</span>{" "}
          {item.name}
        </button>
      ))}
    </div>
  );
}
