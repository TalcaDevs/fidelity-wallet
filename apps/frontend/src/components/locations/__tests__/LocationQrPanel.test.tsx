import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationDto } from '@fidelity/shared';
import { LocationQrPanel } from '../LocationQrPanel';
import * as merchantService from '../../../services/merchantService';
import * as toastHook from '../../../hooks/useToast';

const location = { id: 'loc-1', name: 'Centro', slug: 'cafe-centro' } as LocationDto;

describe('LocationQrPanel', () => {
  const notifySuccess = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(toastHook, 'useToast').mockReturnValue({ notifySuccess, notifyError: vi.fn() });
  });

  it('muestra el QR del link de registro del local', async () => {
    render(<LocationQrPanel location={location} onSlugChange={vi.fn()} />);
    expect(screen.getByText(`${window.location.origin}/join/cafe-centro`)).toBeInTheDocument();
    const img = await screen.findByAltText('QR de registro de Centro');
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(screen.getByRole('link', { name: 'Descargar PNG' })).toHaveAttribute('download', 'qr-cafe-centro.png');
  });

  it('cambia el slug por el backend y avisa que hay que reimprimir', async () => {
    const update = vi.spyOn(merchantService, 'updateMerchantSlug').mockResolvedValue('cafe-plaza');
    const onSlugChange = vi.fn();
    render(<LocationQrPanel location={location} onSlugChange={onSlugChange} />);

    const button = screen.getByRole('button', { name: 'Cambiar link' });
    expect(button).toBeDisabled();
    const input = screen.getByLabelText('Personalizar el link');
    await userEvent.clear(input);
    await userEvent.type(input, 'cafe-plaza');
    await userEvent.click(button);

    await waitFor(() => expect(onSlugChange).toHaveBeenCalledWith('cafe-plaza'));
    expect(update).toHaveBeenCalledWith('loc-1', 'cafe-plaza');
    expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('reimprimir'));
  });

  it('muestra el error del backend si el slug está tomado', async () => {
    vi.spyOn(merchantService, 'updateMerchantSlug').mockRejectedValue(new Error('Ese link ya está en uso'));
    const onSlugChange = vi.fn();
    render(<LocationQrPanel location={location} onSlugChange={onSlugChange} />);

    const input = screen.getByLabelText('Personalizar el link');
    await userEvent.clear(input);
    await userEvent.type(input, 'otro');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar link' }));

    expect(await screen.findByText('Ese link ya está en uso')).toBeInTheDocument();
    expect(onSlugChange).not.toHaveBeenCalled();
  });

  it('abre el modal del Kit de Mesón al hacer clic en el botón correspondiente', async () => {
    render(<LocationQrPanel location={location} onSlugChange={vi.fn()} />);

    const kitButton = screen.getByRole('button', { name: /Kit para Mesón \/ Caja/i });
    await userEvent.click(kitButton);

    expect(screen.getByText('Kit para Imprimir en tu Local')).toBeInTheDocument();
  });

  it('invoca onOpenKit cuando se provee la prop en lugar de montar el modal internamente', async () => {
    const onOpenKit = vi.fn();
    render(<LocationQrPanel location={location} onSlugChange={vi.fn()} onOpenKit={onOpenKit} />);

    const kitButton = screen.getByRole('button', { name: /Kit para Mesón \/ Caja/i });
    await userEvent.click(kitButton);

    expect(onOpenKit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Kit para Imprimir en tu Local')).not.toBeInTheDocument();
  });

  it('deshabilita los botones del kit mientras cardLoading es true', () => {
    render(<LocationQrPanel location={location} onSlugChange={vi.fn()} cardLoading={true} />);

    expect(screen.getByRole('button', { name: /Kit para Mesón \/ Caja/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();
  });
});