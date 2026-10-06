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
      className="fw-card-stage relative flex flex-col items-center gap-[12px] w-full min-w-0 isolate"
      ref={stageRef}
      data-motion-active={demo.motionAllowed}
      data-celebrating={celebrating}
    >
      <div className="fw-card-scene relative grid place-items-center w-full min-w-0 [padding:48px_0_38px] [box-sizing:border-box]">
        <div
          className="fw-card-orbit absolute top-[46%] left-[50%] z-[-1] [width:min(100%,_520px)] aspect-[1] [border:1px_solid_rgb(8_123_215_/_11%)] rounded-full pointer-events-none fw-card-orbit-outer"
          aria-hidden="true"
        />
        <div
          className="fw-card-orbit absolute top-[46%] left-[50%] z-[-1] [width:min(100%,_520px)] aspect-[1] [border:1px_solid_rgb(8_123_215_/_11%)] rounded-full pointer-events-none fw-card-orbit-inner [width:min(79%,_410px)] [border-style:dashed] [border-color:#087bd719]"
          aria-hidden="true"
        />
        <div
          className="fw-card-glow absolute [inset:9%_0_15%] z-[-2] rounded-full pointer-events-none"
          aria-hidden="true"
        />
        <CardCelebration
          burst={demo.burst}
          motionAllowed={demo.motionAllowed}
        />
        <motion.div
          ref={scope}
          className="fw-card-flight relative z-[2] [width:min(75%,_366px)]"
          initial={{ opacity: 0 }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
        >
          <motion.div
            className="fw-card-tilt relative"
            style={{
              rotateX: demo.motionAllowed ? rotateX : 0,
              rotateY: demo.motionAllowed ? rotateY : 0,
            }}
          >
            <div
              className="fw-card-stack absolute inset-0 rounded-[26px] [border:1px_solid_rgb(255_255_255_/_34%)] fw-card-stack-back"
              aria-hidden="true"
            />
            <div
              className="fw-card-stack absolute inset-0 rounded-[26px] [border:1px_solid_rgb(255_255_255_/_34%)] fw-card-stack-middle"
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
