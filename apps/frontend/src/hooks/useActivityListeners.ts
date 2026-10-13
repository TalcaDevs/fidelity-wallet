import { useEffect, useRef } from 'react';
import { ACTIVITY_THROTTLE_MS } from '../utils/sessionActivity';

export const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'mousemove',
] as const;

export interface UseActivityListenersOptions {
  enabled: boolean;
  throttleMs?: number;
  onActivity: () => void;
}

export function useActivityListeners({
  enabled,
  throttleMs = ACTIVITY_THROTTLE_MS,
  onActivity,
}: UseActivityListenersOptions): void {
  const onActivityRef = useRef(onActivity);
  const lastCallRef = useRef<number>(Date.now());

  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  useEffect(() => {
    if (!enabled) return;

    lastCallRef.current = Date.now();

    const handleEvent = () => {
      const now = Date.now();
      if (now - lastCallRef.current >= throttleMs) {
        lastCallRef.current = now;
        onActivityRef.current();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [enabled, throttleMs]);
}
