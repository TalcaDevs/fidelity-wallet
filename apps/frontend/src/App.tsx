import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/admin/Dashboard';
import { SupabaseAuth } from './auth/SupabaseAuth';
import { Layout } from './components/Layout';
import { PromotionsModule } from './pages/admin/PromotionsModule';
import { useAuth } from './hooks/useAuth';
import './index.css';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>Cargando...</p></div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {!session ? (
          <Route path="*" element={<SupabaseAuth />} />
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
