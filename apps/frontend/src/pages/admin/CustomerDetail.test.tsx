import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { CustomerHistoryDto } from '@fidelity/shared';
import { CustomerDetail } from './CustomerDetail';
import { Customers } from './Customers';
import * as customersService from '../../services/customersService';
import * as toastHook from '../../hooks/useToast';

const history = (page = 1): CustomerHistoryDto => ({
  customer: {
    id: 'c-1',
    name: 'María Pérez',
    email: 'maria@gmail.com',
    phone: '+56912345678',
    rut: null,
    birthDay: 14,
    birthMonth: 2,
    birthYear: null,
    joinedAt: '2026-09-01T12:00:00Z',
    activeStamps: 3,
  },
  totals: { visits: 21, redemptions: 1, purchaseAmount: 45000 },
  history: {
    page,
    pageSize: 20,
    total: 21,
    items: [
      {
        id: 's-1',
        type: 'STAMP_ADDED',
        createdAt: '2026-10-02T15:00:00Z',
        method: 'QR',
        locationName: 'Centro',
        staffEmail: 'cajero@local.cl',
        stamps: 1,
        purchaseAmount: 12500,
        note: 'Mesa 4',
        rewardName: null,
        receiptUrl: 'https://signed/boleta.jpg',
      },
      {
        id: 'r-1',
        type: 'REWARD_REDEEMED',
        createdAt: '2026-10-01T15:00:00Z',
        method: 'MANUAL',
        locationName: 'Centro',
        staffEmail: null,
        stamps: 5,
        purchaseAmount: null,
        note: null,
        rewardName: 'Café gratis',
        receiptUrl: null,
      },
    ],
  },
});

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/admin/customers/c-1']}>
      <Routes>
        <Route path="/admin/customers/:customerId" element={<CustomerDetail brandId="b-1" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CustomerDetail', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('shows the profile, the totals and the purchases with the receipt photo', async () => {
    const spy = vi.spyOn(customersService, 'getCustomerHistory').mockResolvedValue(history());
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'María Pérez' })).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('c-1', 'b-1', 1);
    expect(screen.getByText('14 de febrero')).toBeInTheDocument();
    expect(screen.getByText('“Mesa 4”')).toBeInTheDocument();
    expect(screen.getByText('Canje: Café gratis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Foto de la boleta' })).toHaveAttribute('href', 'https://signed/boleta.jpg');
  });

  it('pages through the history', async () => {
    const spy = vi.spyOn(customersService, 'getCustomerHistory').mockImplementation(
      async (_c, _b, page) => history(page),
    );
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith('c-1', 'b-1', 2));
    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument();
  });

  it('shows the error from the API', async () => {
    vi.spyOn(customersService, 'getCustomerHistory').mockRejectedValue(new Error('Solo el dueño del comercio puede realizar esta acción'));
    renderDetail();

    expect(await screen.findByText('Solo el dueño del comercio puede realizar esta acción')).toBeInTheDocument();
  });
});

describe('Customers list', () => {
  it('shows the name and links to the purchase history', async () => {
    vi.spyOn(toastHook, 'useToast').mockReturnValue({ notifySuccess: vi.fn(), notifyError: vi.fn() });
    vi.spyOn(customersService, 'listCustomers').mockResolvedValue([
      {
        passId: 'p-1',
        customerId: 'c-1',
        rut: null,
        phone: '+56912345678',
        name: 'María Pérez',
        email: 'maria@gmail.com',
        activeStamps: 4,
        nextExpiryAt: null,
        joinedAt: '2026-09-20T12:00:00Z',
        lastActivityAt: '2026-09-24T12:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Customers brandId="b-1" merchantId="m-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'María Pérez' })).toHaveAttribute('href', '/admin/customers/c-1');
    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('href', '/admin/customers/c-1');

    fireEvent.change(screen.getByLabelText(/buscar por nombre/i), { target: { value: 'maria@' } });
    expect(screen.getByRole('link', { name: 'María Pérez' })).toBeInTheDocument();
  });
});
