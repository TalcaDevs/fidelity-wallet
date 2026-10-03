import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { RedirectIfAuthenticated, RequirePlatformAdmin, RequireRole } from './RouteGuards';
import type { MembershipState } from '../../hooks/useMembership';
import type { PlatformAdminState } from '../../hooks/usePlatformAdmin';

// Sesión mínima: RequireRole solo comprueba que exista, no la lee.
const SESSION = { user: { id: 'user-1' } } as unknown as Session;

const LOADED: MembershipState = { brandId: null, programId: null, merchantId: 'm1', role: 'OWNER', loading: false, error: null };

const NO_MEMBERSHIP: MembershipState = { brandId: null, programId: null, merchantId: null, role: null, loading: false, error: 'Tu usuario no está asociado a ningún local.' };

function renderGuard(membership: MembershipState, platformAdmin?: PlatformAdminState) {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route element={<RequireRole session={SESSION} membership={membership} allow={['OWNER']} platformAdmin={platformAdmin} />}>
          <Route path="/admin/dashboard" element={<p>panel privado</p>} />
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
  const renderRedirect = (
    membership?: MembershipState,
    initialEntries: string[] = ['/admin/login'],
    platformAdmin?: PlatformAdminState,
  ) =>
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<RedirectIfAuthenticated session={SESSION} membership={membership} platformAdmin={platformAdmin} />}>
            <Route path="/admin/login" element={<p>formulario login</p>} />
          </Route>
          <Route path="/scan" element={<p>pantalla escaner</p>} />
          <Route path="/admin/dashboard" element={<p>pantalla dashboard</p>} />
          <Route path="/admin/team" element={<p>pantalla equipo</p>} />
          <Route path="/internal" element={<p>pantalla interna</p>} />
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

  it('manda a /internal si es un PlatformAdmin sin membresía comercial', () => {
    renderRedirect(
      NO_MEMBERSHIP,
      ['/admin/login'],
      { role: 'SUPPORT', loading: false },
    );
    expect(screen.getByText('pantalla interna')).toBeInTheDocument();
  });
});

