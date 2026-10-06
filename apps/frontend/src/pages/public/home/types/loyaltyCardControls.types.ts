import type { LoyaltyCardState } from "./loyaltyCard.types.ts";
export type DemoState = Pick<
  LoyaltyCardState,
  | "mode"
  | "complete"
  | "ready"
  | "autoRunning"
  | "stamps"
  | "startManualDemo"
  | "addStamp"
>;
