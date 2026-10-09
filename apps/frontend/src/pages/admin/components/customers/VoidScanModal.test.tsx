import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PurchaseHistoryEntryDto } from '@fidelity/shared';
import { VoidScanModal } from './VoidScanModal';
import * as customersService from '../../../../services/customersService';

const mockEntry: PurchaseHistoryEntryDto = {
  id: 'scan-123',
  type: 'STAMP_ADDED',
  createdAt: '2026-10-06T12:30:00Z',
  method: 'QR',
  locationName: 'Sucursal Las Condes',
  staffEmail: 'cajero@test.cl',
  stamps: 2,
  points: 0,
  purchaseAmount: 9900,
  note: 'Mesa 5',
  rewardName: null,
  receiptUrl: null,
};

describe('VoidScanModal Component', () => {
  const onClose = vi.fn();
  const onVoided = vi.fn();
  const brandId = 'brand-abc';
  const customerId = 'customer-xyz';
  const customerName = 'Camila Soto';

  beforeEach(() => {
    vi.restoreAllMocks();
    onClose.mockReset();
    onVoided.mockReset();
  });

  it('renders load details correctly in the modal', () => {
    render(
      <VoidScanModal
        brandId={brandId}
        customerId={customerId}
        customerName={customerName}
        entry={mockEntry}
        onClose={onClose}
        onVoided={onVoided}
      />,
    );

    expect(screen.getByText('Anular carga de sellos')).toBeInTheDocument();
    expect(screen.getByText(/Camila Soto/i)).toBeInTheDocument();
    expect(screen.getByText('2 sellos')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Las Condes')).toBeInTheDocument();
    expect(screen.getByText(/9\.900/)).toBeInTheDocument();
    expect(screen.getByText('“Mesa 5”')).toBeInTheDocument();
  });

  it('adapts modal title to "Anular carga de puntos" for points-only entries', () => {
    const pointsEntry: PurchaseHistoryEntryDto = {
      ...mockEntry,
      stamps: 0,
      points: 150,
    };

    render(
      <VoidScanModal
        brandId={brandId}
        customerId={customerId}
        customerName={customerName}
        entry={pointsEntry}
        onClose={onClose}
        onVoided={onVoided}
      />,
    );

    expect(screen.getByText('Anular carga de puntos')).toBeInTheDocument();
    expect(screen.getByText('150 puntos')).toBeInTheDocument();
  });

  it('adapts modal title to "Anular carga de sellos y puntos" for dual entries', () => {
    const dualEntry: PurchaseHistoryEntryDto = {
      ...mockEntry,
      stamps: 1,
      points: 200,
    };

    render(
      <VoidScanModal
        brandId={brandId}
        customerId={customerId}
        customerName={customerName}
        entry={dualEntry}
        onClose={onClose}
        onVoided={onVoided}
      />,
    );

    expect(screen.getByText('Anular carga de sellos y puntos')).toBeInTheDocument();
    expect(screen.getByText('1 sello y 200 puntos')).toBeInTheDocument();
  });

  it('validates minimum 5 characters for the reason', async () => {
    render(
      <VoidScanModal
        brandId={brandId}
        customerId={customerId}
        customerName={customerName}
        entry={mockEntry}
        onClose={onClose}
        onVoided={onVoided}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 5 caracteres/i);
    expect(onVoided).not.toHaveBeenCalled();

    // Type 4 characters -> still invalid
    fireEvent.change(screen.getByLabelText(/motivo de la anulación/i), {
      target: { value: 'test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/al menos 5 caracteres/i);
  });

  it('submits valid void request and calls onVoided', async () => {
    const mockResult = {
      scanId: 'scan-123',
      voidedAt: '2026-10-08T15:00:00Z',
      activeStamps: 3,
      activePoints: 0,
      stampsDeducted: 2,
      pointsDeducted: 0,
    };
    const voidSpy = vi.spyOn(customersService, 'voidCustomerScan').mockResolvedValue(mockResult);

    render(
      <VoidScanModal
        brandId={brandId}
        customerId={customerId}
        customerName={customerName}
        entry={mockEntry}
        onClose={onClose}
        onVoided={onVoided}
      />,
    );

    fireEvent.change(screen.getByLabelText(/motivo de la anulación/i), {
      target: { value: 'Error en caja: se digitó dos veces' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));

    await waitFor(() => expect(voidSpy).toHaveBeenCalledTimes(1));
    expect(voidSpy).toHaveBeenCalledWith(
      customerId,
      'scan-123',
      brandId,
      'Error en caja: se digitó dos veces',
    );
    expect(onVoided).toHaveBeenCalledWith(mockResult);
  });

  it('displays API error when voidCustomerScan fails', async () => {
    vi.spyOn(customersService, 'voidCustomerScan').mockRejectedValue(
      new Error('Los sellos ya fueron utilizados en un canje'),
    );

    render(
      <VoidScanModal
        brandId={brandId}
        customerId={customerId}
        customerName={customerName}
        entry={mockEntry}
        onClose={onClose}
        onVoided={onVoided}
      />,
    );

    fireEvent.change(screen.getByLabelText(/motivo de la anulación/i), {
      target: { value: 'Error en caja al cargar sello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Los sellos ya fueron utilizados en un canje');
    expect(onVoided).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking Cancelar button', () => {
    render(
      <VoidScanModal
        brandId={brandId}
        customerId={customerId}
        customerName={customerName}
        entry={mockEntry}
        onClose={onClose}
        onVoided={onVoided}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
