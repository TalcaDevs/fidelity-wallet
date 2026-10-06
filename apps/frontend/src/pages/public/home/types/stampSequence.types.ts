import type { StampBurst } from "./loyaltyCard.types";
export interface StampSequenceState {
  stamps: number;
  burst: StampBurst | null;
  sequence: number;
}
export type StampSequenceAction =
  | { type: "add"; motionAllowed: boolean }
  | { type: "reset" }
  | { type: "clearBurst" };
