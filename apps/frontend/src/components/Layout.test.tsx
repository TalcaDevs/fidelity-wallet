import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const preference = vi.hoisted(() => ({ mobile: true, reduced: false }));
vi.mock('../hooks/useMediaQuery', () => ({ useMediaQuery: () => preference.mobile }));
vi.mock('../hooks/useSignOut', () => ({ useSignOut: () => vi.fn() }));
vi.mock('../config/features', () => ({ isBillingEnabled: false }));
vi.mock('motion/react', () => ({ useReducedMotion: () => preference.reduced }));

function Draft() {
  const [value, setValue] = useState('');
  return <input aria-label="Nota del formulario" value={value} onChange={(event) => setValue(event.target.value)} />;
}

function renderPanel() {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route element={<Layout session={null} role="OWNER" brandId={null} />}>
          <Route path="/admin/dashboard" element={<Draft />} />
          <Route path="/admin/customers" element={<h1>Lista de clientes</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Owner panel navigation and motion', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    preference.mobile = true;
    preference.reduced = false;
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    document.documentElement.classList.remove('dark');
  });

  it('keeps the closed mobile navigation inaccessible and restores focus after Escape', () => {
    renderPanel();
    const navigation = document.getElementById('panel-navigation')!;
    expect(navigation).toHaveAttribute('inert');
    expect(navigation).toHaveAttribute('aria-hidden', 'true');
    const opener = screen.getByRole('button', { name: 'Abrir menú' });
    opener.focus();
    fireEvent.click(opener);
    const drawer = screen.getByRole('dialog', { name: 'Navegación del panel' });
    expect(drawer).not.toHaveAttribute('inert');
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    const first = within(drawer).getByRole('link', { name: 'Fidelity Wallet, panel de inicio' });
    expect(first).toHaveFocus();
    const last = within(drawer).getByRole('button', { name: 'Cerrar Sesión' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Escape' });
    expect(navigation).toHaveAttribute('inert');
    expect(opener).toHaveFocus();
  });

  it('closes the mobile drawer after navigating and keeps the active section marked', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    fireEvent.click(screen.getByRole('link', { name: 'Clientes' }));
    expect(screen.getByRole('heading', { name: 'Lista de clientes' })).toBeInTheDocument();
    expect(document.getElementById('panel-navigation')).toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('link', { name: 'Fidelity Wallet, panel de inicio' }));
    expect(screen.getByRole('textbox', { name: 'Nota del formulario' })).toBeInTheDocument();
    expect(document.getElementById('panel-navigation')).toHaveAttribute('inert');
  });

  it('updates the device preference without resetting an open form', () => {
    preference.mobile = false;
    const { container, rerender } = renderPanel();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nota del formulario' }), { target: { value: 'Borrador pendiente' } });
    preference.reduced = true;
    const panel = () => <MemoryRouter><Routes><Route element={<Layout session={null} role="OWNER" brandId={null} />}><Route path="/admin/dashboard" element={<Draft />} /></Route></Routes></MemoryRouter>;
    rerender(panel());
    expect(container.querySelector('.fw-admin')).toHaveAttribute('data-motion-reduced', 'true');
    expect(screen.getByRole('textbox')).toHaveValue('Borrador pendiente');
    preference.reduced = false;
    rerender(panel());
    expect(container.querySelector('.fw-admin')).toHaveAttribute('data-motion-reduced', 'false');
    expect(screen.getByRole('textbox')).toHaveValue('Borrador pendiente');
  });

  it('respects the device reduced-motion preference', () => {
    preference.mobile = false;
    preference.reduced = true;
    const { container } = renderPanel();
    expect(container.querySelector('.fw-admin')).toHaveAttribute('data-motion-reduced', 'true');
    expect(screen.queryByRole('button', { name: 'Reducir animaciones' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeEnabled();
  });
});
