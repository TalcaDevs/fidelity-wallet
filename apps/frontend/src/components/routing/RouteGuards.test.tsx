import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { RequireRole } from './RouteGuards';
import type { MembershipState } from '../../hooks/useMembership';

// Sesión mínima: RequireRole solo comprueba que exista, no la lee.
const SESSION = { user: { id: 'user-1' } } as unknown as Session;

const LOADED: MembershipState = { merchantId: 'm1', role: 'OWNER', loading: false, error: null };

function renderGuard(membership: MembershipState) {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route element={<RequireRole session={SESSION} membership={membership} allow={['OWNER']} />}>
          <Route path="/admin/dashboard" element={<p>panel privado</p>} />
        </Route>
        <Route path="/scan" element={<p>escaner</p>} />
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
    renderGuard({ merchantId: null, role: null, loading: false, error: 'Se cayó la red' });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.getByText('No pudimos verificar tu acceso')).toBeInTheDocument();
    expect(screen.getByText('Se cayó la red')).toBeInTheDocument();
  });

  it('deniega el acceso si el usuario no tiene ninguna membresía', () => {
    renderGuard({ merchantId: null, role: null, loading: false, error: null });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.getByText('No pudimos verificar tu acceso')).toBeInTheDocument();
  });

  it('manda al escáner al STAFF que entra al panel', () => {
    renderGuard({ merchantId: 'm1', role: 'STAFF', loading: false, error: null });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.getByText('escaner')).toBeInTheDocument();
  });

  it('muestra carga mientras la membresía se resuelve, sin redirigir', () => {
    renderGuard({ merchantId: null, role: null, loading: true, error: null });
    expect(screen.queryByText('panel privado')).not.toBeInTheDocument();
    expect(screen.queryByText('escaner')).not.toBeInTheDocument();
    expect(screen.getByText('Cargando tu cuenta...')).toBeInTheDocument();
  });
});
