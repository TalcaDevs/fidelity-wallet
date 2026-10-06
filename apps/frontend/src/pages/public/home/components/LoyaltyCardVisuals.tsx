import { REWARD_STAMPS } from "../constants/loyaltyCard.constants.ts";
import type {
  StampFaceProps,
  LoyaltyStampProps,
} from "../types/homeComponent.types.ts";
import type {
  CardProps,
  StampProps,
} from "../types/loyaltyCardVisuals.types.ts";
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
      <span
        className={`
        fw-card-stamp-ring absolute inset-[-2px] [border:2px_solid_#ffe298] rounded-full
        [animation:fw-card-stamp-ring_630ms_ease-out_both]
        group-data-[reduced-motion=true]/home:[animation:none]
      `}
      />
      {Array.from({ length: 8 }, (_, spark) => (
        <span
          className={`
        fw-card-stamp-spark absolute left-[calc(50%_-_1px)] top-[calc(50%_-_3px)] w-[2px] h-[6px]
        rounded-[2px] [background:#ffe298] [animation:fw-card-stamp-spark_580ms_ease-out_both]
        group-data-[reduced-motion=true]/home:[animation:none]
      `}
          key={spark}
          style={{ "--fw-spark-angle": spark * 45 + "deg" } as CSSProperties}
        />
      ))}
    </span>
  );
}

function Stamp({ index, stamps, burst, motionAllowed }: LoyaltyStampProps) {
  const filled = index < stamps;
  const landing = burst?.stamp === index + 1 && motionAllowed;
  return (
    <span
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
        group-data-[reduced-motion=true]/home:[animation:none]
      ${filled ? "fw-card-stamp-filled" : ""}

      ${landing ? "fw-card-stamp-landing" : ""}

      `}
      data-filled={filled}
      data-gift={index === REWARD_STAMPS - 1}
      data-landing={landing}
    >
      <StampFace index={index} filled={filled} />
      {landing && <StampBurst key={burst.id} />}
    </span>
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
        max-[390.001px]:p-[16px] max-[390.001px]:rounded-[20px]
        group-data-[reduced-motion=true]/home:[transition:none]
      ${complete ? " fw-card-pass-complete [&.fw-card-pass-complete]:[border-color:#ffe298] [&.fw-card-pass-complete]:[box-shadow:inset_0_0_0_2px_rgb(255_226_152_/_25%),_0_32px_62px_-20px_rgb(214_158_9_/_35%)] [&.fw-card-pass-complete_.fw-card-sheen]:[background:linear-gradient(_125deg,_rgb(255_226_152_/_32%),_transparent_46%,_rgb(255_226_152_/_9%)_)] [&.fw-card-pass-complete_.fw-card-eyebrow]:[color:#ffe298] [&.fw-card-pass-complete_.fw-card-stamp-filled]:[color:#775411] [&.fw-card-pass-complete_.fw-card-stamp-filled]:[border-color:#ffe298] [&.fw-card-pass-complete_.fw-card-stamp-filled]:[background:#ffe298] [border-color:#ffe298]" : ""}

      `}
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
        <div
          className={`
        fw-card-brand justify-start gap-[9px] text-[9px] tracking-[0.13em] leading-[1.5] flex items-center
        justify-between max-[390.001px]:gap-[6px] max-[390.001px]:text-[7px]
      `}
        >
          <span
            className={`
        fw-card-brand-mark [&_svg]:w-[20px] [&_svg]:h-[20px] max-[390.001px]:[&_svg]:w-[17px]
        max-[390.001px]:[&_svg]:h-[17px] grid place-items-center w-[35px] h-[35px]
        [border:1px_solid_rgb(255_255_255_/_45%)] rounded-full max-[390.001px]:w-[28px]
        max-[390.001px]:h-[28px]
      `}
          >
            <CoffeeIcon aria-hidden="true" />
          </span>
          <span>
            CAFÉ
            <br />
            <strong className="text-[13px] font-[800] tracking-[0.05em] max-[390.001px]:text-[11px]">
              ESQUINA.
            </strong>
          </span>
        </div>
        <span
          className={`
        fw-card-member text-[#dff1ff] text-[7px] font-semibold tracking-[0.12em] leading-[1.7] text-right
        max-[390.001px]:text-[5.5px]
      `}
        >
          BUEN CAFÉ.
          <br />
          MEJORES RECOMPENSAS.
        </span>
      </div>

      <div
        className={`
        fw-card-reward-copy m-[24px_0_20px] max-[767.001px]:m-[19px_0_16px] max-[390.001px]:m-[15px_0]
      `}
      >
        <span className="fw-card-eyebrow text-[#d8efff] text-[8px] font-semibold tracking-[0.2em] max-[390.001px]:text-[7px]">
          {complete ? "VOLVER TIENE SU PREMIO" : "TU PRÓXIMO FAVORITO"}
        </span>
        <p
          className={`
        m-[6px_0_0] text-[clamp(23px,_2.5vw,_29px)] leading-[1.22] font-[650] tracking-[-0.055em]
        max-[767.001px]:text-[25px] max-[390.001px]:text-[20px]
      `}
        >
          {complete ? "Tu próximo café." : "Un café."}
          <br />
          <span className="font-[450]">
            {complete ? "Ya está invitado." : "Por cuenta de la casa."}
          </span>
        </p>
      </div>

      <StampGrid stamps={stamps} burst={burst} motionAllowed={motionAllowed} />
      <div
        className={`
        fw-card-progress-copy m-[17px_0_8px] text-[#dff1ff] text-[9px] flex items-center justify-between
        max-[390.001px]:mt-[12px] max-[390.001px]:text-[7px]
      `}
      >
        <span>
          <strong className="[color:white] text-[13px]">{stamps}</strong> / 10
          sellos
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

      <div
        className={`
        fw-card-pass-bottom mt-[18px] text-[8px] text-white bg-[#064d89] rounded-md px-2 py-1 flex items-center justify-between
        max-[390.001px]:mt-[13px]
      `}
      >
        <span>
          hecho con{" "}
          <strong className="text-[11px] tracking-[-0.06em] [color:white]">
            fidelity
          </strong>
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
