import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanValidation } from '../ScanValidation';
import type { ScanValidation as Validation, StampExtras } from '../../../services/scanService';

const base: Validation = {
  validationToken: 'token-1',
  passId: 'pass-1',
  method: 'QR',
  customerLabel: 'María',
  hasName: true,
  stampsCount: 3,
  targetStamps: 5,
  rewardName: 'Café gratis',
  rewardUnlocked: false,
  availablePromotions: [],
  nextStampAvailableAt: null,
  canStamp: true,
  maxStampsPerLoad: 1,
  reasonRequired: false,
  cardType: 'STAMPS',
  pesosPerPoint: 1000,
  amountRequired: false,
  receiptRequired: false,
};

function setup(overrides: Partial<Validation> = {}) {
  const added: StampExtras[] = [];
  const onScanAnother = vi.fn();
  const onRedeem = vi.fn();
  render(
    <ScanValidation
      validation={{ ...base, ...overrides }}
      onAddStamp={(extras) => added.push(extras)}
      onScanAnother={onScanAnother}
      onRedeem={onRedeem}
    />,
  );
  return { added, onScanAnother, onRedeem };
}

describe('ScanValidation', () => {
  it('shows the first name and the balance without adding anything yet', () => {
    const { added } = setup();

    expect(screen.getByRole('heading', { name: 'María' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    expect(added).toEqual([]);
  });

  it('adds the stamp with the optional purchase data', () => {
    const { added } = setup();

    fireEvent.change(screen.getByLabelText(/monto de la compra/i), { target: { value: '12.500' } });
    fireEvent.change(screen.getByLabelText(/nota/i), { target: { value: '  Mesa 4 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar sello' }));

    expect(added).toEqual([{ purchaseAmount: 12500, note: 'Mesa 4', receipt: undefined }]);
  });

  it('adds the stamp with every field empty', () => {
    const { added } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar sello' }));

    expect(added).toEqual([{ purchaseAmount: undefined, note: undefined, receipt: undefined }]);
  });

  it('attaches the receipt photo and rejects other file types', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:boleta');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { added } = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('capture', 'environment');

    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'boleta.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG o PNG');

    const photo = new File(['jpeg'], 'boleta.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [photo] } });
    expect(await screen.findByAltText('Foto de la boleta')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar sello' }));
    expect(added[0].receipt).toBe(photo);
  });

  it('discards everything with "Escanear otro sello"', () => {
    const { added, onScanAnother } = setup();

    fireEvent.change(screen.getByLabelText(/monto de la compra/i), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro sello' }));

    expect(onScanAnother).toHaveBeenCalledTimes(1);
    expect(added).toEqual([]);
  });

  it('offers the redemption when the balance covers a reward', () => {
    const { onRedeem } = setup({ rewardUnlocked: true, stampsCount: 5 });

    fireEvent.click(screen.getByRole('button', { name: 'Canjear premio' }));

    expect(onRedeem).toHaveBeenCalledTimes(1);
  });

  it('does not let the STAFF stamp during the cooldown', () => {
    setup({ canStamp: false, nextStampAvailableAt: '2026-10-03T15:30:00.000Z' });

    expect(screen.getByRole('status')).toHaveTextContent(/podrá sumar otro/i);
    expect(screen.getByRole('button', { name: 'Agregar sello' })).toBeDisabled();
  });

  it('lets the OWNER load several stamps only with a reason', () => {
    const { added } = setup({ maxStampsPerLoad: 10 });

    expect(screen.queryByLabelText('Motivo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Un sello más' }));
    fireEvent.click(screen.getByRole('button', { name: 'Un sello más' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar 3 sellos' }));

    expect(added).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent(/indica el motivo/i);

    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Compensación por reclamo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar 3 sellos' }));

    expect(added).toEqual([
      expect.objectContaining({ stampCount: 3, reason: 'Compensación por reclamo' }),
    ]);
  });

  it('asks the OWNER for a reason to stamp during the cooldown', () => {
    const { added } = setup({
      maxStampsPerLoad: 10,
      canStamp: true,
      reasonRequired: true,
      nextStampAvailableAt: '2026-10-03T15:30:00.000Z',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Agregar sello' }));
    expect(added).toEqual([]);

    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Segunda compra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar sello' }));
    expect(added).toEqual([expect.objectContaining({ stampCount: 1, reason: 'Segunda compra' })]);
  });

  describe('tarjeta de puntos', () => {
    const points = { cardType: 'POINTS' as const, amountRequired: true, receiptRequired: true, stampsCount: 40, targetStamps: 100 };
    const receipt = () => new File(['x'], 'boleta.png', { type: 'image/png' });

    it('requires the amount and shows the points it gives', () => {
      const { added } = setup(points);

      fireEvent.click(screen.getByRole('button', { name: 'Sumar puntos' }));
      expect(added).toEqual([]);
      expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/monto de la compra/);

      fireEvent.change(screen.getByLabelText(/Monto de la compra/), { target: { value: '12500' } });
      expect(screen.getByText(/Suma 12 puntos/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sumar 12 puntos' })).toBeInTheDocument();
    });

    it('asks the STAFF for the receipt photo', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:boleta');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const { added } = setup(points);
      fireEvent.change(screen.getByLabelText(/Monto de la compra/), { target: { value: '5000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sumar 5 puntos' }));

      expect(added).toEqual([]);
      expect(screen.getByRole('alert')).toHaveTextContent(/foto de la boleta/);

      fireEvent.change(screen.getByLabelText(/Foto de la boleta|Tomar foto/, { selector: 'input' }), {
        target: { files: [receipt()] },
      });
      await screen.findByAltText('Foto de la boleta');
      fireEvent.click(screen.getByRole('button', { name: 'Sumar 5 puntos' }));
      expect(added).toEqual([expect.objectContaining({ purchaseAmount: 5000, receipt: expect.any(File) })]);
    });

    it('rejects an amount below one point', () => {
      setup(points);
      fireEvent.change(screen.getByLabelText(/Monto de la compra/), { target: { value: '900' } });
      expect(screen.getByRole('alert')).toHaveTextContent('1 punto cada $1.000');
    });
  });
});
