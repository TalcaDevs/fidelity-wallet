import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearLastActivity,
  isSessionInactive,
  isTokenExpiringSoon,
  PROACTIVE_REFRESH_THRESHOLD_MS,
  setLogoutReason,
  useInactivityTimeout,
  VISIBILITY_REFRESH_THRESHOLD_MS,
} from './useInactivityTimeout';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  const handleUserActivity = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session;
      if (isTokenExpiringSoon(currentSession, PROACTIVE_REFRESH_THRESHOLD_MS)) {
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('Error refreshing session on activity:', error);
    }
  }, []);

  useInactivityTimeout(session, {
    onActivity: handleUserActivity,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Session Error:', error);
      setSession(data?.session || null);
      setLoading(false);
    });

    let refreshTimeout: number | null = null;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (isSessionInactive()) {
          setLogoutReason('inactivity');
          clearLastActivity();
          await supabase.auth.signOut();
          return;
        }

        if (refreshTimeout) return;
        refreshTimeout = window.setTimeout(() => { refreshTimeout = null; }, 5000);
        
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data || !data.session) return;
          const session = data.session;
          if (isTokenExpiringSoon(session, VISIBILITY_REFRESH_THRESHOLD_MS)) {
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
        setIsRecoveringPassword(false);
        clearLastActivity();
      }
      setSession(nextSession);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimeout) window.clearTimeout(refreshTimeout);
      data?.subscription.unsubscribe();
    };
  }, []);

  const finishPasswordRecovery = useCallback(() => setIsRecoveringPassword(false), []);

  return { session, loading, isRecoveringPassword, finishPasswordRecovery };
}
