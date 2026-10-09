import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { CustomerHistoryDto } from '@fidelity/shared';
import { PurchaseHistory } from './PurchaseHistory';

const mockData: CustomerHistoryDto = {
  customer: {
    id: 'c-1',
    name: 'Juan Valdés',
    email: 'juan@cafe.cl',
    phone: '+56987654321',
    rut: '11.222.333-4',
    birthDay: 10,
    birthMonth: 5,
    birthYear: 1990,
    joinedAt: '2026-08-15T10:00:00Z',
    activeStamps: 4,
    activePoints: 0,
    homeLocationId: 'loc-1',
  },
  totals: { visits: 5, redemptions: 1, purchaseAmount: 25000 },
  cardType: 'STAMPS',
  maxStampsPerLoad: 10,
  history: {
    page: 1,
    pageSize: 20,
    total: 3,
    items: [
      {
        id: 'scan-active-1',
        type: 'STAMP_ADDED',
        createdAt: '2026-10-05T14:00:00Z',
        method: 'QR',
        locationName: 'Sucursal Providencia',
        staffEmail: 'cajero@cafe.cl',
        stamps: 2,
        points: 0,
        purchaseAmount: 8500,
        note: 'Mesa 2',
        rewardName: null,
        receiptUrl: null,
      },
      {
        id: 'scan-voided-1',
        type: 'STAMP_ADDED',
        createdAt: '2026-10-03T11:00:00Z',
        method: 'MANUAL',
        locationName: 'Sucursal Centro',
        staffEmail: 'admin@cafe.cl',
        stamps: 1,
        points: 0,
        purchaseAmount: 4000,
        note: null,
        rewardName: null,
        receiptUrl: null,
        voidedAt: '2026-10-04T09:00:00Z',
        voidReason: 'Carga duplicada por error en caja',
      },
      {
        id: 'scan-redeem-1',
        type: 'REWARD_REDEEMED',
        createdAt: '2026-10-02T16:00:00Z',
        method: 'QR',
        locationName: 'Sucursal Centro',
        staffEmail: null,
        stamps: 5,
        points: 0,
        purchaseAmount: null,
        note: null,
        rewardName: 'Café de especialidad gratis',
        receiptUrl: null,
      },
    ],
  },
};

describe('PurchaseHistory Component', () => {
  it('renders customer profile information and stats', () => {
    render(<PurchaseHistory data={mockData} onPage={vi.fn()} />);

    expect(screen.getByText('Juan Valdés')).toBeInTheDocument();
    expect(screen.getByText('juan@cafe.cl')).toBeInTheDocument();
    expect(screen.getByText('11.222.333-4')).toBeInTheDocument();
    expect(screen.getByText('Sellos vigentes')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders "Anular" button for active stamp additions when onVoid is provided', () => {
    const handleVoid = vi.fn();
    render(<PurchaseHistory data={mockData} onPage={vi.fn()} onVoid={handleVoid} />);

    const voidButtons = screen.getAllByRole('button', { name: 'Anular' });
    expect(voidButtons).toHaveLength(1);

    fireEvent.click(voidButtons[0]);
    expect(handleVoid).toHaveBeenCalledTimes(1);
    expect(handleVoid).toHaveBeenCalledWith(mockData.history.items[0]);
  });

  it('does NOT render "Anular" button when onVoid is not provided', () => {
    render(<PurchaseHistory data={mockData} onPage={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
  });

  it('displays "Anulado" tag and void reason for voided entries', () => {
    render(<PurchaseHistory data={mockData} onPage={vi.fn()} />);

    expect(screen.getByText('Anulado')).toBeInTheDocument();
    expect(screen.getByText('Carga duplicada por error en caja')).toBeInTheDocument();
    expect(screen.getByText('Motivo de anulación:')).toBeInTheDocument();
  });

  it('does NOT show "Anular" button for redemption entries', () => {
    const handleVoid = vi.fn();
    render(<PurchaseHistory data={mockData} onPage={vi.fn()} onVoid={handleVoid} />);

    expect(screen.getByText('Canje: Café de especialidad gratis')).toBeInTheDocument();
    // Only 1 Anular button should exist (from active load), redemptions can't be voided
    expect(screen.getAllByRole('button', { name: 'Anular' })).toHaveLength(1);
  });
});
