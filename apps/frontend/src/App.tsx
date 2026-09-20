import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/admin/Dashboard';
import { SupabaseAuth } from './auth/SupabaseAuth';
import { UpdatePassword } from './auth/UpdatePassword';
import { Layout } from './components/Layout';
import { PromotionsModule } from './pages/admin/PromotionsModule';
import { Customers } from './pages/admin/Customers';
import { Settings } from './pages/admin/Settings';
import { NotFound } from './pages/NotFound';
import { ToastProvider } from './components/ui/ToastProvider';
import { useAuth } from './hooks/useAuth';
import './index.css';

export default function App() {
  const { session, loading, isRecoveringPassword, finishPasswordRecovery } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>Cargando...</p></div>;
  }

  if (isRecoveringPassword) {
    return <UpdatePassword onDone={finishPasswordRecovery} />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {!session ? (
            <Route path="*" element={<SupabaseAuth />} />
          ) : (
            <Route element={<Layout session={session} />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard session={session} />} />
              <Route path="/promotions" element={<PromotionsModule session={session} />} />
              <Route path="/customers" element={<Customers session={session} />} />
              <Route path="/settings" element={<Settings session={session} />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
