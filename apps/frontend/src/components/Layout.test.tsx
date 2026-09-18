import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { supabase } from '../lib/supabase';

// Mock Supabase Auth
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), 
        removeListener: vi.fn(), 
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders sidebar links and handles logout', async () => {
    const mockSession = { user: { email: 'admin@local.com' } };
    
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout session={mockSession as any} />}>
            <Route index element={<div>Página Principal</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText(/Métricas Principales/i)).toBeInTheDocument();
    expect(screen.getByText(/Promociones Activas/i)).toBeInTheDocument();
    expect(screen.getByText(/admin@local.com/i)).toBeInTheDocument();

    const logoutBtn = screen.getByText(/Cerrar Sesión/i);
    fireEvent.click(logoutBtn);
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
  
  it('toggles dark mode', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout session={{} as any} />} />
        </Routes>
      </MemoryRouter>
    );
    
    const themeBtn = screen.getByRole('button', { name: /🌙/i });
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    fireEvent.click(screen.getByRole('button', { name: /☀️/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
