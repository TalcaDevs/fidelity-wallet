import { useCallback, useEffect, useRef } from 'react';
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
import { useActivityListeners } from './useActivityListeners';

export * from '../utils/sessionActivity';
export { ACTIVITY_EVENTS, useActivityListeners } from './useActivityListeners';
export type { UseActivityListenersOptions } from './useActivityListeners';

export interface UseInactivityTimeoutOptions {
  onTimeout: () => void | Promise<void>;
  timeoutMs?: number;
  storageKey?: string;
  checkIntervalMs?: number;
  throttleMs?: number;
  onActivity?: () => void | Promise<void>;
}

export function useInactivityTimeout(
  session: unknown | null,
  options: UseInactivityTimeoutOptions,
) {
  const {
    timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    storageKey = ACTIVITY_STORAGE_KEY,
    checkIntervalMs = INACTIVITY_CHECK_INTERVAL_MS,
    throttleMs = ACTIVITY_THROTTLE_MS,
    onTimeout,
    onActivity,
  } = options;

  const isSessionActive = Boolean(session);
  const lastRecordedRef = useRef<number | null>(null);
  const isTerminatingRef = useRef(false);

  const onTimeoutRef = useRef(onTimeout);
  const onActivityRef = useRef(onActivity);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    onActivityRef.current = onActivity;
  }, [onTimeout, onActivity]);

  const recordUserActivity = useCallback(() => {
    isTerminatingRef.current = false;
    const now = Date.now();
    lastRecordedRef.current = now;
    setLastActivity(now, storageKey);
    if (onActivityRef.current) {
      void onActivityRef.current();
    }
  }, [storageKey]);

  useActivityListeners({
    enabled: isSessionActive,
    throttleMs,
    onActivity: recordUserActivity,
  });

  useEffect(() => {
    if (!isSessionActive) {
      clearLastActivity(storageKey);
      lastRecordedRef.current = null;
      return;
    }

    const existing = getLastActivity(storageKey);
    const now = Date.now();
    if (!existing || existing > now + 60000) {
      setLastActivity(now, storageKey);
      lastRecordedRef.current = now;
    } else {
      lastRecordedRef.current = existing;
    }

    const performTimeout = async () => {
      if (isTerminatingRef.current) return;
      isTerminatingRef.current = true;
      setLogoutReason('inactivity');
      clearLastActivity(storageKey);
      lastRecordedRef.current = null;
      await onTimeoutRef.current();
    };

    const checkTimeout = () => {
      if (isTerminatingRef.current) return;
      const currentLast = getLastActivity(storageKey) ?? lastRecordedRef.current;
      if (!currentLast) return;
      if (Date.now() - currentLast >= timeoutMs) {
        void performTimeout();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      if (!e.newValue) {
        lastRecordedRef.current = null;
        return;
      }
      const parsed = Number.parseInt(e.newValue, 10);
      if (Number.isFinite(parsed)) {
        lastRecordedRef.current = parsed;
        isTerminatingRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };

    checkTimeout();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkTimeout);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(checkTimeout, checkIntervalMs);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [isSessionActive, timeoutMs, storageKey, checkIntervalMs]);
}
