import { useEffect, type PointerEvent } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { CARD_TILT_SPRING } from "../constants/loyaltyCard.constants";
export function useCardTilt(ready: boolean, motionAllowed: boolean) {
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, CARD_TILT_SPRING);
  const rotateY = useSpring(tiltY, CARD_TILT_SPRING);
  useEffect(() => {
    if (motionAllowed) return;
    tiltX.jump(0);
    tiltY.jump(0);
    rotateX.jump(0);
    rotateY.jump(0);
  }, [motionAllowed, tiltX, tiltY, rotateX, rotateY]);
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (
      !ready ||
      !motionAllowed ||
      event.pointerType !== "mouse" ||
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(pointer: fine)").matches
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    tiltX.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * 12);
    tiltY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 14);
  }
  function resetTilt() {
    tiltX.set(0);
    tiltY.set(0);
  }
  return { rotateX, rotateY, handlePointerMove, resetTilt };
}
