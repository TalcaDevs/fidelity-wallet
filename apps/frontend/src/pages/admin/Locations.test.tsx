import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardConfigDto, LocationDto } from '@fidelity/shared';
import { Locations } from './Locations';
import * as locationsService from '../../services/locationsService';
import * as cardService from '../../services/cardService';
import * as toastHook from '../../hooks/useToast';

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
});
