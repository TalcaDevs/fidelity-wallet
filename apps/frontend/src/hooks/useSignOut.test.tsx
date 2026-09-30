import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { useSignOut } from './useSignOut';

function SignOutButton() {
  const signOut = useSignOut();
  return <button onClick={() => void signOut()}>Salir</button>;
}

function CurrentUrl() {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

describe('useSignOut', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // El dueño que salía desde /scan volvía al escáner al entrar de nuevo, por el ?redirect.
  it('lleva al login sin destino, para que el próximo ingreso decida por rol', async () => {
    vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <Routes>
          <Route path="/scan" element={<SignOutButton />} />
          <Route path="/admin/login" element={<CurrentUrl />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText('Salir'));

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(await screen.findByText('/admin/login')).toBeInTheDocument();
  });
});
