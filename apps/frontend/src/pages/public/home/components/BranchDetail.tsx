import type { BranchDetailProps } from "../types/branch.types";
import LocationIcon from "../../../../assets/home/location.svg?react";
export function BranchDetail({ branch }: BranchDetailProps) {
  return (
    <div
      className={`
        fw-branch-detail flex items-center gap-[12px] mt-[22px] min-h-[40px] max-[480.001px]:gap-[9px]
        max-[480.001px]:mt-[16px] [@media((max-height:_740px)_and_(min-width:_821px))]:mt-[12px]
      `}
      id="fw-branch-detail"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className={`
        fw-branch-detail-icon [&_svg]:w-[18px] [&_svg]:h-[18px] grid [flex:0_0_35px] h-[35px]
        place-items-center rounded-[10px] text-[#b88100] [background:#d69e0915]
        max-[480.001px]:[flex-basis:29px] max-[480.001px]:h-[32px]
      `}
      >
        <LocationIcon aria-hidden="true" />
      </span>
      <div className="min-w-[0]">
        <strong className="block text-[11px] leading-[1.7] font-[800] max-[480.001px]:text-[10px]">
          Café Esquina · {branch.name}
        </strong>
        <span className="block [color:var(--fw-muted)] text-[9px] leading-[1.7] max-[480.001px]:text-[8px]">
          {branch.address} · Dirección de ejemplo
        </span>
      </div>
      <span
        className="fw-branch-detail-arrow ml-[auto] text-[22px] text-[color:var(--fw-muted)] max-[480.001px]:hidden"
        aria-hidden="true"
      >
        ↗
      </span>
    </div>
  );
}
