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

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveringPassword(true);
      if (event === 'SIGNED_OUT') setIsRecoveringPassword(false);
      setSession(nextSession);
    });

    return () => {
      data?.subscription.unsubscribe();
    };
  }, []);

  const finishPasswordRecovery = useCallback(() => setIsRecoveringPassword(false), []);

  return { session, loading, isRecoveringPassword, finishPasswordRecovery };
}
