import type { HomeBrandProps } from "../types/homeComponent.types.ts";
import { HomeIcon as Icon } from "./HomeIcon";
export function HomeBrand({
  label = "Fidelity Wallet, inicio",
}: HomeBrandProps) {
  return (
    <a
      className={`
        fw-brand inline-flex gap-[11px] items-center text-[color:var(--fw-text)] text-[23px] font-extrabold
        tracking-[-1.2px] whitespace-nowrap max-[1100.001px]:text-[20px] max-[700.001px]:text-[20px]
        max-[700.001px]:gap-[8px] max-[390.001px]:text-[18px] max-[390.001px]:gap-[6px]
        max-[350.001px]:text-[16px]
      `}
      href="#"
      aria-label={label}
    >
      <span className={`
        fw-brand-mark [&_.fw-icon]:w-[23px] [&_.fw-icon]:h-[23px] max-[390.001px]:[&_.fw-icon]:w-[19px]
        max-[390.001px]:[&_.fw-icon]:h-[19px] w-[36px] h-[38px] grid place-items-center text-[#fff]
        rounded-[11px] [background:#087bd7] [transform:rotate(-7deg)]
        [box-shadow:inset_0_1px_0_#ffffff50,_0_5px_14px_#087bd722] max-[1100.001px]:w-[32px]
        max-[1100.001px]:h-[34px] max-[700.001px]:w-[30px] max-[700.001px]:h-[32px]
        max-[700.001px]:rounded-[9px] max-[390.001px]:w-[26px] max-[390.001px]:h-[29px]
      `}>
        <Icon name="wallet" />
      </span>
      <span>
        fidelity<span className="fw-brand-light font-[450]">wallet</span>
        <span className="fw-brand-dot text-[#d69e09]">.</span>
      </span>
    </a>
  );
}
