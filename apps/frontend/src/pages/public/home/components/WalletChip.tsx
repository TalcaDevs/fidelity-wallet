import { motion } from "motion/react";
import type { ChipProps } from "../types/loyaltyCardVisuals.types";
export function WalletChip({
  ready,
  motionAllowed,
}: Pick<ChipProps, "ready" | "motionAllowed">) {
  return (
    <motion.div
      className={`
        fw-card-chip absolute z-[3] flex items-center gap-[10px] p-[13px_17px]
        [border:1px_solid_var(--fw-border,_rgb(255_255_255_/_80%))] rounded-[15px]
        text-[color:var(--fw-text,_#2f4557)] pointer-events-none fw-card-chip-wallet bottom-[8%] left-0
        [background:var(--fw-surface,_rgb(255_255_255_/_80%))]
        [box-shadow:0_12px_28px_-16px_rgb(47_69_87_/_25%),_inset_0_1px_0_rgb(255_255_255_/_50%)]
        [backdrop-filter:blur(18px)] [clip-path:inset(0_round_15px)]
        min-[768px]:max-[1100.001px]:p-[10px_12px] max-[767.001px]:p-[10px_12px] max-[767.001px]:gap-[8px]
        max-[767.001px]:rounded-[12px] max-[390.001px]:p-[8px_9px] max-[390.001px]:gap-[6px]
        min-[768px]:max-[1100.001px]:bottom-[8%] min-[768px]:max-[1100.001px]:left-[-2%]
        max-[767.001px]:bottom-[8%] max-[767.001px]:left-[0] max-[390.001px]:bottom-[8%]
        max-[390.001px]:left-[0]
      `}
      initial={false}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12, rotate: -3 }}
      transition={{
        duration: motionAllowed ? 0.4 : 0,
        delay: motionAllowed ? 0.15 : 0,
      }}
      aria-hidden="true"
    >
      <span
        className={`
        fw-card-wallet-icon [&_span:nth-child(1)]:top-[4px] [&_span:nth-child(1)]:[background:#d69e09]
        [&_span:nth-child(2)]:top-[8px] [&_span:nth-child(2)]:[background:#d66409]
        [&_span:nth-child(3)]:top-[12px] [&_span:nth-child(3)]:[background:#087bd7] relative block
        w-[28px] h-[24px] overflow-hidden rounded-[5px] [background:#2f4557]
      `}
      >
        <span className="absolute left-[4px] right-[4px] h-[9px] rounded-[2px]" />
        <span className="absolute left-[4px] right-[4px] h-[9px] rounded-[2px]" />
        <span className="absolute left-[4px] right-[4px] h-[9px] rounded-[2px]" />
      </span>
      <span>
        <small
          className={`
        block [color:var(--fw-muted,_#526a7b)] text-[9px] leading-[1.6] max-[767.001px]:text-[8px]
        max-[390.001px]:text-[7px] text-[7px] tracking-[0.14em] max-[767.001px]:text-[6px]
      `}
        >
          SIEMPRE A MANO
        </small>
        <strong
          className={`
        block text-[13px] font-[700] leading-[1.4] tracking-[-0.02em] max-[767.001px]:text-[11px]
        max-[390.001px]:text-[10px]
      `}
        >
          En su Wallet.
        </strong>
      </span>
    </motion.div>
  );
}
