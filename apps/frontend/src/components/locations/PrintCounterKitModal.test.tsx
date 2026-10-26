import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardConfigDto, LocationDto } from '@fidelity/shared';
import { PrintCounterKitModal } from './PrintCounterKitModal';
import * as printHelpers from './printKitHelpers';
import * as toastHook from '../../hooks/useToast';

const mockLocation = {
  id: 'loc-1',
  name: 'Café Providencia',
  slug: 'cafe-provi',
  commune: 'Providencia',
  isActive: true,
} as LocationDto;

const mockCardConfig = {
  brandName: 'Café Delicioso',
  type: 'STAMPS',
  rewards: [{ name: 'Café Americano Gratis', target: 8, currency: 'STAMPS' }],
  design: {
    backgroundColor: '#7A4B66',
    textColor: '#FFFFFF',
    logoUrl: 'https://example.com/logo.png',
  },
} as unknown as CardConfigDto;

describe('PrintCounterKitModal', () => {
  const notifySuccess = vi.fn();
  const notifyError = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(toastHook, 'useToast').mockReturnValue({ notifySuccess, notifyError });
  });

  it('muestra el modal con la marca, local y texto dinámico de recompensa', async () => {
    render(
      <PrintCounterKitModal
        location={mockLocation}
        cardConfig={mockCardConfig}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Kit para Imprimir en tu Local')).toBeInTheDocument();
    expect(screen.getByAltText('Café Delicioso')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Junta 8 sellos y llévate Café Americano Gratis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Imprimir \/ Guardar como PDF/i })).toBeInTheDocument();
  });

  it('muestra el nombre en texto si la marca no tiene logo cargado', () => {
    const configWithoutLogo = {
      ...mockCardConfig,
      design: { ...mockCardConfig.design, logoUrl: null },
    } as unknown as CardConfigDto;

    render(
      <PrintCounterKitModal
        location={mockLocation}
        cardConfig={configWithoutLogo}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Café Delicioso')).toBeInTheDocument();
  });

  it('permite cambiar entre tamaño A5, Carta y Oficio', async () => {
    render(
      <PrintCounterKitModal
        location={mockLocation}
        cardConfig={mockCardConfig}
        onClose={vi.fn()}
      />,
    );

    const letterButton = screen.getByRole('button', { name: /Carta/i });
    await userEvent.click(letterButton);
    expect(screen.getByText('LETTER')).toBeInTheDocument();

    const oficioButton = screen.getByRole('button', { name: /Oficio/i });
    await userEvent.click(oficioButton);
    expect(screen.getByText('OFICIO')).toBeInTheDocument();

    const a5Button = screen.getByRole('button', { name: /A5/i });
    await userEvent.click(a5Button);
    expect(screen.getAllByText('A5').length).toBeGreaterThan(0);
  });

  it('permite cambiar a modo Blanco y Negro (Ahorro)', async () => {
    render(
      <PrintCounterKitModal
        location={mockLocation}
        cardConfig={mockCardConfig}
        onClose={vi.fn()}
      />,
    );

    const monoButton = screen.getByRole('button', { name: /B&N/i });
    await userEvent.click(monoButton);

    expect(monoButton).toHaveClass('text-brand-blue');
  });

  it('permite editar la promesa y restablecerla', async () => {
    render(
      <PrintCounterKitModal
        location={mockLocation}
        cardConfig={mockCardConfig}
        onClose={vi.fn()}
      />,
    );

    const input = screen.getByDisplayValue('Junta 8 sellos y llévate Café Americano Gratis');
    await userEvent.clear(input);
    await userEvent.type(input, '¡Junta 5 sellos y tu postre va por la casa!');

    expect(screen.getByDisplayValue('¡Junta 5 sellos y tu postre va por la casa!')).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: 'Restablecer' });
    await userEvent.click(resetButton);

    expect(screen.getByDisplayValue('Junta 8 sellos y llévate Café Americano Gratis')).toBeInTheDocument();
  });

  it('ejecuta printCounterFlyer al hacer clic en Imprimir', async () => {
    const printSpy = vi.spyOn(printHelpers, 'printCounterFlyer').mockResolvedValue();

    render(
      <PrintCounterKitModal
        location={mockLocation}
        cardConfig={mockCardConfig}
        onClose={vi.fn()}
      />,
    );

    // Esperar a que el QR se genere para habilitar el botón
    const printButton = screen.getByRole('button', { name: /Imprimir \/ Guardar como PDF/i });
    await waitFor(() => expect(printButton).not.toBeDisabled());

    await userEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        paperSize: 'A5',
        brandName: 'Café Delicioso',
        locationName: 'Café Providencia',
        primaryColor: '#7A4B66',
      }),
    );
    expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('impresión abierto'));
  });

  it('cierra el modal al invocar onClose', async () => {
    const onClose = vi.fn();
    render(
      <PrintCounterKitModal
        location={mockLocation}
        cardConfig={mockCardConfig}
        onClose={onClose}
      />,
    );

    const closeBtn = screen.getByRole('button', { name: 'Cerrar' });
    await userEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
