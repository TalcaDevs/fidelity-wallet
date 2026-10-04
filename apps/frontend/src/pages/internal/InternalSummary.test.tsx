import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { InternalSummaryDto } from '@fidelity/shared';
import { InternalSummary } from './InternalSummary';
import * as internalService from '../../services/internalService';

const summary: InternalSummaryDto = {
  brands: { total: 3, active: 2, suspended: 1, byPlan: { TRIAL: 1, STARTER: 0, PRO: 1, BUSINESS: 1 } },
  trials: { endingSoon: [{ id: 'b-2', name: 'Heladería Sur', trialEndsAt: '2026-10-03T12:00:00Z' }], expired: 2 },
  tickets: { open: 5, unassigned: 2, urgent: 1, waitingOnMerchant: 1 },
  activity: Array.from({ length: 7 }, (_, i) => ({ date: `2026-09-2${i + 1}`, stamps: i, redemptions: 1, newCustomers: 2 })),
};

describe('InternalSummary', () => {
  it('muestra tickets, marcas por plan, pruebas por vencer y la actividad de 7 días', async () => {
    vi.spyOn(internalService, 'getSummary').mockResolvedValue(summary);
    render(<MemoryRouter><InternalSummary /></MemoryRouter>);

    expect(await screen.findByText('Tickets abiertos')).toBeInTheDocument();
    expect(screen.getByText('2 activas ·', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Heladería Sur' })).toHaveAttribute('href', '/internal/brands/b-2');
    expect(screen.getByText('2 ya vencidas')).toBeInTheDocument();
    expect(screen.getAllByText('+2 clientes')).toHaveLength(7);
  });
});
