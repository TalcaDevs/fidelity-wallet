import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

const validateScan = vi.fn();
const processScan = vi.fn();

vi.mock('../../../services/scanService', () => ({
  validateScan: (...args: unknown[]) => validateScan(...args),
  processScan: (...args: unknown[]) => processScan(...args),
}));

vi.mock('../QRCam', () => ({
  QRCam: ({ onScanSuccess }: { onScanSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onScanSuccess('qr-token')}>Simular QR</button>
  ),
}));

vi.mock('../../../hooks/useScanFeedback', () => ({
  useScanFeedback: () => ({ triggerFeedback: vi.fn(), resumeAudio: vi.fn() }),
}));

vi.mock('../../../hooks/useSignOut', () => ({ useSignOut: () => vi.fn() }));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(),
    },
  },
}));

import { Scan } from '../Scan';

const validation = {
  ok: true,
  validationToken: 'token-1',
  passId: 'pass-1',
  method: 'QR',
  customerLabel: 'María',
  hasName: true,
  stampsCount: 4,
  targetStamps: 5,
  rewardName: 'Café gratis',
  rewardUnlocked: false,
  availablePromotions: [],
  nextStampAvailableAt: null,
  canStamp: true,
  maxStampsPerLoad: 1,
  reasonRequired: false,
  cardType: 'STAMPS',
  stampsEnabled: true,
  pointsEnabled: false,
  pointsCount: 0,
  nextPointsAvailableAt: null,
  canAddPoints: true,
  pointsReasonRequired: false,
  pesosPerPoint: 1000,
  amountRequired: false,
  receiptRequired: false,
};

function renderScanner(role: 'STAFF' | 'OWNER' = 'STAFF', startCamera = true) {
  render(
    <MemoryRouter>
      <Scan merchantId="m-1" session={{ user: { email: 'cajero@local.cl' } } as Session} role={role} />
    </MemoryRouter>,
  );
  if (startCamera) fireEvent.click(screen.getByRole('button', { name: /comenzar a escanear/i }));
}

