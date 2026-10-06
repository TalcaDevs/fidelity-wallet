import { motion } from "motion/react";
import { useLoyaltyCard, type LoyaltyCardStageProps } from "./useLoyaltyCard";
import {
  CardPass,
  CardCelebration,
  VisitChip,
  WalletChip,
} from "./LoyaltyCardVisuals";
import { LoyaltyCardControls } from "./LoyaltyCardControls";
import "./LoyaltyCardStage.css";

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
  const celebrating = demo.burst?.stamp === 10 && demo.motionAllowed;
  return (
    <div
      className="fw-card-stage"
      ref={stageRef}
      data-motion-active={demo.motionAllowed}
      data-celebrating={celebrating}
    >
      <div className="fw-card-scene">
        <div className="fw-card-orbit fw-card-orbit-outer" aria-hidden="true" />
        <div className="fw-card-orbit fw-card-orbit-inner" aria-hidden="true" />
        <div className="fw-card-glow" aria-hidden="true" />
        <CardCelebration
          burst={demo.burst}
          motionAllowed={demo.motionAllowed}
        />
        <motion.div
          ref={scope}
          className="fw-card-flight"
          initial={{ opacity: 0 }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
        >
          <motion.div
            className="fw-card-tilt"
            style={{
              rotateX: demo.motionAllowed ? rotateX : 0,
              rotateY: demo.motionAllowed ? rotateY : 0,
            }}
          >
            <div
              className="fw-card-stack fw-card-stack-back"
              aria-hidden="true"
            />
            <div
              className="fw-card-stack fw-card-stack-middle"
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
