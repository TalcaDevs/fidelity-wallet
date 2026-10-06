import type { useLoyaltyCard } from "../hooks/useLoyaltyCard";
export type LoyaltyCardStageProps = {
  onReady: () => void;
  replayKey: number;
  motionPaused?: boolean;
};

export type LoyaltyCardState = ReturnType<typeof useLoyaltyCard>;

export interface StampBurst {
  stamp: number;
  id: number;
}
