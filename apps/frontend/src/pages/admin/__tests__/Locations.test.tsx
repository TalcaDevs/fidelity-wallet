import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardConfigDto, LocationDto } from '@fidelity/shared';
import { Locations } from '../Locations';
import * as locationsService from '../../../services/locationsService';
import * as cardService from '../../../services/cardService';
import * as toastHook from '../../../hooks/useToast';

const mockLocations: LocationDto[] = [
  {
    id: 'loc-1',
    brandId: 'brand-1',
    name: 'Sucursal Centro',
    slug: 'centro',
    address: 'Av. Libertador 100',
    commune: 'Santiago',
    region: 'Metropolitana',
    latitude: -33.44,
    longitude: -70.65,
    phone: null,
    contactName: null,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

describe('Locations Page', () => {
  const notifySuccess = vi.fn();
  const notifyError = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(toastHook, 'useToast').mockReturnValue({ notifySuccess, notifyError });
    vi.spyOn(locationsService, 'listLocations').mockResolvedValue(mockLocations);
    vi.spyOn(cardService, 'getCard').mockResolvedValue({
      brandName: 'Mi Cafetería',
      rewards: [{ name: 'Café gratis', target: 10, currency: 'STAMPS' }],
      design: { backgroundColor: '#1E3A8A', textColor: '#FFFFFF', logoUrl: null },
    } as unknown as CardConfigDto);
  });

  it('lista las sucursales con sus botones de acción', async () => {
    render(<Locations brandId="brand-1" />);

    expect(await screen.findByText('Sucursal Centro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link y QR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kit de Mesón/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeInTheDocument();

    const item = screen.getByText('Sucursal Centro').closest('li');
    expect(item).toHaveClass('min-w-0');
    expect(item).toHaveClass('overflow-hidden');
  });

  it('copia el link para clientes al portapapeles al hacer clic en el contenedor', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<Locations brandId="brand-1" />);

    const copyBtn = await screen.findByRole('button', { name: 'Copiar' });
    expect(copyBtn).toBeInTheDocument();
    await userEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('centro'));
    expect(await screen.findByText('¡Copiado!')).toBeInTheDocument();
  });

  it('abre el modal del Kit para Imprimir en tu Local al hacer clic en Kit de Mesón', async () => {
    render(<Locations brandId="brand-1" />);

    const kitButton = await screen.findByRole('button', { name: /Kit de Mesón/i });
    await userEvent.click(kitButton);

    expect(await screen.findByText('Kit para Imprimir en tu Local')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Junta 10 sellos y llévate Café gratis')).toBeInTheDocument();
  });

  it('abre el modal de Link y QR al hacer clic en Link y QR', async () => {
    render(<Locations brandId="brand-1" />);

    const qrButton = await screen.findByRole('button', { name: 'Link y QR' });
    await userEvent.click(qrButton);

    expect(await screen.findByText('Link y QR · Sucursal Centro')).toBeInTheDocument();
  });

  it('abre el Kit de Mesón desde Link y QR manteniendo un solo modal activo y permitiendo regresar', async () => {
    render(<Locations brandId="brand-1" />);

    // 1. Abrir Link y QR
    const qrButton = await screen.findByRole('button', { name: 'Link y QR' });
    await userEvent.click(qrButton);
    expect(await screen.findByText('Link y QR · Sucursal Centro')).toBeInTheDocument();

    // 2. Abrir Kit de Mesón desde dentro del modal de Link y QR
    const openKitFromQrBtn = screen.getByRole('button', { name: /Kit para Mesón \/ Caja/i });
    await userEvent.click(openKitFromQrBtn);

    // Debe mostrar el modal del Kit y no competir con el modal de Link y QR
    expect(await screen.findByText('Kit para Imprimir en tu Local')).toBeInTheDocument();
    expect(screen.queryByText('Link y QR · Sucursal Centro')).not.toBeInTheDocument();

    // 3. Probar navegación con teclado (Tab) desde el botón Cerrar
    const closeKitBtn = screen.getByRole('button', { name: 'Cerrar' });
    closeKitBtn.focus();
    expect(document.activeElement).toBe(closeKitBtn);
    await userEvent.tab();
    expect(document.activeElement).not.toBe(closeKitBtn);

    // 4. Cerrar el Kit de Mesón debe regresar a Link y QR
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(await screen.findByText('Link y QR · Sucursal Centro')).toBeInTheDocument();
    expect(screen.queryByText('Kit para Imprimir en tu Local')).not.toBeInTheDocument();

    // 5. Cerrar Link y QR vuelve a la lista principal
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByText('Link y QR · Sucursal Centro')).not.toBeInTheDocument();
  });
});