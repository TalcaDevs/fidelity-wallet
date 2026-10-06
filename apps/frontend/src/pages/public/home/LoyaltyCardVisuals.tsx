import StarIcon from "../../../assets/home/star-stamp.svg?react";
import GiftIcon from "../../../assets/home/gift-stamp.svg?react";
import CoffeeIcon from "../../../assets/home/coffee-stamp.svg?react";
import type { CSSProperties } from "react";
import { motion } from "motion/react";
import type { LoyaltyCardState } from "./useLoyaltyCard";
const PARTICLES = Array.from({ length: 22 }, (_, index) => {
  const angle = (index / 22) * Math.PI * 2;
  const distance = 95 + (index % 4) * 20;
  return {
    "--fw-particle-x": `${Math.cos(angle) * distance}px`,
    "--fw-particle-y": `${Math.sin(angle) * distance - 35}px`,
    "--fw-particle-rotation": `${index * 47}deg`,
    "--fw-particle-delay": `${(index % 3) * 25}ms`,
  } as CSSProperties;
});

type CardProps = Pick<
  LoyaltyCardState,
  "stamps" | "complete" | "burst" | "motionAllowed"
>;
type StampProps = Pick<CardProps, "stamps" | "burst" | "motionAllowed">;
type ChipProps = Pick<
  LoyaltyCardState,
  "stamps" | "complete" | "ready" | "motionAllowed"
>;

function StampFace({ index, filled }: { index: number; filled: boolean }) {
  if (index === 9) return <GiftIcon aria-hidden="true" />;
  if (filled) return <CoffeeIcon aria-hidden="true" />;
  return <span>{String(index + 1).padStart(2, "0")}</span>;
}

function StampBurst() {
  return (
    <span className="fw-card-stamp-burst absolute inset-0 pointer-events-none">
      <span className="fw-card-stamp-ring absolute inset-[-2px] [border:2px_solid_#ffe298] rounded-full" />
      {Array.from({ length: 8 }, (_, spark) => (
        <span
          className="fw-card-stamp-spark absolute [left:calc(50%_-_1px)] [top:calc(50%_-_3px)] w-[2px] h-[6px] rounded-[2px]"
          key={spark}
          style={{ "--fw-spark-angle": spark * 45 + "deg" } as CSSProperties}
        />
      ))}
    </span>
  );
}

function stampClassName(filled: boolean, last: boolean, landing: boolean) {
  return [
    "fw-card-stamp relative grid place-items-center min-w-0 aspect-[1] [border:1px_dashed_rgb(229_244_255_/_57%)] rounded-full text-[#ecf6ff] text-[12px]",
    filled && "fw-card-stamp-filled",
    last && "fw-card-stamp-gift",
    landing && "fw-card-stamp-landing",
  ]
    .filter(Boolean)
    .join(" ");
}

function Stamp({
  index,
  stamps,
  burst,
  motionAllowed,
}: StampProps & { index: number }) {
  const filled = index < stamps;
  const landing = burst?.stamp === index + 1 && motionAllowed;
  return (
    <motion.span
      className={stampClassName(filled, index === 9, landing)}
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
      className="fw-card-stamps grid [grid-template-columns:repeat(5,_minmax(0,_1fr))] gap-[12px]"
      aria-hidden="true"
    >
      {Array.from({ length: 10 }, (_, index) => (
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
      className={`fw-card-pass relative overflow-hidden w-full [padding:25px_25px_20px] text-[#fff] [border:1px_solid_rgb(255_255_255_/_48%)] rounded-[26px] [box-sizing:border-box]${complete ? " fw-card-pass-complete [border-color:#ffe298]" : ""}`}
      role="group"
      aria-label={`Tarjeta de ejemplo de Café Esquina: ${stamps} de 10 sellos`}
    >
      <div
        className="fw-card-sheen absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />
      <div className="fw-card-pass-top">
        <div className="fw-card-brand justify-start gap-[9px] text-[9px] tracking-[0.13em] leading-[1.5]">
          <span className="fw-card-brand-mark grid place-items-center w-[35px] h-[35px] [border:1px_solid_rgb(255_255_255_/_45%)] rounded-full">
            <CoffeeIcon aria-hidden="true" />
          </span>
          <span>
            CAFÉ
            <br />
            <strong>ESQUINA.</strong>
          </span>
        </div>
        <span className="fw-card-member text-[#dff1ff] text-[7px] font-semibold tracking-[0.12em] leading-[1.7] text-right">
          BUEN CAFÉ.
          <br />
          MEJORES RECOMPENSAS.
        </span>
      </div>

      <div className="fw-card-reward-copy [margin:24px_0_20px]">
        <span className="fw-card-eyebrow text-[#d8efff] text-[8px] font-semibold tracking-[0.2em]">
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
      <div className="fw-card-progress-copy [margin:17px_0_8px] text-[#dff1ff] text-[9px]">
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
        className="fw-card-progress overflow-hidden h-[3px] rounded-[3px]"
        aria-hidden="true"
      >
        <motion.span
          animate={{ width: `${stamps * 10}%` }}
          transition={{ duration: motionAllowed ? 0.35 : 0 }}
        />
      </div>

      <div className="fw-card-pass-bottom mt-[18px] text-[8px] text-[#d7eaf8]">
        <span>
          hecho con <strong>fidelity</strong>
          <span className="fw-card-brand-dot text-[#ffd371] text-[15px]">
            .
          </span>
        </span>
        <span
          className="fw-card-barcode w-[60px] h-[17px] opacity-[0.72]"
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
      className={`fw-card-chip absolute z-[3] flex items-center gap-[10px] [padding:13px_17px] [border:1px_solid_var(--fw-border,_rgb(255_255_255_/_80%))] rounded-[15px] text-[color:var(--fw-text,_#2f4557)] pointer-events-none fw-card-chip-visit top-[20%] right-[-1%]${complete ? " fw-card-chip-reward [border-color:#d69e09] text-[#624409]" : ""}`}
      initial={false}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
      transition={{ duration: motionAllowed ? 0.4 : 0 }}
      aria-hidden="true"
    >
      <span className="fw-card-chip-icon grid place-items-center w-[34px] h-[34px] rounded-[10px] text-[#a36b00]">
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
      className="fw-card-chip absolute z-[3] flex items-center gap-[10px] [padding:13px_17px] [border:1px_solid_var(--fw-border,_rgb(255_255_255_/_80%))] rounded-[15px] text-[color:var(--fw-text,_#2f4557)] pointer-events-none fw-card-chip-wallet bottom-[8%] left-0"
      initial={false}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
      transition={{
        duration: motionAllowed ? 0.4 : 0,
        delay: motionAllowed ? 0.15 : 0,
      }}
      aria-hidden="true"
    >
      <span className="fw-card-wallet-icon relative block w-[28px] h-[24px] overflow-hidden rounded-[5px]">
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
      <span className="fw-card-celebration-halo absolute [left:calc(50%_-_90px)] [top:calc(52%_-_90px)] w-[180px] h-[180px] [border:2px_solid_rgb(214_158_9_/_55%)] rounded-full" />
      {PARTICLES.map((style, index) => (
        <span
          className="fw-card-particle absolute left-[50%] top-[52%] w-[6px] h-[11px] rounded-[2px]"
          key={index}
          style={style}
        />
      ))}
    </div>
  );
}
