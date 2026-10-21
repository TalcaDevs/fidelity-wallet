import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import App from '../../App';
import { RedirectIfAuthenticated, RequireActiveSubscription, RequirePlatformAdmin, RequireRole } from './RouteGuards';
import * as useAuthModule from '../../hooks/useAuth';
import * as usePlatformAdminModule from '../../hooks/usePlatformAdmin';
import * as useDashboardStatsModule from '../../hooks/useDashboardStats';
import * as useSubscriptionModule from '../../hooks/useSubscription';
import * as membershipService from '../../services/membershipService';
import type { MembershipState } from '../../hooks/useMembership';
import type { PlatformAdminState } from '../../hooks/usePlatformAdmin';

vi.mock('../../config/features', () => ({
  isBillingEnabled: false,
}));

// Sesión mínima: RequireRole solo comprueba que exista, no la lee.
const SESSION = { user: { id: 'user-1', email: 'owner@comercio.cl' } } as unknown as Session;

const LOADED: MembershipState = { brandId: null, programId: null, merchantId: 'm1', role: 'OWNER', loading: false, error: null };

const NO_MEMBERSHIP: MembershipState = { brandId: null, programId: null, merchantId: null, role: null, loading: false, error: 'Tu usuario no está asociado a ningún local.' };

function renderGuard(
  membership: MembershipState,
  platformAdmin?: PlatformAdminState,
  initialEntry = '/admin/dashboard',
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RequireRole session={SESSION} membership={membership} allow={['OWNER']} platformAdmin={platformAdmin} />}>
          <Route path="/admin/billing" element={<p>pantalla facturacion</p>} />
          <Route path="/admin/support" element={<p>pantalla soporte</p>} />
          <Route element={<RequireActiveSubscription membership={membership} />}>
            <Route path="/admin/dashboard" element={<p>panel privado</p>} />
          </Route>
        </Route>
        <Route path="/scan" element={<p>escaner</p>} />
        <Route path="/internal" element={<p>panel interno</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireRole', () => {
  it('deja pasar al OWNER', () => {
    renderGuard(LOADED);
    expect(screen.getByText('panel privado')).toBeInTheDocument();
  });

  // Este es el caso que importa: un fallo al resolver la membresía no puede
  // traducirse en acceso. Antes se asumía OWNER y era una escalada de privilegios.
  it('deniega el acceso si la membresía falló', () => {
    renderGuard({ brandId: null, programId: null, merchantId: null, role: null, loading: false, error: 'Se cayó la red' });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.getByText('No pudimos verificar tu acceso')).toBeInTheDocument();
    expect(screen.getByText('Se cayó la red')).toBeInTheDocument();
  });

  it('deniega el acceso si el usuario no tiene ninguna membresía', () => {
    renderGuard({ brandId: null, programId: null, merchantId: null, role: null, loading: false, error: null });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.getByText('No pudimos verificar tu acceso')).toBeInTheDocument();
  });

  it('manda al escáner al STAFF que entra al panel', () => {
    renderGuard({ brandId: null, programId: null, merchantId: 'm1', role: 'STAFF', loading: false, error: null });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.getByText('escaner')).toBeInTheDocument();
  });

  it('muestra carga mientras la membresía se resuelve, sin redirigir', () => {
    renderGuard({ brandId: null, programId: null, merchantId: null, role: null, loading: true, error: null });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.queryByText('escaner')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando tu cuenta...')).toBeInTheDocument();
  });

  it('redirige al OWNER suspendido a /admin/billing si intenta acceder al dashboard', () => {
    renderGuard(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'OWNER', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      undefined,
      '/admin/dashboard',
    );
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.getByText('pantalla facturacion')).toBeInTheDocument();
  });

  it('permite al OWNER suspendido acceder a /admin/billing', () => {
    renderGuard(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'OWNER', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      undefined,
      '/admin/billing',
    );
    expect(screen.getByText('pantalla facturacion')).toBeInTheDocument();
  });

  it('permite al OWNER suspendido acceder a /admin/support', () => {
    renderGuard(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'OWNER', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      undefined,
      '/admin/support',
    );
    expect(screen.getByText('pantalla soporte')).toBeInTheDocument();
  });

  it('muestra acceso denegado con mensaje explicativo al STAFF de una marca suspendida', () => {
    renderGuard(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'STAFF', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
    );
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.queryByText('escaner')).not.toBeInTheDocument();
    expect(screen.getByText('Tu local se encuentra temporalmente suspendido. Contacta al administrador del comercio.')).toBeInTheDocument();
  });
});

