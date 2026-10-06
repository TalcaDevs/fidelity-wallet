import { REWARD_STAMPS } from "../constants/loyaltyCard.constants.ts";
import type { StampFaceProps, LoyaltyStampProps } from "../types/homeComponent.types.ts";
import type { CardProps, StampProps, ChipProps } from "../types/loyaltyCardVisuals.types.ts";
import { PARTICLES } from "../constants/loyaltyCardVisuals.constants.ts";
import StarIcon from "../../../../assets/home/star-stamp.svg?react";
import GiftIcon from "../../../../assets/home/gift-stamp.svg?react";
import CoffeeIcon from "../../../../assets/home/coffee-stamp.svg?react";
import type { CSSProperties } from "react";
import { motion } from "motion/react";

function StampFace({ index, filled }: StampFaceProps) {
  if (index === REWARD_STAMPS - 1) return <GiftIcon aria-hidden="true" />;
  if (filled) return <CoffeeIcon aria-hidden="true" />;
  return <span>{String(index + 1).padStart(2, "0")}</span>;
}

function StampBurst() {
  return (
    <span className="fw-card-stamp-burst absolute inset-0 pointer-events-none">
      <span className={`
        fw-card-stamp-ring absolute inset-[-2px] [border:2px_solid_#ffe298] rounded-full
        [animation:fw-card-stamp-ring_630ms_ease-out_both] motion-reduce:[animation:none]
      `} />
      {Array.from({ length: 8 }, (_, spark) => (
        <span
          className={`
            fw-card-stamp-spark absolute left-[calc(50%_-_1px)] top-[calc(50%_-_3px)] w-[2px] h-[6px]
            rounded-[2px] [background:#ffe298] [animation:fw-card-stamp-spark_580ms_ease-out_both]
            motion-reduce:[animation:none]
          `}
          key={spark}
          style={{ "--fw-spark-angle": spark * 45 + "deg" } as CSSProperties}
        />
      ))}
    </span>
  );
}

function Stamp({
  index,
  stamps,
  burst,
  motionAllowed,
}: LoyaltyStampProps) {
  const filled = index < stamps;
  const landing = burst?.stamp === index + 1 && motionAllowed;
  return (
    <motion.span
      className={`
        fw-card-stamp relative grid place-items-center min-w-0 aspect-[1] rounded-full text-[12px]
        [border:1px_dashed_rgb(229_244_255_/_57%)] text-[#ecf6ff] [&_svg]:w-[49%] [&_svg]:h-[49%]
        data-[filled=true]:text-[#0872bf] data-[filled=true]:[border:1px_solid_#e9f6ff]
        data-[filled=true]:bg-[#e9f6ff] data-[filled=true]:shadow-[0_2px_5px_rgb(0_44_97_/_7%)]
        data-[gift=true]:text-[#ffe298] data-[gift=true]:[border:1px_solid_#f6da88]
        data-[gift=true]:bg-[rgb(255_225_128_/_15%)] data-[gift=true]:data-[filled=true]:text-[#775411]
        data-[gift=true]:data-[filled=true]:bg-[#ffe298]
        data-[gift=true]:data-[filled=true]:shadow-[0_0_22px_rgb(255_223_135_/_32%)]
        data-[landing=true]:z-[1]
        data-[landing=true]:[animation:fw-card-stamp-land_620ms_cubic-bezier(0.22,1,0.36,1)_both]
        motion-reduce:[animation:none]
      ${filled ? "fw-card-stamp-filled" : ""} ${landing ? "fw-card-stamp-landing" : ""}`}
      data-filled={filled}
      data-gift={index === REWARD_STAMPS - 1}
      data-landing={landing}
      animate={{ scale: 1, rotate: filled ? -8 : 0 }}
      initial={false}
      whileHover={motionAllowed ? { scale: 1.1, rotate: 4 } : undefined}
      transition={
        motionAllowed
          ? { type: "spring", stiffness: 350, damping: 22 }
          : { duration: 0 }
      }
    >
      <StampFace index={index} filled={filled} />
      {landing && <StampBurst key={burst.id} />}
    </motion.span>
  );
}

