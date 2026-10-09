import type { Session } from '@supabase/supabase-js';

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
export const ACTIVITY_STORAGE_KEY = 'fidelity_last_activity';
export const LOGOUT_REASON_KEY = 'fidelity_logout_reason';
export const ACTIVITY_THROTTLE_MS = 15 * 1000;
export const INACTIVITY_CHECK_INTERVAL_MS = 30 * 1000;
export const PROACTIVE_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;
export const VISIBILITY_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export function getLastActivity(storageKey = ACTIVITY_STORAGE_KEY): number | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setLastActivity(timestamp = Date.now(), storageKey = ACTIVITY_STORAGE_KEY): void {
  try {
    localStorage.setItem(storageKey, String(timestamp));
  } catch {}
}

export function clearLastActivity(storageKey = ACTIVITY_STORAGE_KEY): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {}
}

export function isSessionInactive(
  timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
  storageKey = ACTIVITY_STORAGE_KEY,
  now = Date.now(),
): boolean {
  const last = getLastActivity(storageKey);
  if (!last) return false;
  return now - last >= timeoutMs;
}

export function setLogoutReason(reason: string, storageKey = LOGOUT_REASON_KEY): void {
  try {
    sessionStorage.setItem(storageKey, reason);
  } catch {}
}

export function consumeLogoutReason(storageKey = LOGOUT_REASON_KEY): string | null {
  try {
    const reason = sessionStorage.getItem(storageKey);
    if (reason) {
      sessionStorage.removeItem(storageKey);
    }
    return reason;
  } catch {
    return null;
  }
}

export function isTokenExpiringSoon(
  session: Session | null | undefined,
  thresholdMs: number,
  now = Date.now(),
): boolean {
  if (!session?.expires_at) return false;
  const timeToExpiry = session.expires_at * 1000 - now;
  return timeToExpiry > 0 && timeToExpiry < thresholdMs;
}
