import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { CustomerHistoryDto } from '@fidelity/shared';
import { CustomerDetail } from './CustomerDetail';
import { Customers } from './Customers';
import * as customersService from '../../services/customersService';
import * as toastHook from '../../hooks/useToast';
import * as locationsService from '../../services/locationsService';

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
    homeLocationId: 'loc-1',
  },
  totals: { visits: 21, redemptions: 1, purchaseAmount: 45000 },
  cardType: 'STAMPS',
  maxStampsPerLoad: 10,
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
  const notifySuccess = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    notifySuccess.mockReset();
    vi.spyOn(toastHook, 'useToast').mockReturnValue({ notifySuccess, notifyError: vi.fn() });
    vi.spyOn(locationsService, 'listBrandLocations').mockResolvedValue([
      { id: 'loc-1', name: 'Centro', isActive: true },
      { id: 'loc-2', name: 'Providencia', isActive: true },
    ]);
  });

  it('adds stamps from the profile with a mandatory reason and refreshes the history', async () => {
    const historySpy = vi.spyOn(customersService, 'getCustomerHistory').mockResolvedValue(history());
    const addSpy = vi.spyOn(customersService, 'addStampsFromPanel').mockResolvedValue({
      scanId: 's-9',
      stampsAdded: 2,
      activeStamps: 5,
      rewardUnlocked: true,
    });
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Sumar sellos' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Un sello más' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 2 sellos' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/indica el motivo/i);
    expect(addSpy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Compró sin su tarjeta' } });
    fireEvent.change(await screen.findByLabelText('Local'), { target: { value: 'loc-2' } });
    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '9900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 2 sellos' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(addSpy).toHaveBeenCalledWith('c-1', {
      brandId: 'b-1',
      merchantId: 'loc-2',
      stampCount: 2,
      currency: 'STAMPS',
      reason: 'Compró sin su tarjeta',
      purchaseAmount: 9900,
      note: undefined,
      receipt: undefined,
    });
    expect(notifySuccess).toHaveBeenCalledWith('Sumamos 2 sellos. Ahora tiene 5. Ya puede canjear un premio.');
    await waitFor(() => expect(historySpy).toHaveBeenCalledTimes(2));
  });

  it('chooses one currency in a dual card and displays independent balances', async () => {
    const data = history();
    data.stampsEnabled = true;
    data.pointsEnabled = true;
    data.maxPointsPerLoad = 10000;
    data.customer.activePoints = 120;
    vi.spyOn(customersService, 'getCustomerHistory').mockResolvedValue(data);
    const add = vi.spyOn(customersService, 'addStampsFromPanel').mockResolvedValue({ scanId: 's-2', stampsAdded: 0, activeStamps: 3, pointsAdded: 20, activePoints: 140, currency: 'POINTS', rewardUnlocked: false });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: 'Sumar sellos o puntos' }));
    expect(screen.getByText('Sellos vigentes')).toBeInTheDocument();
    expect(screen.getByText('Puntos vigentes')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Modalidad a sumar'), { target: { value: 'POINTS' } });
    fireEvent.change(screen.getByLabelText('Puntos a sumar'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Compensación por reclamo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 20 puntos' }));
    await waitFor(() => expect(add).toHaveBeenCalledWith('c-1', expect.objectContaining({ currency: 'POINTS', stampCount: 20 })));
    expect(notifySuccess).toHaveBeenCalledWith('Sumamos 20 puntos. Ahora tiene 140.');
  });

  it('keeps the dialog open and shows the API error', async () => {
    vi.spyOn(customersService, 'getCustomerHistory').mockResolvedValue(history());
    vi.spyOn(customersService, 'addStampsFromPanel').mockRejectedValue(new Error('Este local no está habilitado para operar'));
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Sumar sellos' }));
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Compensación' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 1 sello' }));

    expect(await screen.findByText('Este local no está habilitado para operar')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

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

  it('allows owner to void an active load from the history', async () => {
    const historySpy = vi.spyOn(customersService, 'getCustomerHistory').mockResolvedValue(history());
    const voidSpy = vi.spyOn(customersService, 'voidCustomerScan').mockResolvedValue({
      scanId: 's-1',
      voidedAt: '2026-10-08T15:00:00Z',
      activeStamps: 2,
      activePoints: 0,
      stampsDeducted: 1,
      pointsDeducted: 0,
    });

    renderDetail();

    const voidButton = await screen.findByRole('button', { name: 'Anular' });
    fireEvent.click(voidButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Anular carga de sellos')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/motivo de la anulación/i), {
      target: { value: 'Carga duplicada por error en caja' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(voidSpy).toHaveBeenCalledWith('c-1', 's-1', 'b-1', 'Carga duplicada por error en caja');
    expect(notifySuccess).toHaveBeenCalledWith('Carga anulada exitosamente. Se descontaron 1 sello.');
    await waitFor(() => expect(historySpy).toHaveBeenCalledTimes(2));
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