function StampGrid(props: StampProps) {
  return (
    <div
      className={`
        fw-card-stamps grid [grid-template-columns:repeat(5,_minmax(0,_1fr))] gap-[12px]
        min-[768px]:max-[1100.001px]:gap-[9px] max-[767.001px]:gap-[10px] max-[390.001px]:gap-[8px]
      `}
      aria-hidden="true"
    >
      {Array.from({ length: REWARD_STAMPS }, (_, index) => (
        <Stamp key={index} index={index} {...props} />
      ))}
    </div>
  );
}

export function CardPass({
  stamps,
  complete,
  burst,
  motionAllowed,
}: CardProps) {
  return (
    <div
      className={`
        fw-card-pass relative overflow-hidden w-full p-[25px_25px_20px] text-[#fff]
        [border:1px_solid_rgb(255_255_255_/_48%)] rounded-[26px] box-border
        [background:linear-gradient(126deg,_#1896e7_0%,_#087bd7_40%,_#075eb0_100%)]
        [box-shadow:inset_0_1px_0_rgb(255_255_255_/_22%),_0_35px_55px_-22px_rgb(4_64_115_/_43%)]
        [transform:translateZ(1px)] [transition:border-color_400ms_ease,_box-shadow_400ms_ease]
        min-[768px]:max-[1100.001px]:p-[21px] max-[767.001px]:p-[20px] max-[767.001px]:rounded-[22px]
        max-[390.001px]:p-[16px] max-[390.001px]:rounded-[20px] motion-reduce:[transition:none]
      ${complete ? " fw-card-pass-complete [&.fw-card-pass-complete]:[border-color:#ffe298] [&.fw-card-pass-complete]:[box-shadow:inset_0_0_0_2px_rgb(255_226_152_/_25%),_0_32px_62px_-20px_rgb(214_158_9_/_35%)] [&.fw-card-pass-complete_.fw-card-sheen]:[background:linear-gradient(_125deg,_rgb(255_226_152_/_32%),_transparent_46%,_rgb(255_226_152_/_9%)_)] [&.fw-card-pass-complete_.fw-card-eyebrow]:[color:#ffe298] [&.fw-card-pass-complete_.fw-card-stamp-filled]:[color:#775411] [&.fw-card-pass-complete_.fw-card-stamp-filled]:[border-color:#ffe298] [&.fw-card-pass-complete_.fw-card-stamp-filled]:[background:#ffe298] [border-color:#ffe298]" : ""}`}
      role="group"
      aria-label={`Tarjeta de ejemplo de Café Esquina: ${stamps} de 10 sellos`}
    >
      <div
        className={`
          fw-card-sheen absolute inset-0 pointer-events-none
          [background:linear-gradient(_125deg,_rgb(255_255_255_/_15%),_transparent_35%,_transparent_65%,_rgb(255_255_255_/_6%)_)]
        `}
        aria-hidden="true"
      />
      <div className="fw-card-pass-top flex items-center justify-between">
        <div className={`
          fw-card-brand [&_strong]:text-[13px] [&_strong]:font-[800] [&_strong]:tracking-[0.05em]
          max-[390.001px]:[&_strong]:text-[11px] justify-start gap-[9px] text-[9px] tracking-[0.13em]
          leading-[1.5] flex items-center justify-between max-[390.001px]:gap-[6px] max-[390.001px]:text-[7px]
        `}>
          <span className={`
            fw-card-brand-mark [&_svg]:w-[20px] [&_svg]:h-[20px] max-[390.001px]:[&_svg]:w-[17px]
            max-[390.001px]:[&_svg]:h-[17px] grid place-items-center w-[35px] h-[35px]
            [border:1px_solid_rgb(255_255_255_/_45%)] rounded-full max-[390.001px]:w-[28px]
            max-[390.001px]:h-[28px]
          `}>
            <CoffeeIcon aria-hidden="true" />
          </span>
          <span>
            CAFÉ
            <br />
            <strong>ESQUINA.</strong>
          </span>
        </div>
        <span className={`
          fw-card-member text-[#dff1ff] text-[7px] font-semibold tracking-[0.12em] leading-[1.7] text-right
          max-[390.001px]:text-[5.5px]
        `}>
          BUEN CAFÉ.
          <br />
          MEJORES RECOMPENSAS.
        </span>
      </div>

      <div className={`
        fw-card-reward-copy [&_p]:m-[6px_0_0] [&_p]:text-[clamp(23px,_2.5vw,_29px)] [&_p]:leading-[1.22]
        [&_p]:font-[650] [&_p]:tracking-[-0.055em] [&_p_span]:font-[450] max-[767.001px]:[&_p]:text-[25px]
        max-[390.001px]:[&_p]:text-[20px] m-[24px_0_20px] max-[767.001px]:m-[19px_0_16px]
        max-[390.001px]:m-[15px_0]
      `}>
        <span className="fw-card-eyebrow text-[#d8efff] text-[8px] font-semibold tracking-[0.2em] max-[390.001px]:text-[7px]">
          {complete ? "VOLVER TIENE SU PREMIO" : "TU PRÓXIMO FAVORITO"}
        </span>
        <p>
          {complete ? "Tu próximo café." : "Un café."}
          <br />
          <span>
            {complete ? "Ya está invitado." : "Por cuenta de la casa."}
          </span>
        </p>
      </div>

      <StampGrid stamps={stamps} burst={burst} motionAllowed={motionAllowed} />
      <div className={`
        fw-card-progress-copy [&_strong]:[color:white] [&_strong]:text-[13px] m-[17px_0_8px] text-[#dff1ff]
        text-[9px] flex items-center justify-between max-[390.001px]:mt-[12px] max-[390.001px]:text-[7px]
      `}>
        <span>
          <strong>{stamps}</strong> / 10 sellos
        </span>
        <span>
          {stamps === 10
            ? "¡Tu café te espera!"
            : `${10 - stamps} para tu recompensa`}
        </span>
      </div>
      <div
        className={`
          fw-card-progress [&_>_span]:block [&_>_span]:h-[100%] [&_>_span]:rounded-[3px]
          [&_>_span]:[background:#ffe298] overflow-hidden h-[3px] rounded-[3px]
          [background:rgb(255_255_255_/_22%)]
        `}
        aria-hidden="true"
      >
        <motion.span
          animate={{ width: `${stamps * 10}%` }}
          transition={{ duration: motionAllowed ? 0.35 : 0 }}
        />
      </div>

      <div className={`
        fw-card-pass-bottom [&_strong]:text-[11px] [&_strong]:tracking-[-0.06em] [&_strong]:[color:white]
        mt-[18px] text-[8px] text-[#d7eaf8] flex items-center justify-between max-[390.001px]:mt-[13px]
      `}>
        <span>
          hecho con <strong>fidelity</strong>
          <span className="fw-card-brand-dot text-[#ffd371] text-[15px]">
            .
          </span>
        </span>
        <span
          className={`
            fw-card-barcode w-[60px] h-[17px] opacity-[0.72]
            [background:repeating-linear-gradient(_90deg,_white_0_1px,_transparent_1px_3px,_white_3px_5px,_transparent_5px_6px,_white_6px_7px,_transparent_7px_10px_)]
          `}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function VisitChip({
  stamps,
  complete,
  ready,
  motionAllowed,
}: ChipProps) {
  return (
    <motion.div
      className={`
        fw-card-chip [&_strong]:block [&_strong]:text-[13px] [&_strong]:font-[700] [&_strong]:leading-[1.4]
        [&_strong]:tracking-[-0.02em] [&_small]:block [&_small]:[color:var(--fw-muted,_#526a7b)]
        [&_small]:text-[9px] [&_small]:leading-[1.6] max-[767.001px]:[&_strong]:text-[11px]
        max-[767.001px]:[&_small]:text-[8px] max-[390.001px]:[&_strong]:text-[10px]
        max-[390.001px]:[&_small]:text-[7px] absolute z-[3] flex items-center gap-[10px] p-[13px_17px]
        [border:1px_solid_var(--fw-border,_rgb(255_255_255_/_80%))] rounded-[15px]
        text-[color:var(--fw-text,_#2f4557)] pointer-events-none fw-card-chip-visit top-[20%] right-[-1%]
        [background:var(--fw-surface,_rgb(255_255_255_/_80%))]
        [box-shadow:0_12px_28px_-16px_rgb(47_69_87_/_25%),_inset_0_1px_0_rgb(255_255_255_/_50%)]
        [backdrop-filter:blur(18px)] [clip-path:inset(0_round_15px)]
        min-[768px]:max-[1100.001px]:p-[10px_12px] max-[767.001px]:p-[10px_12px] max-[767.001px]:gap-[8px]
        max-[767.001px]:rounded-[12px] max-[390.001px]:p-[8px_9px] max-[390.001px]:gap-[6px]
        [transform:rotate(5deg)] min-[768px]:max-[1100.001px]:top-[18%]
        min-[768px]:max-[1100.001px]:right-[-2%] max-[767.001px]:top-[17%] max-[767.001px]:right-[0]
        max-[390.001px]:top-[12%] max-[390.001px]:right-[0]
      ${complete ? " fw-card-chip-reward [&.fw-card-chip-reward]:[border-color:#d69e09] [&.fw-card-chip-reward]:[color:#624409] [&.fw-card-chip-reward]:[background:linear-gradient(125deg,_#fff0bc,_#ffe298)] [&.fw-card-chip-reward]:[box-shadow:0_12px_32px_-15px_rgb(214_158_9_/_60%)] [&.fw-card-chip-reward_small]:[color:#795917] [&.fw-card-chip-reward_.fw-card-chip-icon]:[color:#795400] [&.fw-card-chip-reward_.fw-card-chip-icon]:[background:rgb(255_255_255_/_55%)] [border-color:#d69e09] text-[#624409]" : ""}`}
      initial={false}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
      transition={{ duration: motionAllowed ? 0.4 : 0 }}
      aria-hidden="true"
    >
      <span className={`
        fw-card-chip-icon [&_svg]:w-[20px] [&_svg]:h-[20px] max-[390.001px]:[&_svg]:w-[16px]
        max-[390.001px]:[&_svg]:h-[16px] grid place-items-center w-[34px] h-[34px] rounded-[10px]
        text-[#a36b00] [background:#fff1c9] max-[767.001px]:w-[29px] max-[767.001px]:h-[29px]
        max-[767.001px]:rounded-[8px] max-[390.001px]:w-[23px] max-[390.001px]:h-[23px]
      `}>
        {complete ? (
          <GiftIcon aria-hidden="true" />
        ) : (
          <StarIcon aria-hidden="true" />
        )}
      </span>
      <span>
        <strong>
          {complete ? "¡Café desbloqueado!" : `${stamps} visitas, más cerca`}
        </strong>
        <small>
          {complete ? "Volver tiene su premio" : "Una visita más cerca"}
        </small>
      </span>
    </motion.div>
  );
}

export function WalletChip({
  ready,
  motionAllowed,
}: Pick<ChipProps, "ready" | "motionAllowed">) {
  return (
    <motion.div
      className={`
        fw-card-chip [&_strong]:block [&_strong]:text-[13px] [&_strong]:font-[700] [&_strong]:leading-[1.4]
        [&_strong]:tracking-[-0.02em] [&_small]:block [&_small]:[color:var(--fw-muted,_#526a7b)]
        [&_small]:text-[9px] [&_small]:leading-[1.6] max-[767.001px]:[&_strong]:text-[11px]
        max-[767.001px]:[&_small]:text-[8px] max-[390.001px]:[&_strong]:text-[10px]
        max-[390.001px]:[&_small]:text-[7px] absolute z-[3] flex items-center gap-[10px] p-[13px_17px]
        [border:1px_solid_var(--fw-border,_rgb(255_255_255_/_80%))] rounded-[15px]
        text-[color:var(--fw-text,_#2f4557)] pointer-events-none fw-card-chip-wallet [&_small]:text-[7px]
        [&_small]:tracking-[0.14em] max-[767.001px]:[&_small]:text-[6px] bottom-[8%] left-0
        [background:var(--fw-surface,_rgb(255_255_255_/_80%))]
        [box-shadow:0_12px_28px_-16px_rgb(47_69_87_/_25%),_inset_0_1px_0_rgb(255_255_255_/_50%)]
        [backdrop-filter:blur(18px)] [clip-path:inset(0_round_15px)]
        min-[768px]:max-[1100.001px]:p-[10px_12px] max-[767.001px]:p-[10px_12px] max-[767.001px]:gap-[8px]
        max-[767.001px]:rounded-[12px] max-[390.001px]:p-[8px_9px] max-[390.001px]:gap-[6px]
        [transform:rotate(-3deg)] min-[768px]:max-[1100.001px]:bottom-[8%]
        min-[768px]:max-[1100.001px]:left-[-2%] max-[767.001px]:bottom-[8%] max-[767.001px]:left-[0]
        max-[390.001px]:bottom-[8%] max-[390.001px]:left-[0]
      `}
      initial={false}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
      transition={{
        duration: motionAllowed ? 0.4 : 0,
        delay: motionAllowed ? 0.15 : 0,
      }}
      aria-hidden="true"
    >
      <span className={`
        fw-card-wallet-icon [&_span]:absolute [&_span]:left-[4px] [&_span]:right-[4px] [&_span]:h-[9px]
        [&_span]:rounded-[2px] [&_span:nth-child(1)]:top-[4px] [&_span:nth-child(1)]:[background:#d69e09]
        [&_span:nth-child(2)]:top-[8px] [&_span:nth-child(2)]:[background:#d66409]
        [&_span:nth-child(3)]:top-[12px] [&_span:nth-child(3)]:[background:#087bd7] relative block w-[28px]
        h-[24px] overflow-hidden rounded-[5px] [background:#2f4557]
      `}>
        <span />
        <span />
        <span />
      </span>
      <span>
        <small>SIEMPRE A MANO</small>
        <strong>En su Wallet.</strong>
      </span>
    </motion.div>
  );
}

export function CardCelebration({
  burst,
  motionAllowed,
}: Pick<CardProps, "burst" | "motionAllowed">) {
  if (!motionAllowed || burst?.stamp !== 10) return null;
  return (
    <div
      className="fw-card-celebration absolute inset-0 z-[4] overflow-hidden pointer-events-none"
      key={burst.id}
      aria-hidden="true"
    >
      <span className={`
        fw-card-celebration-halo absolute left-[calc(50%_-_90px)] top-[calc(52%_-_90px)] w-[180px] h-[180px]
        [border:2px_solid_rgb(214_158_9_/_55%)] rounded-full
        [animation:fw-card-reward-halo_1100ms_ease-out_both] motion-reduce:[animation:none]
      `} />
      {PARTICLES.map((style, index) => (
        <span
          className={`
            fw-card-particle [&:nth-child(3n)]:w-[7px] [&:nth-child(3n)]:h-[7px] [&:nth-child(3n)]:rounded-full
            [&:nth-child(3n)]:[background:#d66409] [&:nth-child(3n_+_1)]:w-[4px] [&:nth-child(3n_+_1)]:h-[9px]
            [&:nth-child(3n_+_1)]:[background:#087bd7] absolute left-[50%] top-[52%] w-[6px] h-[11px]
            rounded-[2px] [background:#d69e09]
            [animation:fw-card-reward-particle_1350ms_cubic-bezier(0.12,_0.7,_0.32,_1)_var(--fw-particle-delay)_both]
            motion-reduce:[animation:none]
          `}
          key={index}
          style={style}
        />
      ))}
    </div>
  );
}
