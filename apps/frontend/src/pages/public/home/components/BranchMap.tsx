import type { BranchSelectionProps } from "../types/branch.types";
import { BRANCHES } from "../constants/locations.constants";
import LocationIcon from "../../../../assets/home/location.svg?react";
import LocationsMap from "../../../../assets/home/locations-map.svg?react";
export function BranchMap({ branchIndex, onSelect }: BranchSelectionProps) {
  return (
    <div
      className={`
        fw-location-map-scene relative [aspect-ratio:720_/_500] w-full
        [border-block:1px_solid_var(--fw-border)] overflow-hidden [background:var(--fw-soft)]
      `}
    >
      <LocationsMap
        className={`
        fw-location-map-art [&_.fw-map-land]:[fill:#edf1f3] [&_.fw-map-blocks]:[fill:#dce4e9]
        [&_.fw-map-blocks]:[stroke:#d1dce4] [&_.fw-map-blocks]:[stroke-width:1]
        [&_.fw-map-streets]:[stroke:#f9fbfc] [&_.fw-map-park]:[fill:#d7e5d7]
        [&_.fw-map-trees]:[fill:#a9c7b1] [&_.fw-map-street-label]:[fill:#79909e]
        [&_.fw-map-route-base]:[stroke:#087bd7] [&_.fw-map-route-flow]:[stroke:#087bd7]
        [&_.fw-map-route-flow]:[animation:fw-map-travel_16s_linear_infinite]
        [&_.fw-map-river-line]:[animation:fw-map-travel_32s_linear_infinite]
        dark:[&_.fw-map-land]:[fill:#142736] dark:[&_.fw-map-blocks]:[fill:#1c3546]
        dark:[&_.fw-map-blocks]:[stroke:#254354] dark:[&_.fw-map-streets]:[stroke:#0d1d29]
        dark:[&_.fw-map-park]:[fill:#29483f] dark:[&_.fw-map-trees]:[fill:#3c6552]
        dark:[&_.fw-map-route-flow]:[stroke:#54b0f2] dark:[&_.fw-map-route-base]:[stroke:#54b0f2]
        dark:[&_.fw-map-street-label]:[fill:#6b92a7] block w-full h-full
      `}
      />
      {BRANCHES.map((item, index) => (
        <button
          key={item.name}
          type="button"
          className={`
        fw-map-pin [&:hover_.fw-map-pin-head]:[transform:translateY(-5px)] [&.is-selected]:z-[3]
        [&.is-selected_.fw-map-pin-head]:[color:white]
        [&.is-selected_.fw-map-pin-head]:[border-color:#ffffff70]
        [&.is-selected_.fw-map-pin-head]:[background:#087bd7]
        [&.is-selected_.fw-map-pin-head]:[transform:translateY(-4px)]
        [&.is-selected_.fw-map-pin-head]:[box-shadow:0_8px_22px_#087bd742]
        [&.is-selected_.fw-map-pin-ripple]:[animation:fw-map-pulse_3.5s_ease-out_infinite] absolute
        w-[56px] h-[72px] p-0 [border:0] flex flex-col items-center justify-center z-[2] text-[#087bd7]
        [transform:translate(-50%,_-62%)] [background:none] max-[480.001px]:w-[48px]
        max-[480.001px]:h-[62px]
      ${branchIndex === index ? " is-selected" : ""}

      `}
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          aria-label={`Ver sucursal ${item.name} en el mapa`}
          aria-pressed={branchIndex === index}
          aria-controls="fw-branch-detail"
          onClick={() => onSelect(index)}
        >
          <span
            className={`
        fw-map-pin-ripple absolute w-[40px] h-[15px] left-[8px] top-[49px] [border:1px_solid_#087bd7]
        rounded-full opacity-0 z-[-1] dark:[border-color:#54b0f2] max-[480.001px]:left-[4px]
        max-[480.001px]:top-[42px]
      `}
            aria-hidden="true"
          />
          <span
            className={`
        fw-map-pin-head [&_svg]:w-[23px] [&_svg]:h-[23px] max-[480.001px]:[&_svg]:w-[20px]
        max-[480.001px]:[&_svg]:h-[20px] grid place-items-center w-[43px] h-[43px]
        [border:1px_solid_#087bd724] rounded-[14px] [background:#fff] [box-shadow:0_8px_20px_#2f455727]
        [transition:transform_0.35s_cubic-bezier(0.22,_0.68,_0,_1.4),_background_0.2s,_color_0.2s]
        dark:[color:#81c5f5] dark:[border-color:#558bb440] dark:[background:#203b50]
        max-[480.001px]:w-[34px] max-[480.001px]:h-[34px] max-[480.001px]:rounded-[11px]
      `}
          >
            <LocationIcon aria-hidden="true" />
          </span>
          <span
            className={`
        fw-map-pin-name text-[9px] leading-[1.4] font-extrabold text-[#2f4557] p-[3px_7px] rounded-[6px]
        mt-[3px] [background:#fffffff0] [box-shadow:0_2px_5px_#2f45570d] dark:[color:#c7dbe9]
        dark:[border-color:#558bb440] dark:[background:#172d3eea] max-[480.001px]:text-[8px]
        max-[480.001px]:p-[2px_6px]
      `}
          >
            {item.name}
          </span>
        </button>
      ))}
      <div
        className={`
        fw-map-compass absolute top-[13px] right-[14px] grid place-items-center leading-[1.2]
        text-[#698296] text-[24px] max-[480.001px]:text-[18px] max-[480.001px]:right-[10px]
        max-[480.001px]:top-[9px]
      `}
        aria-hidden="true"
      >
        <span className="text-[8px] font-[800]">N</span>↑
      </div>
      <div
        className={`
        fw-map-network absolute left-[20px] bottom-[14px] flex items-center gap-[7px] p-[8px_10px]
        [border:1px_solid_#fff] rounded-[10px] text-[#2f4557] text-[9px] font-[750] [background:#ffffffe8]
        [box-shadow:0_3px_16px_#2f45570d] dark:[color:#c7dbe9] dark:[border-color:#558bb440]
        dark:[background:#172d3eea] max-[480.001px]:left-[10px] max-[480.001px]:bottom-[9px]
        max-[480.001px]:p-[5px_7px] max-[480.001px]:text-[7px]
      `}
        aria-hidden="true"
      >
        <span className="block w-[6px] h-[6px] rounded-full [background:#d69e09] [box-shadow:0_0_0_3px_#d69e0920]" />{" "}
        Una tarjeta. Tres destinos.
      </div>
    </div>
  );
}
