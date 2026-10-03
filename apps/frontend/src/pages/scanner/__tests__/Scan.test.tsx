import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Scan } from '../Scan';

vi.mock('../QRCam', () => ({
  QRCam: ({ isActive }: { isActive: boolean }) => (
    <div data-testid="qr-cam" data-active={String(isActive)}>
      Camara QR activa
    </div>
  ),
}));

vi.mock('../../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('../../../hooks/useSignOut', () => ({
  useSignOut: () => vi.fn(),
}));

const mockSession = {
  user: { id: 'user-cajero', email: 'cajero@test.com' },
} as unknown as Session;

function renderScan(role: 'STAFF' | 'OWNER' = 'STAFF') {
  return render(
    <MemoryRouter>
      <Scan merchantId="merchant-123" session={mockSession} role={role} />
    </MemoryRouter>,
  );
}

describe('Scan component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra inicialmente el estado "Listo para escanear" con el botón para comenzar', () => {
    renderScan();
    expect(screen.getByText('Listo para escanear')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comenzar a escanear/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manual' })).toBeInTheDocument();
  });

  it('carga el modo manual inmediatamente al hacer clic en "Manual" sin requerir "Comenzar a escanear"', () => {
    renderScan();

    // Hacemos clic directo en "Manual" en el encabezado
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));

    // El modo manual debe cargarse de inmediato con el campo de RUT / Teléfono
    expect(screen.getByText('Ingreso Manual')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('12.345.678-9')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buscar cliente/i })).toBeInTheDocument();

    // Ya no debe mostrarse la pantalla de "Listo para escanear"
    expect(screen.queryByText('Listo para escanear')).not.toBeInTheDocument();

    // El botón del header ahora debe decir "Cámara"
    expect(screen.getByRole('button', { name: 'Cámara' })).toBeInTheDocument();
  });

  it('permite regresar a la vista de cámara desde el botón "Cámara" del header o desde "Volver a la cámara"', () => {
    renderScan();

    // Entramos a manual
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    expect(screen.getByText('Ingreso Manual')).toBeInTheDocument();

    // Volvemos con el botón del encabezado
    fireEvent.click(screen.getByRole('button', { name: 'Cámara' }));
    expect(screen.getByText('Listo para escanear')).toBeInTheDocument();

    // Entramos a manual de nuevo
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    expect(screen.getByText('Ingreso Manual')).toBeInTheDocument();

    // Volvemos con el botón inferior de ManualFallback
    fireEvent.click(screen.getByRole('button', { name: /volver a la cámara/i }));
    expect(screen.getByText('Listo para escanear')).toBeInTheDocument();
  });

  it('inicia la cámara al hacer clic en "Comenzar a escanear"', () => {
    renderScan();

    fireEvent.click(screen.getByRole('button', { name: /comenzar a escanear/i }));

    expect(screen.getByTestId('qr-cam')).toBeInTheDocument();
    expect(screen.queryByText('Listo para escanear')).not.toBeInTheDocument();
  });

  it('muestra el botón "Panel" solo si el rol es OWNER', () => {
    const { unmount } = renderScan('STAFF');
    expect(screen.queryByRole('link', { name: 'Panel' })).not.toBeInTheDocument();
    unmount();

    renderScan('OWNER');
    expect(screen.getByRole('link', { name: 'Panel' })).toBeInTheDocument();
  });
});
