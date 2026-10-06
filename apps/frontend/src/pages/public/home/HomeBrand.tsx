import { HomeIcon as Icon } from "./HomeIcon";
export function HomeBrand({
  label = "Fidelity Wallet, inicio",
}: {
  label?: string;
}) {
  return (
    <a
      className="fw-brand inline-flex gap-[11px] items-center text-[color:var(--fw-text)] text-[23px] font-extrabold tracking-[-1.2px] whitespace-nowrap"
      href="#"
      aria-label={label}
    >
      <span className="fw-brand-mark w-[36px] h-[38px] grid place-items-center text-[#fff] rounded-[11px]">
        <Icon name="wallet" />
      </span>
      <span>
        fidelity<span className="fw-brand-light font-[450]">wallet</span>
        <span className="fw-brand-dot text-[#d69e09]">.</span>
      </span>
    </a>
  );
}