describe('equipo interno', () => {
  it('manda a /internal a un admin interno sin marca', () => {
    renderGuard(NO_MEMBERSHIP, { role: 'SUPPORT', loading: false });
    expect(screen.getByText('panel interno')).toBeInTheDocument();
  });

  it('espera a saber si es admin interno antes de mostrar "sin acceso"', () => {
    renderGuard(NO_MEMBERSHIP, { role: null, loading: true });
    expect(screen.getByText('Cargando tu cuenta...')).toBeInTheDocument();
  });

  it('sin rol interno sigue mostrando el acceso denegado', () => {
    renderGuard(NO_MEMBERSHIP, { role: null, loading: false });
    expect(screen.getByText('No pudimos verificar tu acceso')).toBeInTheDocument();
  });

  const renderInternal = (platformAdmin: PlatformAdminState) =>
    render(
      <MemoryRouter initialEntries={['/internal/tickets']}>
        <Routes>
          <Route
            path="/internal/*"
            element={
              <RequirePlatformAdmin session={SESSION} platformAdmin={platformAdmin}>
                {(_session, role) => <p>bandeja {role}</p>}
              </RequirePlatformAdmin>
            }
          />
          <Route path="/admin" element={<p>panel del dueño</p>} />
        </Routes>
      </MemoryRouter>,
    );

  it('deja entrar a /internal solo con rol interno', () => {
    renderInternal({ role: 'SUPERADMIN', loading: false });
    expect(screen.getByText('bandeja SUPERADMIN')).toBeInTheDocument();
  });

  it('saca de /internal a quien no es del equipo', () => {
    renderInternal({ role: null, loading: false });
    expect(screen.queryByText(/bandeja/)).not.toBeInTheDocument();
    expect(screen.getByText('panel del dueño')).toBeInTheDocument();
  });
});

describe('RedirectIfAuthenticated', () => {
  const DEFAULT_PLATFORM_ADMIN: PlatformAdminState = { role: null, loading: false };

  const renderRedirect = (
    membership: MembershipState = LOADED,
    initialEntries: string[] = ['/admin/login'],
    platformAdmin: PlatformAdminState = DEFAULT_PLATFORM_ADMIN,
  ) =>
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<RedirectIfAuthenticated session={SESSION} membership={membership} platformAdmin={platformAdmin} />}>
            <Route path="/admin/login" element={<p>formulario login</p>} />
          </Route>
          <Route path="/scan" element={<p>pantalla escaner</p>} />
          <Route path="/admin/dashboard" element={<p>pantalla dashboard</p>} />
          <Route path="/admin/billing" element={<p>pantalla facturacion</p>} />
          <Route path="/admin/support" element={<p>pantalla soporte</p>} />
          <Route path="/admin/team" element={<p>pantalla equipo</p>} />
          <Route path="/internal" element={<p>pantalla interna</p>} />
          <Route path="*" element={<p>no encontrado</p>} />
        </Routes>
      </MemoryRouter>,
    );

  it('muestra loader mientras carga la membresía', () => {
    renderRedirect({ brandId: null, programId: null, merchantId: null, role: null, loading: true, error: null });
    expect(screen.getByText('Cargando tu cuenta...')).toBeInTheDocument();
  });

  it('manda al STAFF siempre a /scan aunque haya intentado entrar con redirect a admin', () => {
    renderRedirect(
      { brandId: null, programId: null, merchantId: 'm1', role: 'STAFF', loading: false, error: null },
      ['/admin/login?redirect=%2Fadmin%2Fteam'],
    );
    expect(screen.getByText('pantalla escaner')).toBeInTheDocument();
  });

  it('manda al OWNER al dashboard ignorando un residuo de redirect a /scan', () => {
    renderRedirect(
      { brandId: null, programId: null, merchantId: 'm1', role: 'OWNER', loading: false, error: null },
      ['/admin/login?redirect=%2Fscan'],
    );
    expect(screen.getByText('pantalla dashboard')).toBeInTheDocument();
  });

  it('manda al OWNER a la subruta administrativa si el redirect apunta a /admin/*', () => {
    renderRedirect(
      { brandId: null, programId: null, merchantId: 'm1', role: 'OWNER', loading: false, error: null },
      ['/admin/login?redirect=%2Fadmin%2Fteam'],
    );
    expect(screen.getByText('pantalla equipo')).toBeInTheDocument();
  });

  it('manda al OWNER suspendido a /admin/billing al autenticarse', () => {
    renderRedirect(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'OWNER', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      ['/admin/login'],
    );
    expect(screen.getByText('pantalla facturacion')).toBeInTheDocument();
  });

  it('manda al OWNER suspendido a /admin/billing incluso si traía redirect a otra ruta no permitida', () => {
    renderRedirect(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'OWNER', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      ['/admin/login?redirect=%2Fadmin%2Fteam'],
    );
    expect(screen.getByText('pantalla facturacion')).toBeInTheDocument();
  });

  it('permite redirigir al OWNER suspendido a soporte si el redirect era a /admin/support', () => {
    renderRedirect(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'OWNER', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      ['/admin/login?redirect=%2Fadmin%2Fsupport'],
    );
    expect(screen.getByText('pantalla soporte')).toBeInTheDocument();
  });

  it('rechaza prefijos falsos como /admin/support-inexistente y redirige al OWNER suspendido a /admin/billing', () => {
    renderRedirect(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'OWNER', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      ['/admin/login?redirect=%2Fadmin%2Fsupport-inexistente'],
    );
    expect(screen.queryByText('no encontrado')).not.toBeInTheDocument();
    expect(screen.getByText('pantalla facturacion')).toBeInTheDocument();
  });

  it('muestra acceso denegado al STAFF suspendido al autenticarse', () => {
    renderRedirect(
      { brandId: 'b1', programId: null, merchantId: 'm1', role: 'STAFF', brandStatus: 'SUSPENDED', isSuspended: true, loading: false, error: null },
      ['/admin/login'],
    );
    expect(screen.getByText('Tu local se encuentra temporalmente suspendido. Contacta al administrador del comercio.')).toBeInTheDocument();
  });

  it('manda a /internal si es un PlatformAdmin sin membresía comercial', () => {
    renderRedirect(
      NO_MEMBERSHIP,
      ['/admin/login'],
      { role: 'SUPPORT', loading: false },
    );
    expect(screen.getByText('pantalla interna')).toBeInTheDocument();
  });

  it('manda a /internal al OWNER que también es PlatformAdmin cuando viene con redirect a /internal', () => {
    renderRedirect(
      LOADED,
      ['/admin/login?redirect=%2Finternal'],
      { role: 'SUPERADMIN', loading: false },
    );
    expect(screen.getByText('pantalla interna')).toBeInTheDocument();
  });
});

