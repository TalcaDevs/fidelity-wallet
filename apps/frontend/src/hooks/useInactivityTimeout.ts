import { useCallback, useEffect, useRef } from 'react';
import {
  ACTIVITY_STORAGE_KEY,
  ACTIVITY_THROTTLE_MS,
  clearLastActivity,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  getLastActivity,
  INACTIVITY_CHECK_INTERVAL_MS,
  isSessionInactive,
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
  enabled?: boolean;
  isInactive?: (timeoutMs?: number, storageKey?: string, now?: number) => boolean;
}

export interface InactivityTimeoutCoordinator {
  checkTimeout: () => boolean;
  isTerminating: () => boolean;
}

export function useInactivityTimeout(
  session: unknown | null,
  options: UseInactivityTimeoutOptions,
): InactivityTimeoutCoordinator {
  const {
    timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    storageKey = ACTIVITY_STORAGE_KEY,
    checkIntervalMs = INACTIVITY_CHECK_INTERVAL_MS,
    throttleMs = ACTIVITY_THROTTLE_MS,
    onTimeout,
    onActivity,
    enabled,
    isInactive = isSessionInactive,
  } = options;

  const isSessionActive = enabled ?? Boolean(session);
  const isSessionActiveRef = useRef(isSessionActive);
  isSessionActiveRef.current = isSessionActive;

  const lastRecordedRef = useRef<number | null>(null);
  const isTerminatingRef = useRef(false);
  const terminatingPromiseRef = useRef<Promise<void> | null>(null);
  const prevActiveRef = useRef(false);
  const checkedBeforeMountEffectRef = useRef(false);

  const onTimeoutRef = useRef(onTimeout);
  const onActivityRef = useRef(onActivity);
  const isInactiveRef = useRef(isInactive);

  onTimeoutRef.current = onTimeout;
  onActivityRef.current = onActivity;
  isInactiveRef.current = isInactive;

  const hasActivityExpired = useCallback(
    (now = Date.now()): boolean => {
      if (isInactiveRef.current(timeoutMs, storageKey, now)) {
        return true;
      }
      const currentLast = getLastActivity(storageKey) ?? lastRecordedRef.current;
      if (currentLast === null) return false;
      return now - currentLast >= timeoutMs;
    },
    [timeoutMs, storageKey],
  );

  const performTimeout = useCallback((): Promise<void> => {
    if (isTerminatingRef.current) {
      return terminatingPromiseRef.current ?? Promise.resolve();
    }
    isTerminatingRef.current = true;
    setLogoutReason('inactivity');

    const finalizeSuccess = () => {
      clearLastActivity(storageKey);
      lastRecordedRef.current = null;
      terminatingPromiseRef.current = null;
      if (!isSessionActiveRef.current) {
        isTerminatingRef.current = false;
      }
    };

    const finalizeFailure = () => {
      isTerminatingRef.current = false;
      terminatingPromiseRef.current = null;
    };

    try {
      const result = onTimeoutRef.current();
      if (result && typeof (result as Promise<void>).then === 'function') {
        const promise = (result as Promise<void>).then(
          () => {
            finalizeSuccess();
          },
          () => {
            finalizeFailure();
          },
        );
        terminatingPromiseRef.current = promise;
        return promise;
      }
      finalizeSuccess();
      return Promise.resolve();
    } catch {
      finalizeFailure();
      return Promise.resolve();
    }
  }, [storageKey]);

  const checkTimeout = useCallback((): boolean => {
    if (isTerminatingRef.current) return true;
    if (hasActivityExpired(Date.now())) {
      if (!prevActiveRef.current) {
        checkedBeforeMountEffectRef.current = true;
      }
      void performTimeout();
      return true;
    }
    return false;
  }, [hasActivityExpired, performTimeout]);

  const isTerminating = useCallback((): boolean => isTerminatingRef.current, []);

  const recordUserActivity = useCallback(() => {
    if (checkTimeout()) {
      return;
    }
    const now = Date.now();
    lastRecordedRef.current = now;
    setLastActivity(now, storageKey);
    if (onActivityRef.current) {
      void onActivityRef.current();
    }
  }, [checkTimeout, storageKey]);

  useActivityListeners({
    enabled: isSessionActive,
    throttleMs,
    onActivity: recordUserActivity,
  });

  useEffect(() => {
    if (!isSessionActive) {
      prevActiveRef.current = false;
      checkedBeforeMountEffectRef.current = false;
      lastRecordedRef.current = null;
      if (!terminatingPromiseRef.current) {
        isTerminatingRef.current = false;
      }
      return;
    }

    if (!prevActiveRef.current) {
      if (!terminatingPromiseRef.current) {
        isTerminatingRef.current = false;
      }
      prevActiveRef.current = true;
    }

    const existing = getLastActivity(storageKey);
    const now = Date.now();
    if (!isTerminatingRef.current && (!existing || existing > now + 60000)) {
      setLastActivity(now, storageKey);
      lastRecordedRef.current = now;
    } else if (existing) {
      lastRecordedRef.current = existing;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      if (!e.newValue) {
        lastRecordedRef.current = null;
        return;
      }
      const parsed = Number.parseInt(e.newValue, 10);
      if (Number.isFinite(parsed)) {
        lastRecordedRef.current = parsed;
        if (Date.now() - parsed < timeoutMs && !terminatingPromiseRef.current) {
          isTerminatingRef.current = false;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };

    const shouldRunInitialCheck = !checkedBeforeMountEffectRef.current;
    checkedBeforeMountEffectRef.current = false;
    if (shouldRunInitialCheck) {
      checkTimeout();
    }

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
  }, [isSessionActive, timeoutMs, storageKey, checkIntervalMs, checkTimeout]);

  return { checkTimeout, isTerminating };
}
