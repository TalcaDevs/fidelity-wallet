import { usePageVisibility } from "./usePageVisibility";
import { getEntranceKeyframes } from "../models/loyaltyCardMotion";
import { ENTRANCE_FALLBACK_MS, ENTRANCE_OPTIONS } from "../constants/loyaltyCardMotion.constants.ts";
import type { LoyaltyCardStageProps, StampBurst } from "../types/loyaltyCard.types.ts";
import { STAMP_INTERVAL_MS, STARTING_STAMPS, REWARD_STAMPS, STAMP_BURST_MS, REWARD_BURST_MS, CARD_VISIBILITY_THRESHOLD, CARD_TILT_SPRING } from "../constants/loyaltyCard.constants.ts";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  useAnimate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

export function useLoyaltyCard({
  onReady,
  replayKey,
  motionPaused = false,
}: LoyaltyCardStageProps) {
  const reduceMotion = useReducedMotion();
  const [stamps, setStamps] = useState(STARTING_STAMPS);
  const [mode, setMode] = useState<"auto" | "manual">(
    reduceMotion ? "manual" : "auto",
  );
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(
    typeof IntersectionObserver === "undefined",
  );
  const documentVisible = usePageVisibility();
  const [burst, setBurst] = useState<StampBurst | null>(
    null,
  );
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const stageRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const entranceFinishRef = useRef<(() => void) | null>(null);
  const motionPolicyRef = useRef({
    reduced: Boolean(reduceMotion),
    paused: motionPaused,
  });
  const remainingTickRef = useRef(STAMP_INTERVAL_MS);
  const burstSequenceRef = useRef(0);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, CARD_TILT_SPRING);
  const rotateY = useSpring(tiltY, CARD_TILT_SPRING);
  const motionAllowed =
    !reduceMotion && !motionPaused && inView && documentVisible;
  const complete = stamps === REWARD_STAMPS;
  const autoRunning = mode === "auto" && ready && !complete && motionAllowed;

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    motionPolicyRef.current = {
      reduced: Boolean(reduceMotion),
      paused: motionPaused,
    };
    if (reduceMotion || motionPaused) entranceFinishRef.current?.();
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize playback with the OS motion preference.
    if (reduceMotion) setMode("manual");
  }, [reduceMotion, motionPaused]);

  useEffect(() => {
    const stage = stageRef.current;
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { threshold: CARD_VISIBILITY_THRESHOLD },
          );
    if (stage) observer?.observe(stage);
    return () => {
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (motionAllowed) return;
    // oxlint-disable-next-line react/set-state-in-effect -- Discard interrupted particles before playback resumes.
    setBurst(null);
    tiltX.jump(0);
    tiltY.jump(0);
    rotateX.jump(0);
    rotateY.jump(0);
  }, [motionAllowed, tiltX, tiltY, rotateX, rotateY]);

  useEffect(() => {
    const card = scope.current;
    const stage = stageRef.current;
    if (!card || !stage) return;

    let cancelled = false;
    let completed = false;
    let entrance: ReturnType<typeof animate> | undefined;
    let fallbackTimer: number | undefined;
    setStamps(STARTING_STAMPS);
    setMode(motionPolicyRef.current.reduced ? "manual" : "auto");
    setBurst(null);
    remainingTickRef.current = STAMP_INTERVAL_MS;
    setReady(false);
    card.removeAttribute("data-animation-fallback");

    function complete(forceVisible = false) {
      if (cancelled || completed) return;
      completed = true;
      window.clearTimeout(fallbackTimer);
      if (forceVisible) {
        entrance?.stop();
        card.setAttribute("data-animation-fallback", "true");
      }
      setReady(true);
      onReadyRef.current();
    }

    const finishImmediately = () => complete(true);
    entranceFinishRef.current = finishImmediately;

    function cleanup() {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      entrance?.stop();
      if (entranceFinishRef.current === finishImmediately)
        entranceFinishRef.current = null;
    }

    if (motionPolicyRef.current.reduced || motionPolicyRef.current.paused) {
      finishImmediately();
      return cleanup;
    }

    // Also unlock the demonstration if the browser cannot complete an animation.
    fallbackTimer = window.setTimeout(() => complete(true), ENTRANCE_FALLBACK_MS);
    try {
      entrance = animate(
        card,
        getEntranceKeyframes({ viewportWidth: document.documentElement.clientWidth, stageWidth: stage.getBoundingClientRect().width }),
        ENTRANCE_OPTIONS,
      );
      void Promise.resolve(entrance).then(
        () => complete(),
        () => complete(true),
      );
    } catch {
      complete(true);
    }

    return cleanup;
  }, [animate, replayKey, scope]);

  const addStamp = useCallback(() => {
    if (stamps >= REWARD_STAMPS) return;
    const nextStamp = stamps + 1;
    setStamps(nextStamp);
    if (motionAllowed)
      setBurst({ stamp: nextStamp, id: ++burstSequenceRef.current });
  }, [motionAllowed, stamps]);

  useEffect(() => {
    if (!autoRunning) return;
    const startedAt = performance.now();
    const remaining = remainingTickRef.current;
    let delivered = false;
    const timer = window.setTimeout(() => {
      delivered = true;
      remainingTickRef.current = STAMP_INTERVAL_MS;
      addStamp();
    }, remaining);
    return () => {
      window.clearTimeout(timer);
      if (!delivered)
        remainingTickRef.current = Math.max(
          1,
          remaining - (performance.now() - startedAt),
        );
    };
  }, [addStamp, autoRunning, replayKey]);

  useEffect(() => {
    if (!burst || !motionAllowed) return;
    const timer = window.setTimeout(
      () => setBurst(null),
      burst.stamp === REWARD_STAMPS ? REWARD_BURST_MS : STAMP_BURST_MS,
    );
    return () => window.clearTimeout(timer);
  }, [burst, motionAllowed]);

  function startManualDemo() {
    remainingTickRef.current = STAMP_INTERVAL_MS;
    setMode("manual");
    setStamps(STARTING_STAMPS);
    setBurst(null);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (
      !ready ||
      !motionAllowed ||
      event.pointerType !== "mouse" ||
      !window.matchMedia("(pointer: fine)").matches
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    tiltX.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * 12);
    tiltY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 14);
  }

  function resetTilt() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return {
    stamps,
    mode,
    ready,
    complete,
    autoRunning,
    burst,
    motionAllowed,
    scope,
    stageRef,
    rotateX,
    rotateY,
    handlePointerMove,
    resetTilt,
    startManualDemo,
    addStamp,
  };
}
