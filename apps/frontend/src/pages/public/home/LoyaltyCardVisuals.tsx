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

function CoffeeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8ZM17 9h1a3 3 0 1 1 0 6h-1M4 22h15M8 2v3m4-3v3m4-3v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11h16v10H4V11ZM3 7h18v4H3V7Zm9 0v14M12 7H8a2.5 2.5 0 1 1 2.4-3.2L12 7Zm0 0h4a2.5 2.5 0 1 0-2.4-3.2L12 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m12 3 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  if (index === 9) return <GiftIcon />;
  if (filled) return <CoffeeIcon />;
  return <span>{String(index + 1).padStart(2, "0")}</span>;
}

function StampBurst() {
  return (
    <span className="fw-card-stamp-burst">
      <span className="fw-card-stamp-ring" />
      {Array.from({ length: 8 }, (_, spark) => (
        <span
          className="fw-card-stamp-spark"
          key={spark}
          style={{ "--fw-spark-angle": spark * 45 + "deg" } as CSSProperties}
        />
      ))}
    </span>
  );
}

function stampClassName(filled: boolean, last: boolean, landing: boolean) {
  return [
    "fw-card-stamp",
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
    <div className="fw-card-stamps" aria-hidden="true">
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
      className={`fw-card-pass${complete ? " fw-card-pass-complete" : ""}`}
      role="group"
      aria-label={`Tarjeta de ejemplo de Café Esquina: ${stamps} de 10 sellos`}
    >
      <div className="fw-card-sheen" aria-hidden="true" />
      <div className="fw-card-pass-top">
        <div className="fw-card-brand">
          <span className="fw-card-brand-mark">
            <CoffeeIcon />
          </span>
          <span>
            CAFÉ
            <br />
            <strong>ESQUINA.</strong>
          </span>
        </div>
        <span className="fw-card-member">
          BUEN CAFÉ.
          <br />
          MEJORES RECOMPENSAS.
        </span>
      </div>

      <div className="fw-card-reward-copy">
        <span className="fw-card-eyebrow">
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
      <div className="fw-card-progress-copy">
        <span>
          <strong>{stamps}</strong> / 10 sellos
        </span>
        <span>
          {stamps === 10
            ? "¡Tu café te espera!"
            : `${10 - stamps} para tu recompensa`}
        </span>
      </div>
      <div className="fw-card-progress" aria-hidden="true">
        <motion.span
          animate={{ width: `${stamps * 10}%` }}
          transition={{ duration: motionAllowed ? 0.35 : 0 }}
        />
      </div>

      <div className="fw-card-pass-bottom">
        <span>
          hecho con <strong>fidelity</strong>
          <span className="fw-card-brand-dot">.</span>
        </span>
        <span className="fw-card-barcode" aria-hidden="true" />
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
      className={`fw-card-chip fw-card-chip-visit${complete ? " fw-card-chip-reward" : ""}`}
      initial={false}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
      transition={{ duration: motionAllowed ? 0.4 : 0 }}
      aria-hidden="true"
    >
      <span className="fw-card-chip-icon">
        {complete ? <GiftIcon /> : <StarIcon />}
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
      className="fw-card-chip fw-card-chip-wallet"
      initial={false}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
      transition={{
        duration: motionAllowed ? 0.4 : 0,
        delay: motionAllowed ? 0.15 : 0,
      }}
      aria-hidden="true"
    >
      <span className="fw-card-wallet-icon">
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
    <div className="fw-card-celebration" key={burst.id} aria-hidden="true">
      <span className="fw-card-celebration-halo" />
      {PARTICLES.map((style, index) => (
        <span className="fw-card-particle" key={index} style={style} />
      ))}
    </div>
  );
}
