import type { LoyaltyCardState } from "./loyaltyCard.types.ts";
export type CardProps = Pick<
  LoyaltyCardState,
  "stamps" | "complete" | "burst" | "motionAllowed"
>;

export type StampProps = Pick<CardProps, "stamps" | "burst" | "motionAllowed">;

export type ChipProps = Pick<
  LoyaltyCardState,
  "stamps" | "complete" | "ready" | "motionAllowed"
>;
