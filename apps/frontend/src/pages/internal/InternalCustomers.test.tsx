import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as internalService from '../../services/internalService';
import { InternalCustomers } from './InternalCustomers';

vi.mock('./internalRole', () => ({ useIsSuperadmin: () => false }));

describe('InternalCustomers', () => {
  it('shows both active balances and hides disabled balances for each card', async () => {
    vi.spyOn(internalService, 'searchCustomers').mockResolvedValue({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [{
        id: 'c-1', rut: null, phone: '+56 *** 1234', createdAt: '2026-10-01',
        cards: [
          { brandId: 'b-1', brandName: 'Dual', joinedAt: '2026-10-01', activeStamps: 3, activePoints: 42, stampsEnabled: true, pointsEnabled: true },
          { brandId: 'b-2', brandName: 'Puntos', joinedAt: '2026-10-01', activeStamps: 7, activePoints: 80, stampsEnabled: false, pointsEnabled: true },
        ],
      }],
    });
    render(<MemoryRouter initialEntries={['/internal/customers?brandId=b-1']}><InternalCustomers /></MemoryRouter>);
    expect(await screen.findByText('· 3 sellos')).toBeInTheDocument();
    expect(screen.getByText('· 42 puntos')).toBeInTheDocument();
    expect(screen.getByText('· 80 puntos')).toBeInTheDocument();
    expect(screen.queryByText('· 7 sellos')).not.toBeInTheDocument();
  });
});
