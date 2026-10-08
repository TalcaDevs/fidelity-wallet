import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Scan } from '../Scan';
import { listBrandLocations } from '../../../services/locationsService';

vi.mock('../QRCam', () => ({
  QRCam: ({ isActive }: { isActive: boolean }) => (
    <div data-testid="qr-cam" data-active={String(isActive)}>
      Camara QR activa
    </div>
  ),
}));

vi.mock('../../../services/locationsService', () => ({
  listBrandLocations: vi.fn(),
}));

vi.mock('../../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
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

function renderScan(role: 'STAFF' | 'OWNER' = 'STAFF', brandId?: string | null, merchantId = 'merchant-123') {
  return render(
    <MemoryRouter>
      <Scan merchantId={merchantId} session={mockSession} role={role} brandId={brandId} />
    </MemoryRouter>,
  );
}

describe('Scan component', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    });
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

  describe('selector de sucursales', () => {
    const mockLocations = [
      { id: 'loc-1', name: 'Sucursal Centro', isActive: true },
      { id: 'loc-2', name: 'Sucursal Oriente', isActive: true },
    ];

    it('muestra el selector de sucursales si el rol es OWNER y hay múltiples sucursales activas', async () => {
      vi.mocked(listBrandLocations).mockResolvedValueOnce(mockLocations);

      renderScan('OWNER', 'brand-test', 'loc-1');

      const select = await screen.findByRole('combobox', { name: /seleccionar sucursal/i });
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('loc-1');
      expect(screen.getByText(/Sucursal Centro · cajero@test.com/i)).toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'loc-2' } });

      expect(select).toHaveValue('loc-2');
      expect(screen.getByText(/Sucursal Oriente · cajero@test.com/i)).toBeInTheDocument();
      expect(localStorage.getItem('fidelity_scanner_merchant_brand-test')).toBe('loc-2');
    });

    it('no muestra el selector si el rol es STAFF pero muestra el nombre de sucursal en el subtexto', async () => {
      vi.mocked(listBrandLocations).mockResolvedValueOnce(mockLocations);

      renderScan('STAFF', 'brand-test', 'loc-1');

      expect(screen.queryByRole('combobox', { name: /seleccionar sucursal/i })).not.toBeInTheDocument();
      expect(await screen.findByText(/Sucursal Centro · cajero@test.com/i)).toBeInTheDocument();
    });

    it('no muestra el selector si el rol es OWNER pero solo hay una sucursal activa', async () => {
      vi.mocked(listBrandLocations).mockResolvedValueOnce([
        { id: 'loc-1', name: 'Casa Matriz', isActive: true },
      ]);

      renderScan('OWNER', 'brand-test', 'loc-1');

      expect(screen.queryByRole('combobox', { name: /seleccionar sucursal/i })).not.toBeInTheDocument();
      expect(await screen.findByText(/Casa Matriz · cajero@test.com/i)).toBeInTheDocument();
    });

    it('inicializa el merchantId desde localStorage si está guardado previamente para OWNER', async () => {
      localStorage.setItem('fidelity_scanner_merchant_brand-test', 'loc-2');
      vi.mocked(listBrandLocations).mockResolvedValueOnce(mockLocations);

      renderScan('OWNER', 'brand-test', 'loc-1');

      const select = await screen.findByRole('combobox', { name: /seleccionar sucursal/i });
      expect(select).toHaveValue('loc-2');
      expect(screen.getByText(/Sucursal Oriente · cajero@test.com/i)).toBeInTheDocument();
    });
  });
});
