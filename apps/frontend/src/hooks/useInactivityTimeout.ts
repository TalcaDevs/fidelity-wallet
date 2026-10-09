import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  ACTIVITY_STORAGE_KEY,
  ACTIVITY_THROTTLE_MS,
  clearLastActivity,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  getLastActivity,
  INACTIVITY_CHECK_INTERVAL_MS,
  setLastActivity,
  setLogoutReason,
} from '../utils/sessionActivity';

export * from '../utils/sessionActivity';

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'mousemove',
] as const;

export interface UseInactivityTimeoutOptions {
  timeoutMs?: number;
  storageKey?: string;
  checkIntervalMs?: number;
  throttleMs?: number;
  onTimeout?: () => void | Promise<void>;
  onActivity?: () => void | Promise<void>;
}

export function useInactivityTimeout(
  session: Session | null,
  options: UseInactivityTimeoutOptions = {},
) {
  const {
    timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    storageKey = ACTIVITY_STORAGE_KEY,
    checkIntervalMs = INACTIVITY_CHECK_INTERVAL_MS,
    throttleMs = ACTIVITY_THROTTLE_MS,
    onTimeout,
    onActivity,
  } = options;

  const onTimeoutRef = useRef(onTimeout);
  const onActivityRef = useRef(onActivity);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    onActivityRef.current = onActivity;
  }, [onTimeout, onActivity]);

  useEffect(() => {
    if (!session) {
      clearLastActivity(storageKey);
      return;
    }

    const existing = getLastActivity(storageKey);
    const now = Date.now();
    if (!existing || existing > now + 60000) {
      setLastActivity(now, storageKey);
    }

    let lastRecordedActivity = existing ?? now;
    let isTerminating = false;

    const performTimeout = async () => {
      if (isTerminating) return;
      isTerminating = true;
      setLogoutReason('inactivity');
      clearLastActivity(storageKey);
      if (onTimeoutRef.current) {
        await onTimeoutRef.current();
      } else {
        await supabase.auth.signOut();
      }
    };

    const checkTimeout = () => {
      if (isTerminating) return;
      const currentLast = getLastActivity(storageKey) ?? lastRecordedActivity;
      if (Date.now() - currentLast >= timeoutMs) {
        void performTimeout();
      }
    };

    checkTimeout();

    const recordUserActivity = () => {
      isTerminating = false;
      const currentTime = Date.now();
      if (currentTime - lastRecordedActivity >= throttleMs) {
        lastRecordedActivity = currentTime;
        setLastActivity(currentTime, storageKey);
        if (onActivityRef.current) {
          void onActivityRef.current();
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const parsed = Number.parseInt(e.newValue, 10);
        if (Number.isFinite(parsed)) {
          lastRecordedActivity = parsed;
          isTerminating = false;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, recordUserActivity, { passive: true });
    });

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkTimeout);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(checkTimeout, checkIntervalMs);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, recordUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [session, timeoutMs, storageKey, checkIntervalMs, throttleMs]);
}
