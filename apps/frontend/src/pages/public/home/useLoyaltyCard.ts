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
export type LoyaltyCardStageProps = {
  onReady: () => void;
  replayKey: number;
  motionPaused?: boolean;
};

const STAMP_INTERVAL_MS = 700;
const STARTING_STAMPS = 2;
const REWARD_STAMPS = 10;
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
  const [documentVisible, setDocumentVisible] = useState(
    () => !document.hidden,
  );
  const [burst, setBurst] = useState<{ stamp: number; id: number } | null>(
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
  const rotateX = useSpring(tiltX, { stiffness: 150, damping: 24 });
  const rotateY = useSpring(tiltY, { stiffness: 150, damping: 24 });
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
            { threshold: 0.15 },
          );
    if (stage) observer?.observe(stage);
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
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

    const stageBounds = stage.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const isSmall = viewportWidth < 768;
    const startX = isSmall
      ? -viewportWidth * 0.8
      : -Math.min(viewportWidth * 0.73, 1080);
    const rightBounce = isSmall ? Math.min(stageBounds.width * 0.16, 56) : 50;
    const leftBounce = isSmall ? -25 : -Math.min(stageBounds.width * 0.35, 190);

    // Also unlock the demonstration if the browser cannot complete an animation.
    fallbackTimer = window.setTimeout(() => complete(true), 3000);
    try {
      entrance = animate(
        card,
        {
          opacity: [0, 1, 1, 1, 1],
          x: [startX, rightBounce, leftBounce, 16, 0],
          y: [-35, 24, -16, 5, 0],
          rotate: [-24, 12, -12, -2, -5],
          scale: [0.8, 1.02, 0.97, 1.01, 1],
        },
        {
          duration: 2.1,
          times: [0, 0.44, 0.71, 0.89, 1],
          ease: "easeInOut",
        },
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
      burst.stamp === REWARD_STAMPS ? 1500 : 650,
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
export type LoyaltyCardState = ReturnType<typeof useLoyaltyCard>;