describe('RequireActiveSubscription', () => {
  it('permite el acceso a rutas protegidas cuando la suscripción está activa', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route element={<RequireActiveSubscription membership={{ ...LOADED, brandStatus: 'ACTIVE', isSuspended: false }} />}>
            <Route path="/admin/dashboard" element={<p>panel activo</p>} />
          </Route>
          <Route path="/admin/billing" element={<p>pantalla facturacion</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('panel activo')).toBeInTheDocument();
    expect(screen.queryByText('pantalla facturacion')).not.toBeInTheDocument();
  });

  it('intercepta y redirige a /admin/billing cuando la marca se encuentra suspendida', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route element={<RequireActiveSubscription membership={{ ...LOADED, brandStatus: 'SUSPENDED', isSuspended: true }} />}>
            <Route path="/admin/dashboard" element={<p>panel activo</p>} />
          </Route>
          <Route path="/admin/billing" element={<p>pantalla facturacion</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText('panel activo')).not.toBeInTheDocument();
    expect(screen.getByText('pantalla facturacion')).toBeInTheDocument();
  });
});

describe('Flujo de reactivación desde Facturación con VITE_FEATURE_BILLING apagado', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('redirige a /admin/dashboard sin caer en 404 cuando la marca pasa de SUSPENDED a ACTIVE estando en /admin/billing', async () => {
    window.history.pushState({}, '', '/admin/billing');

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      session: SESSION,
      loading: false,
      isRecoveringPassword: false,
      finishPasswordRecovery: vi.fn(),
    });
    vi.spyOn(usePlatformAdminModule, 'usePlatformAdmin').mockReturnValue({
      role: null,
      loading: false,
    });
    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: { activePasses: 10, stampsDelivered: 25, rewardsRedeemed: 3, recentScans: [] },
      loading: false,
      error: null,
      fetchStats: vi.fn(),
    });
    vi.spyOn(useSubscriptionModule, 'useSubscription').mockReturnValue({
      subscription: {
        planId: 'TRIAL',
        status: 'TRIALING',
        billingCycle: 'MONTHLY',
        trialEndsAt: '2026-11-01T00:00:00.000Z',
        currentPeriodEnd: '2026-11-01T00:00:00.000Z',
        usage: { programs: 1, locations: 1, teamUsers: 1, customers: 10 },
      },
      trialDaysLeft: 18,
      loading: false,
      error: null,
    });

    const fetchSpy = vi
      .spyOn(membershipService, 'fetchMemberships')
      .mockResolvedValueOnce([
        {
          brandId: 'b1',
          merchantId: 'm1',
          programId: null,
          role: 'OWNER',
          brandStatus: 'SUSPENDED',
        },
      ])
      .mockResolvedValueOnce([
        {
          brandId: 'b1',
          merchantId: 'm1',
          programId: 'p1',
          role: 'OWNER',
          brandStatus: 'ACTIVE',
        },
      ]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Tu cuenta se encuentra suspendida')).toBeInTheDocument();
    });

    act(() => {
      membershipService.invalidateMemberships();
    });

    await waitFor(() => {
      expect(screen.getByText('Tu programa de fidelización')).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe('/admin/dashboard');
    expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
  });
});
