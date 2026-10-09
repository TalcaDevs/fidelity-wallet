import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/admin/Dashboard';
import { Analytics } from './pages/admin/Analytics';
import { SupabaseAuth } from './auth/SupabaseAuth';
import { Layout } from './components/Layout';
import { CardEditor } from './pages/admin/card/CardEditor';
import { Customers } from './pages/admin/Customers';
import { CustomerDetail } from './pages/admin/CustomerDetail';
import { Team } from './pages/admin/Team';
import { Billing } from './pages/admin/Billing';
import { Support } from './pages/admin/Support';
import { Settings } from './pages/admin/Settings';
import { NotFound } from './pages/NotFound';
import { NotFoundScreen } from './components/NotFoundScreen';
import { Home } from './pages/public/Home';
import { Join } from './pages/public/Join';
import { Terms } from './pages/public/Terms';
import { Scan } from './pages/scanner/Scan';
import { ToastProvider } from './components/ui/ToastProvider';
import { AccessDenied, RecoveryGate, RedirectIfAuthenticated, RequirePlatformAdmin, RequireRole } from './components/routing/RouteGuards';
import { PasswordResetRoute } from './components/routing/PasswordResetRoute';
import { ROUTES } from './components/routing/routePaths';
import { useAuth } from './hooks/useAuth';
import { useMembership } from './hooks/useMembership';
import { usePlatformAdmin } from './hooks/usePlatformAdmin';
import { isBillingEnabled } from './config/features';
import './index.css';
import { WalletLoading } from './components/ui/WalletLoading';

// El panel interno no viaja en el bundle del panel, del escáner ni de /join.
const InternalApp = lazy(() => import('./pages/internal/InternalApp'));
// Sucursales trae Leaflet: se carga al abrirla, no con el resto del panel.
const Locations = lazy(() => import('./pages/admin/Locations').then((m) => ({ default: m.Locations })));

// El panel es sólo para el dueño; el personal de caja va al escáner.
const ADMIN_ROLES = ['OWNER'] as const;

export default function App() {
  const { session, loading, isRecoveringPassword, finishPasswordRecovery } = useAuth();
  // La membresía se resuelve una sola vez acá y se reparte: el guard la usa
  // para decidir y el Layout para mostrar el rol real.
  const membership = useMembership(session);
  const platformAdmin = usePlatformAdmin(session);

  if (loading) {
    return <WalletLoading />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <RecoveryGate isRecovering={isRecoveringPassword} />
        <Routes>
          {/* Públicas: funcionan con y sin sesión */}
          <Route path={ROUTES.home} element={<Home />} />
          <Route path="/join/:merchantName" element={<Join />} />
          <Route path={ROUTES.terms} element={<Terms />} />
          <Route path={ROUTES.resetPassword} element={<PasswordResetRoute onDone={finishPasswordRecovery} />} />

          <Route element={<RedirectIfAuthenticated session={session} membership={membership} platformAdmin={platformAdmin} />}>
            <Route path={ROUTES.login} element={<SupabaseAuth />} />
          </Route>

          {/* Scanner: requiere sesión y rol OWNER o STAFF */}
          <Route element={<RequireRole session={session} membership={membership} allow={['OWNER', 'STAFF']} platformAdmin={platformAdmin} />}>
            <Route
              path={ROUTES.scan}
              element={
                session && membership.merchantId ? (
                  <Scan merchantId={membership.merchantId} session={session} role={membership.role} brandId={membership.brandId} />
                ) : (
                  <AccessDenied reason="Tu usuario no tiene un local activo asignado." />
                )
              }
            />
          </Route>

          {/* Panel: requiere sesión y rol OWNER */}
          <Route element={<RequireRole session={session} membership={membership} allow={ADMIN_ROLES} platformAdmin={platformAdmin} />}>
            <Route element={<Layout session={session} role={membership.role} brandId={membership.brandId} isSuspended={membership.isSuspended} />}>
              <Route path={ROUTES.admin} element={<Navigate to={membership.isSuspended ? ROUTES.billing : ROUTES.dashboard} replace />} />
              <Route path={ROUTES.dashboard} element={<Dashboard session={session} brandId={membership.brandId} />} />
              <Route path={ROUTES.analytics} element={<Analytics merchantId={membership.merchantId} />} />
              <Route path={ROUTES.team} element={<Team brandId={membership.brandId} />} />
              <Route path={ROUTES.locations} element={<Suspense fallback={null}><Locations brandId={membership.brandId} /></Suspense>} />
              {(isBillingEnabled || membership.isSuspended) && <Route path={ROUTES.billing} element={<Billing brandId={membership.brandId} isSuspended={membership.isSuspended} />} />}
              <Route path={ROUTES.support} element={<Support brandId={membership.brandId} />} />
              <Route path={ROUTES.card} element={<CardEditor brandId={membership.brandId} />} />
              {/* Las promociones ahora son las recompensas del editor de la tarjeta. */}
              <Route path={ROUTES.promotions} element={<Navigate to={ROUTES.card} replace />} />
              <Route path={ROUTES.customers} element={<Customers brandId={membership.brandId} merchantId={membership.merchantId} />} />
              <Route path={ROUTES.customerDetail} element={<CustomerDetail brandId={membership.brandId} />} />
              <Route path={ROUTES.settings} element={<Settings session={session} brandId={membership.brandId} />} />
              {/* Un 404 dentro del panel conserva la navegación lateral */}
              <Route path="/admin/*" element={<NotFound />} />
            </Route>
          </Route>

          {/* Panel interno: solo PlatformAdmin */}
          <Route
            path="/internal/*"
            element={
              <RequirePlatformAdmin session={session} platformAdmin={platformAdmin}>
                {(adminSession, role) => (
                  <Suspense fallback={<WalletLoading label="Cargando panel interno…" />}>
                    <InternalApp session={adminSession} role={role} />
                  </Suspense>
                )}
              </RequirePlatformAdmin>
            }
          />

          {/* Las rutas del panel vivían en la raíz: los enlaces y marcadores
              viejos siguen funcionando en vez de caer en el 404. */}
          <Route path="/dashboard" element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path="/analytics" element={<Navigate to={ROUTES.analytics} replace />} />
          <Route path="/promotions" element={<Navigate to={ROUTES.card} replace />} />
          <Route path="/customers" element={<Navigate to={ROUTES.customers} replace />} />
          <Route path="/settings" element={<Navigate to={ROUTES.settings} replace />} />

          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
