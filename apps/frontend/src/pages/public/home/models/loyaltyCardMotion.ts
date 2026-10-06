import type { EntranceGeometry } from "../types/loyaltyCardMotion.types.ts";
import { MOBILE_VIEWPORT_WIDTH } from "../constants/loyaltyCardMotion.constants.ts";

export function getEntranceKeyframes({ viewportWidth, stageWidth }: EntranceGeometry) {
  const small = viewportWidth < MOBILE_VIEWPORT_WIDTH;
  const start = small ? -viewportWidth * 0.8 : -Math.min(viewportWidth * 0.73, 1080);
  const right = small ? Math.min(stageWidth * 0.16, 56) : 50;
  const left = small ? -25 : -Math.min(stageWidth * 0.35, 190);
  return { opacity: [0, 1, 1, 1, 1], x: [start, right, left, 16, 0], y: [-35, 24, -16, 5, 0], rotate: [-24, 12, -12, -2, -5], scale: [0.8, 1.02, 0.97, 1.01, 1] };
}
