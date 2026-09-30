import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Al abrir el enlace del correo de recuperación, Supabase crea una sesión y
  // emite PASSWORD_RECOVERY. Sin esta bandera el usuario entraría al panel sin
  // llegar nunca a fijar su nueva contraseña.
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Session Error:', error);
      setSession(data?.session || null);
      setLoading(false);
    });

    let refreshTimeout: number | null = null;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if (refreshTimeout) return;
        refreshTimeout = window.setTimeout(() => { refreshTimeout = null; }, 5000);
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.expires_at) {
            const timeToExpiry = session.expires_at * 1000 - Date.now();
            if (timeToExpiry < 300000) { // 5 minutos
              await supabase.auth.refreshSession();
            }
          }
        } catch (error) {
          console.error('Error refreshing session:', error);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveringPassword(true);
      if (event === 'SIGNED_OUT') setIsRecoveringPassword(false);
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
