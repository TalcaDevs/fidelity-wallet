import { REWARD_STAMPS } from "../constants/loyaltyCard.constants.ts";
import { motion } from "motion/react";
import { useLoyaltyCard } from "../hooks/useLoyaltyCard";
import type { LoyaltyCardStageProps } from "../types/loyaltyCard.types.ts";
import { CardPass } from "./LoyaltyCardVisuals";
import { VisitChip } from "./VisitChip";
import { WalletChip } from "./WalletChip";
import { CardCelebration } from "./CardCelebration";
import { LoyaltyCardControls } from "./LoyaltyCardControls";

export function LoyaltyCardStage(props: LoyaltyCardStageProps) {
  const {
    scope,
    stageRef,
    rotateX,
    rotateY,
    handlePointerMove,
    resetTilt,
    ...demo
  } = useLoyaltyCard(props);
  const celebrating = demo.burst?.stamp === REWARD_STAMPS && demo.motionAllowed;
  return (
    <div
      className={`
        fw-card-stage [&[data-motion-active=false]_.fw-card-pass]:[transition:none]
        [&[data-motion-active=false]_.fw-card-demo-button]:[transition:none]
        [&[data-motion-active=false]_.fw-card-stamp-landing]:[animation:none]
        [&[data-motion-active=false]_.fw-card-stamp-ring]:[animation:none]
        [&[data-motion-active=false]_.fw-card-stamp-spark]:[animation:none]
        [&[data-motion-active=false]_.fw-card-particle]:[animation:none]
        [&[data-motion-active=false]_.fw-card-celebration-halo]:[animation:none]
        [&[data-motion-active=false]_.fw-card-chip-reward]:[animation:none] relative flex flex-col
        items-center gap-[12px] w-full min-w-0 isolate max-[767.001px]:max-w-[510px]
        max-[767.001px]:[margin-inline:auto]
      `}
      ref={stageRef}
      data-motion-active={demo.motionAllowed}
      data-celebrating={celebrating}
    >
      <div
        className={`
        fw-card-scene relative grid place-items-center w-full min-w-0 p-[48px_0_38px] box-border
        [perspective:1200px] max-[767.001px]:pt-[40px]
      `}
      >
        <div
          className={`
        fw-card-orbit [&::before]:absolute [&::before]:w-[6px] [&::before]:h-[6px] [&::before]:top-[20%]
        [&::before]:left-[10%] [&::before]:rounded-full [&::before]:[opacity:0.35]
        [&::before]:[content:''] [&::before]:[background:#087bd7]
        [&::before]:[box-shadow:0_0_0_5px_#087bd70b] absolute top-[46%] left-[50%] z-[-1]
        w-[min(100%,_520px)] aspect-[1] [border:1px_solid_rgb(8_123_215_/_11%)] rounded-full
        pointer-events-none fw-card-orbit-outer [transform:translate(-50%,_-50%)]
        [animation:fw-hero-ring_43s_linear_infinite]
      `}
          aria-hidden="true"
        />
        <div
          className={`
        fw-card-orbit [&::before]:absolute [&::before]:w-[6px] [&::before]:h-[6px] [&::before]:top-[20%]
        [&::before]:left-[10%] [&::before]:rounded-full [&::before]:[opacity:0.35]
        [&::before]:[content:''] [&::before]:[background:#087bd7]
        [&::before]:[box-shadow:0_0_0_5px_#087bd70b] absolute top-[46%] left-[50%] z-[-1] aspect-[1]
        [border:1px_solid_rgb(8_123_215_/_11%)] rounded-full pointer-events-none fw-card-orbit-inner
        [&::before]:top-[60%] [&::before]:left-[0] [&::before]:w-[4px] [&::before]:h-[4px]
        [&::before]:[background:#d69e09] [transform:translate(-50%,_-50%)] [border-style:dashed]
        [border-color:#087bd719] [animation:fw-hero-ring-inner_35s_linear_infinite_reverse]
        w-[min(79%,_410px)]
      `}
          aria-hidden="true"
        />
        <div
          className={`
        fw-card-glow absolute [inset:9%_0_15%] z-[-2] rounded-full pointer-events-none
        [animation:fw-glow-breathe_11s_ease-in-out_infinite_alternate]
        [background:radial-gradient(_ellipse,_rgb(8_123_215_/_18%),_rgb(8_123_215_/_3%)_59%,_transparent_71%_)]
        [filter:blur(8px)]
      `}
          aria-hidden="true"
        />
        <CardCelebration
          burst={demo.burst}
          motionAllowed={demo.motionAllowed}
        />
        <motion.div
          ref={scope}
          className={`
        fw-card-flight [&[data-animation-fallback]]:opacity-100!
        [&[data-animation-fallback]]:[transform:rotate(-5deg)]! relative z-[2] w-[min(75%,_366px)]
        [transform-origin:center] [perspective:1200px] min-[768px]:max-[1100.001px]:w-[min(81%,_340px)]
        max-[767.001px]:w-[min(74%,_330px)] max-[390.001px]:w-[80%]
      `}
          initial={{ opacity: 0 }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
        >
          <motion.div
            className="fw-card-tilt relative [transform-style:preserve-3d]"
            style={{
              rotateX: demo.motionAllowed ? rotateX : 0,
              rotateY: demo.motionAllowed ? rotateY : 0,
            }}
          >
            <div
              className={`
        fw-card-stack absolute inset-0 rounded-[26px] [border:1px_solid_rgb(255_255_255_/_34%)]
        fw-card-stack-back [box-shadow:0_20px_30px_-20px_rgb(47_69_87_/_36%)]
        max-[767.001px]:rounded-[22px] [background:linear-gradient(145deg,_#d69e09,_#eaba39_65%,_#d66409)]
        [transform:translate(12px,_-13px)_rotate(11deg)_translateZ(-12px)]
      `}
              aria-hidden="true"
            />
            <div
              className={`
        fw-card-stack absolute inset-0 rounded-[26px] [border:1px_solid_rgb(255_255_255_/_34%)]
        fw-card-stack-middle [box-shadow:0_20px_30px_-20px_rgb(47_69_87_/_36%)]
        max-[767.001px]:rounded-[22px] [background:linear-gradient(140deg,_#3d617a,_#2f4557)]
        [transform:translate(1px,_-7px)_rotate(5deg)_translateZ(-6px)]
      `}
              aria-hidden="true"
            />
            <CardPass
              stamps={demo.stamps}
              complete={demo.complete}
              burst={demo.burst}
              motionAllowed={demo.motionAllowed}
            />
          </motion.div>
        </motion.div>
        <VisitChip
          stamps={demo.stamps}
          complete={demo.complete}
          ready={demo.ready}
          motionAllowed={demo.motionAllowed}
        />
        <WalletChip ready={demo.ready} motionAllowed={demo.motionAllowed} />
      </div>
      <LoyaltyCardControls demo={demo} />
    </div>
  );
}