describe('Scan flow', () => {
  beforeEach(() => {
    validateScan.mockReset();
    processScan.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves purchase details and does not submit or restart scanning when changing theme', async () => {
    validateScan.mockResolvedValue(validation);
    renderScanner();
    fireEvent.click(screen.getByRole('button', { name: 'Simular QR' }));
    const amount = await screen.findByLabelText(/monto de la compra/i);
    fireEvent.change(amount, { target: { value: '8000' } });
    fireEvent.change(screen.getByLabelText(/nota/i), { target: { value: 'Mesa 4' } });
    fireEvent.click(screen.getByRole('button', { name: /activar modo/i }));
    expect(amount).toHaveValue('8.000');
    expect(screen.getByLabelText(/nota/i)).toHaveValue('Mesa 4');
    expect(screen.getByRole('button', { name: 'Agregar sello' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Simular QR' })).not.toBeInTheDocument();
    expect(validateScan).toHaveBeenCalledOnce();
    expect(processScan).not.toHaveBeenCalled();
  });

  it('validates on scan and only stamps after "Agregar sello"', async () => {
    validateScan.mockResolvedValue(validation);
    processScan.mockResolvedValue({
      ok: true,
      customerLabel: 'María',
      stampsCount: 5,
      stampsAdded: 1,
      targetStamps: 5,
      rewardUnlocked: true,
    });
    renderScanner();

    fireEvent.click(screen.getByRole('button', { name: 'Simular QR' }));
    expect(await screen.findByRole('heading', { name: 'María' })).toBeInTheDocument();
    expect(validateScan).toHaveBeenCalledWith({ merchantId: 'm-1', target: { passToken: 'qr-token' } });
    expect(processScan).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/monto de la compra/i), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar sello' }));

    expect(await screen.findByRole('heading', { name: '¡Sello agregado!' })).toBeInTheDocument();
    expect(processScan).toHaveBeenCalledWith({
      merchantId: 'm-1',
      action: 'STAMP',
      target: { validationToken: 'token-1' },
      extras: { purchaseAmount: 8000, note: undefined, receipt: undefined, stampCount: 1 },
    });
    expect(screen.getByRole('button', { name: 'Canjear premio' })).toBeInTheDocument();
  });

  it('goes back to the camera with "Escanear otro cliente" without stamping', async () => {
    validateScan.mockResolvedValue(validation);
    renderScanner();

    fireEvent.click(screen.getByRole('button', { name: 'Simular QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Escanear otro cliente' }));

    expect(screen.getByRole('button', { name: 'Simular QR' })).toBeInTheDocument();
    expect(processScan).not.toHaveBeenCalled();
  });

  it('opens the redemption from the validation and comes back to it', async () => {
    validateScan.mockResolvedValue({
      ...validation,
      stampsCount: 5,
      rewardUnlocked: true,
      availablePromotions: [{ id: 'promo-1', name: 'Café', rewardName: 'Café gratis', targetStamps: 5, canRedeem: true }],
    });
    renderScanner();

    fireEvent.click(screen.getByRole('button', { name: 'Simular QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Canjear premio' }));
    expect(screen.getByText('¡Puede canjear un premio!')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /seguir juntando/i }));
    expect(screen.getByRole('heading', { name: 'María' })).toBeInTheDocument();
  });

  it('shows the error when the customer is not found', async () => {
    validateScan.mockResolvedValue({ ok: false, error: 'El cliente no tiene una tarjeta en este comercio' });
    renderScanner();

    fireEvent.click(screen.getByRole('button', { name: 'Simular QR' }));

    expect(await screen.findByText('El cliente no tiene una tarjeta en este comercio')).toBeInTheDocument();
  });

  it.each([false, true])('redeems points directly from validation without a purchase (dual=%s)', async (dual) => {
    validateScan.mockResolvedValue({
      ...validation,
      cardType: dual ? 'STAMPS' : 'POINTS',
      stampsEnabled: dual,
      pointsEnabled: true,
      stampsCount: 7,
      pointsCount: 150,
      rewardUnlocked: true,
      rewardCurrency: 'POINTS',
      amountRequired: true,
      receiptRequired: true,
      availablePromotions: [
        { id: 'stamp-promo', name: 'Sellos', rewardName: 'Café', targetStamps: 5, canRedeem: true, currency: 'STAMPS' },
        { id: 'point-promo', name: 'Puntos', rewardName: 'Almuerzo', targetStamps: 100, canRedeem: true, currency: 'POINTS' },
      ],
    });
    processScan.mockResolvedValue({ ok: true, customerLabel: 'María', pointsCount: 50 });
    renderScanner();
    fireEvent.click(screen.getByRole('button', { name: 'Simular QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Canjear premio' }));
    expect(screen.getByText(dual ? '7 sellos · 150 puntos' : '150 puntos')).toBeInTheDocument();
    expect(screen.getByText('100 Puntos')).toBeInTheDocument();
    if (dual) {
      expect(screen.getByText('5 Sellos')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Almuerzo.*100 Puntos/ }));
    } else {
      expect(screen.queryByText('5 Sellos')).not.toBeInTheDocument();
    }
    expect(processScan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Entregar Almuerzo' }));
    expect(await screen.findByRole('heading', { name: '¡Premio entregado!' })).toBeInTheDocument();
    expect(processScan).toHaveBeenCalledExactlyOnceWith({
      merchantId: 'm-1', action: 'REDEEM', target: { validationToken: 'token-1' }, promotionId: 'point-promo',
    });
  });

  it.each(['STAFF', 'OWNER'] as const)('adds and redeems points through manual lookup without starting the camera as %s', async (role) => {
    const receiptRequired = role === 'STAFF';
    validateScan.mockResolvedValue({
      ...validation,
      method: 'MANUAL',
      cardType: 'POINTS',
      stampsEnabled: false,
      pointsEnabled: true,
      stampsCount: 0,
      pointsCount: 90,
      targetStamps: 100,
      amountRequired: true,
      receiptRequired,
    });
    processScan.mockResolvedValueOnce({
      ok: true,
      customerLabel: 'María',
      pointsCount: 102,
      stampsAdded: 0,
      pointsAdded: 12,
      targetStamps: 100,
      rewardUnlocked: true,
      availablePromotions: [{ id: 'promo-1', name: 'Café', rewardName: 'Café gratis', targetStamps: 100, canRedeem: true, currency: 'POINTS' }],
    }).mockResolvedValueOnce({ ok: true, customerLabel: 'María', pointsCount: 2 });
    renderScanner(role, false);

    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Correo' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), { target: { value: 'maria@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar cliente/i }));

    expect(await screen.findByRole('heading', { name: 'María' })).toBeInTheDocument();
    expect(validateScan).toHaveBeenCalledWith({ merchantId: 'm-1', target: { customer: { email: 'maria@example.com' } } });
    expect(screen.queryByRole('button', { name: 'Simular QR' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sumar puntos' }));
    expect(processScan).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/monto de la compra/i);

    fireEvent.change(screen.getByLabelText(/monto de la compra/i), { target: { value: '12500' } });
    const receipt = role === 'STAFF' ? new File(['jpeg'], 'boleta.jpg', { type: 'image/jpeg' }) : undefined;
    if (receipt) {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:receipt');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [receipt] } });
      await screen.findByAltText('Foto de la boleta');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 12 puntos' }));

    expect(await screen.findByRole('heading', { name: '¡12 puntos agregados!' })).toBeInTheDocument();
    expect(screen.getByText('Puntos acumulados')).toBeInTheDocument();
    expect(processScan).toHaveBeenNthCalledWith(1, {
      merchantId: 'm-1',
      action: 'STAMP',
      target: { validationToken: 'token-1' },
      extras: { purchaseAmount: 12500, note: undefined, receipt, stampCount: 0 },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Canjear premio' }));
    expect(screen.getByText('102 puntos')).toBeInTheDocument();
    expect(screen.getByText('100 Puntos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entregar Café gratis' }));
    expect(await screen.findByRole('heading', { name: '¡Premio entregado!' })).toBeInTheDocument();
    expect(processScan).toHaveBeenNthCalledWith(2, {
      merchantId: 'm-1',
      action: 'REDEEM',
      target: { validationToken: 'token-1' },
      promotionId: 'promo-1',
    });
  });
});
