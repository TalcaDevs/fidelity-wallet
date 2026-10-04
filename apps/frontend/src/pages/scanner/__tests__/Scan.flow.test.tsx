import { beforeEach, describe, expect, it, vi } from 'vitest';
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
};

function renderScanner() {
  render(
    <MemoryRouter>
      <Scan merchantId="m-1" session={{ user: { email: 'cajero@local.cl' } } as Session} role="STAFF" />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /comenzar a escanear/i }));
}

describe('Scan flow', () => {
  beforeEach(() => {
    validateScan.mockReset();
    processScan.mockReset();
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
      extras: { purchaseAmount: 8000, note: undefined, receipt: undefined },
    });
    expect(screen.getByRole('button', { name: 'Canjear premio' })).toBeInTheDocument();
  });

  it('goes back to the camera with "Escanear otro sello" without stamping', async () => {
    validateScan.mockResolvedValue(validation);
    renderScanner();

    fireEvent.click(screen.getByRole('button', { name: 'Simular QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Escanear otro sello' }));

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
});
