import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/admin/Dashboard';
import { SupabaseAuth } from './auth/SupabaseAuth';
import { Layout } from './components/Layout';
import { PromotionsModule } from './pages/admin/PromotionsModule';
import { Customers } from './pages/admin/Customers';
import { Settings } from './pages/admin/Settings';
import { NotFound } from './pages/NotFound';
import { NotFoundScreen } from './components/NotFoundScreen';
import { Home } from './pages/public/Home';
import { Join } from './pages/public/Join';
import { Scan } from './pages/scanner/Scan';
import { ToastProvider } from './components/ui/ToastProvider';
import { RecoveryGate, RedirectIfAuthenticated, RequireRole } from './components/routing/RouteGuards';
import { PasswordResetRoute } from './components/routing/PasswordResetRoute';
import { ROUTES } from './components/routing/routePaths';
import { useAuth } from './hooks/useAuth';
import { useMembership } from './hooks/useMembership';
import './index.css';

// El panel es sólo para el dueño; el personal de caja va al escáner.
const ADMIN_ROLES = ['OWNER'] as const;

export default function App() {
  const { session, loading, isRecoveringPassword, finishPasswordRecovery } = useAuth();
  // La membresía se resuelve una sola vez acá y se reparte: el guard la usa
  // para decidir y el Layout para mostrar el rol real.
  const membership = useMembership(session);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p>Cargando...</p></div>;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <RecoveryGate isRecovering={isRecoveringPassword} />
        <Routes>
          {/* Públicas: funcionan con y sin sesión */}
          <Route path={ROUTES.home} element={<Home />} />
          <Route path="/join/:merchantId" element={<Join />} />
          <Route path={ROUTES.scan} element={<Scan />} />
          <Route path={ROUTES.resetPassword} element={<PasswordResetRoute onDone={finishPasswordRecovery} />} />

          <Route element={<RedirectIfAuthenticated session={session} />}>
            <Route path={ROUTES.login} element={<SupabaseAuth />} />
          </Route>

          {/* Panel: requiere sesión y rol OWNER */}
          <Route element={<RequireRole session={session} membership={membership} allow={ADMIN_ROLES} />}>
            <Route element={<Layout session={session} role={membership.role} />}>
              <Route path={ROUTES.admin} element={<Navigate to={ROUTES.dashboard} replace />} />
              <Route path={ROUTES.dashboard} element={<Dashboard session={session} merchantId={membership.merchantId} />} />
              <Route path={ROUTES.promotions} element={<PromotionsModule merchantId={membership.merchantId} />} />
              <Route path={ROUTES.customers} element={<Customers merchantId={membership.merchantId} />} />
              <Route path={ROUTES.settings} element={<Settings session={session} merchantId={membership.merchantId} />} />
              {/* Un 404 dentro del panel conserva la navegación lateral */}
              <Route path="/admin/*" element={<NotFound />} />
            </Route>
          </Route>

          {/* Las rutas del panel vivían en la raíz: los enlaces y marcadores
              viejos siguen funcionando en vez de caer en el 404. */}
          <Route path="/dashboard" element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="/promotions" element={<Navigate to={ROUTES.promotions} replace />} />
          <Route path="/customers" element={<Navigate to={ROUTES.customers} replace />} />
          <Route path="/settings" element={<Navigate to={ROUTES.settings} replace />} />

          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
