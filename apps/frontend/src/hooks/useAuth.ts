import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearLastActivity,
  getLastActivity,
  isSessionInactive,
  isTokenExpiringSoon,
  PROACTIVE_REFRESH_THRESHOLD_MS,
  setLastActivity,
  useInactivityTimeout,
  VISIBILITY_REFRESH_THRESHOLD_MS,
} from './useInactivityTimeout';

export function useAuth() {
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [isBlockedByInactivity, setIsBlockedByInactivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  const hasActiveSessionRef = useRef(false);
  const authGenerationRef = useRef(0);
  const checkTimeoutRef = useRef<() => boolean>(() => false);

  const handleTimeout = useCallback(async () => {
    setIsBlockedByInactivity(true);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw error;
    }
    authGenerationRef.current += 1;
    hasActiveSessionRef.current = false;
    setAuthSession(null);
    setIsBlockedByInactivity(false);
  }, []);

  const handleUserActivity = useCallback(async () => {
    if (checkTimeoutRef.current()) {
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (checkTimeoutRef.current()) {
        return;
      }
      const currentSession = data?.session;
      if (isTokenExpiringSoon(currentSession?.expires_at, PROACTIVE_REFRESH_THRESHOLD_MS)) {
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('Error refreshing session on activity:', error);
    }
  }, []);

  const { checkTimeout } = useInactivityTimeout(authSession, {
    enabled: !loading && Boolean(authSession),
    onTimeout: handleTimeout,
    onActivity: handleUserActivity,
    isInactive: (timeoutMs, storageKey, now) => isSessionInactive(timeoutMs, storageKey, now),
  });

  checkTimeoutRef.current = checkTimeout;

  useEffect(() => {
    const bootstrapGeneration = authGenerationRef.current;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Session Error:', error);
      if (authGenerationRef.current !== bootstrapGeneration) {
        setLoading(false);
        return;
      }

      const restoredSession = data?.session || null;
      if (restoredSession) {
        hasActiveSessionRef.current = true;
        setAuthSession(restoredSession);
        if (checkTimeoutRef.current()) {
          setIsBlockedByInactivity(true);
        }
      } else if (!hasActiveSessionRef.current) {
        setAuthSession(null);
      }
      setLoading(false);
    });

    let refreshTimeout: number | null = null;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (checkTimeoutRef.current()) {
          return;
        }

        if (refreshTimeout) return;
        refreshTimeout = window.setTimeout(() => {
          refreshTimeout = null;
        }, 5000);

        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data || !data.session || checkTimeoutRef.current()) return;
          const currentSession = data.session;
          if (isTokenExpiringSoon(currentSession.expires_at, VISIBILITY_REFRESH_THRESHOLD_MS)) {
            await supabase.auth.refreshSession();
          }
        } catch (error) {
          console.error('Error refreshing session:', error);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveringPassword(true);
      if (event === 'SIGNED_OUT') {
        authGenerationRef.current += 1;
        hasActiveSessionRef.current = false;
        setIsRecoveringPassword(false);
        setIsBlockedByInactivity(false);
        setAuthSession(null);
        clearLastActivity();
        return;
      }

      if (nextSession && checkTimeoutRef.current()) {
        hasActiveSessionRef.current = true;
        setAuthSession(nextSession);
        setIsBlockedByInactivity(true);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' && nextSession) {
        const hadActiveSession = hasActiveSessionRef.current;
        const existingActivity = getLastActivity();
        if (!hadActiveSession && existingActivity === null) {
          setLastActivity(Date.now());
        }
      }

      hasActiveSessionRef.current = Boolean(nextSession);
      setIsBlockedByInactivity(false);
      setAuthSession(nextSession);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimeout) window.clearTimeout(refreshTimeout);
      data?.subscription.unsubscribe();
    };
  }, []);

  const finishPasswordRecovery = useCallback(() => setIsRecoveringPassword(false), []);
  const session = isBlockedByInactivity ? null : authSession;

  return { session, loading, isRecoveringPassword, finishPasswordRecovery };
}
