import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanReward } from '../ScanViews';
import { ScanResult } from '../../../services/scanService';

const cafe = { id: 'promo-cafe', name: 'Café', rewardName: 'Café gratis', targetStamps: 3 };
const almuerzo = { id: 'promo-almuerzo', name: 'Almuerzo', rewardName: 'Almuerzo gratis', targetStamps: 8 };

function renderReward(result: ScanResult) {
  const redeemed: (string | undefined)[] = [];
  let resets = 0;
  render(<ScanReward result={result} onRedeem={(id) => redeemed.push(id)} onReset={() => resets++} />);
  return { redeemed, resets: () => resets };
}

describe('ScanReward', () => {
  it('lists every active promotion and disables the ones the balance does not cover', () => {
    renderReward({
      ok: true,
      stampsCount: 4,
      rewardUnlocked: true,
      availablePromotions: [
        { ...almuerzo, canRedeem: false },
        { ...cafe, canRedeem: true },
      ],
    });

    expect(screen.getByText('4 sellos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^café gratis/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^almuerzo gratis/i })).toBeDisabled();
    expect(screen.getByText('Faltan 4')).toBeInTheDocument();
  });

  it('preselects the only redeemable promotion and redeems it', () => {
    const { redeemed } = renderReward({
      ok: true,
      stampsCount: 4,
      rewardUnlocked: true,
      availablePromotions: [
        { ...almuerzo, canRedeem: false },
        { ...cafe, canRedeem: true },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Entregar Café gratis' }));
    expect(redeemed).toEqual(['promo-cafe']);
  });

  it('makes the cashier choose when several promotions are redeemable', () => {
    const { redeemed } = renderReward({
      ok: true,
      stampsCount: 9,
      rewardUnlocked: true,
      availablePromotions: [
        { ...almuerzo, canRedeem: true },
        { ...cafe, canRedeem: true },
      ],
    });

    const confirm = screen.getByRole('button', { name: 'Elige un premio' });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^almuerzo gratis/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Entregar Almuerzo gratis' }));

    expect(redeemed).toEqual(['promo-almuerzo']);
  });

  it('lets the customer keep collecting without redeeming', () => {
    const { redeemed, resets } = renderReward({
      ok: true,
      stampsCount: 4,
      rewardUnlocked: true,
      availablePromotions: [{ ...cafe, canRedeem: true }],
    });

    fireEvent.click(screen.getByRole('button', { name: /seguir juntando/i }));

    expect(resets()).toBe(1);
    expect(redeemed).toEqual([]);
  });

  it('warns that this visit was NOT stamped when the customer is in the 30-min cooldown', () => {
    renderReward({
      ok: true,
      stampsCount: 5,
      rewardUnlocked: true,
      alreadyScanned: true,
      message: 'Este cliente ya recibió un sello. Podrá sumar otro en 12 min',
      availablePromotions: [{ ...cafe, canRedeem: true }],
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sello de esta visita no sumado. Este cliente ya recibió un sello. Podrá sumar otro en 12 min',
    );
  });

  it('does not show the cooldown warning on a normal stamp', () => {
    renderReward({ ok: true, stampsCount: 5, rewardUnlocked: true, availablePromotions: [{ ...cafe, canRedeem: true }] });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
