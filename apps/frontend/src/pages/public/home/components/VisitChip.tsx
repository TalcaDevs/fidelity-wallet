import { motion } from "motion/react";
import type { ChipProps } from "../types/loyaltyCardVisuals.types";
import StarIcon from "../../../../assets/home/star-stamp.svg?react";
import GiftIcon from "../../../../assets/home/gift-stamp.svg?react";
export function VisitChip({
  stamps,
  complete,
  ready,
  motionAllowed,
}: ChipProps) {
  return (
    <motion.div
      className={`
        fw-card-chip absolute z-[3] flex items-center gap-[10px] p-[13px_17px]
        [border:1px_solid_var(--fw-border,_rgb(255_255_255_/_80%))] rounded-[15px]
        text-[color:var(--fw-text,_#2f4557)] pointer-events-none fw-card-chip-visit top-[20%] right-[-1%]
        [background:var(--fw-surface,_rgb(255_255_255_/_80%))]
        [box-shadow:0_12px_28px_-16px_rgb(47_69_87_/_25%),_inset_0_1px_0_rgb(255_255_255_/_50%)]
        [backdrop-filter:blur(18px)] [clip-path:inset(0_round_15px)]
        min-[768px]:max-[1100.001px]:p-[10px_12px] max-[767.001px]:p-[10px_12px] max-[767.001px]:gap-[8px]
        max-[767.001px]:rounded-[12px] max-[390.001px]:p-[8px_9px] max-[390.001px]:gap-[6px]
        min-[768px]:max-[1100.001px]:top-[18%] min-[768px]:max-[1100.001px]:right-[-2%]
        max-[767.001px]:top-[17%] max-[767.001px]:right-[0] max-[390.001px]:top-[12%]
        max-[390.001px]:right-[0]
      ${complete ? " fw-card-chip-reward [&.fw-card-chip-reward]:[border-color:#d69e09] [&.fw-card-chip-reward]:[color:#624409] [&.fw-card-chip-reward]:[background:linear-gradient(125deg,_#fff0bc,_#ffe298)] [&.fw-card-chip-reward]:[box-shadow:0_12px_32px_-15px_rgb(214_158_9_/_60%)] [&.fw-card-chip-reward_small]:[color:#795917] [&.fw-card-chip-reward_.fw-card-chip-icon]:[color:#795400] [&.fw-card-chip-reward_.fw-card-chip-icon]:[background:rgb(255_255_255_/_55%)] [border-color:#d69e09] text-[#624409]" : ""}

      `}
      initial={false}
      animate={{
        opacity: ready ? 1 : 0,
        y: ready ? 0 : 12,
        rotate: complete && motionAllowed ? [-7, 8, 5] : 5,
        scale: complete && motionAllowed ? [0.82, 1.11, 1] : 1,
      }}
      transition={{ duration: motionAllowed ? 0.4 : 0 }}
      aria-hidden="true"
    >
      <span
        className={`
        fw-card-chip-icon [&_svg]:w-[20px] [&_svg]:h-[20px] max-[390.001px]:[&_svg]:w-[16px]
        max-[390.001px]:[&_svg]:h-[16px] grid place-items-center w-[34px] h-[34px] rounded-[10px]
        text-[#a36b00] [background:#fff1c9] max-[767.001px]:w-[29px] max-[767.001px]:h-[29px]
        max-[767.001px]:rounded-[8px] max-[390.001px]:w-[23px] max-[390.001px]:h-[23px]
      `}
      >
        {complete ? (
          <GiftIcon aria-hidden="true" />
        ) : (
          <StarIcon aria-hidden="true" />
        )}
      </span>
      <span>
        <strong
          className={`
        block text-[13px] font-[700] leading-[1.4] tracking-[-0.02em] max-[767.001px]:text-[11px]
        max-[390.001px]:text-[10px]
      `}
        >
          {complete ? "¡Café desbloqueado!" : `${stamps} visitas, más cerca`}
        </strong>
        <small
          className={`
        block [color:var(--fw-muted,_#526a7b)] text-[9px] leading-[1.6] max-[767.001px]:text-[8px]
        max-[390.001px]:text-[7px]
      `}
        >
          {complete ? "Volver tiene su premio" : "Una visita más cerca"}
        </small>
      </span>
    </motion.div>
  );
}
