import { useCallback, useEffect, useState } from "react";
import { INTRO_FALLBACK_MS } from "../constants/homeMotion.constants.ts";

export function useHomeIntro() {
  const [introReady, setIntroReady] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const onCardReady = useCallback(() => setIntroReady(true), []);
  useEffect(() => {
    const timer = window.setTimeout(onCardReady, INTRO_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [onCardReady, replayKey]);
  const replay = useCallback(() => {
    setIntroReady(false);
    setReplayKey((key) => key + 1);
  }, []);
  return { introReady, replayKey, onCardReady, replay };
}
