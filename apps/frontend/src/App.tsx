import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/admin/Dashboard';
import { SupabaseAuth } from './auth/SupabaseAuth';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { PromotionsModule } from './pages/admin/PromotionsModule';
import './index.css';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>Cargando...</p></div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {!session ? (
          <Route path="*" element={<SupabaseAuth onLogin={() => {}} />} />
        ) : (
          <Route element={<Layout session={session} />}>
            <Route path="/dashboard" element={<Dashboard session={session} />} />
            <Route path="/promotions" element={<PromotionsModule session={session} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
