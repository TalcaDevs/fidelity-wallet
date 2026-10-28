import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Customers } from './Customers';
import * as customersService from '../../services/customersService';
import * as toastHook from '../../hooks/useToast';

describe('Customers page (Ley 19.628)', () => {
  const mockNotifySuccess = vi.fn();
  const mockNotifyError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toastHook, 'useToast').mockReturnValue({
      notifySuccess: mockNotifySuccess,
      notifyError: mockNotifyError,
    });
  });

  it('renders customer rows with deletion action', async () => {
    vi.spyOn(customersService, 'listCustomers').mockResolvedValue([
      {
        passId: 'p-1',
        customerId: 'c-1',
        rut: '12345678-5',
        phone: '+56912345678',
        activeStamps: 4,
        nextExpiryAt: null,
        joinedAt: '2026-09-20T12:00:00Z',
        lastActivityAt: '2026-09-24T12:00:00Z',
      },
    ]);

    render(<MemoryRouter><Customers brandId="m-1" merchantId="m-1" /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Acciones')).toBeInTheDocument();
      expect(screen.getByTitle('Eliminar datos personales (Ley 19.628)')).toBeInTheDocument();
    });
  });

  it('opens confirmation dialog and calls deleteCustomer on confirm', async () => {
    vi.spyOn(customersService, 'listCustomers').mockResolvedValue([
      {
        passId: 'p-1',
        customerId: 'c-1',
        rut: '12345678-5',
        phone: '+56912345678',
        activeStamps: 4,
        nextExpiryAt: null,
        joinedAt: '2026-09-20T12:00:00Z',
        lastActivityAt: '2026-09-24T12:00:00Z',
      },
    ]);
    const deleteSpy = vi.spyOn(customersService, 'deleteCustomer').mockResolvedValue(undefined);

    render(<MemoryRouter><Customers brandId="m-1" merchantId="m-1" /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByTitle('Eliminar datos personales (Ley 19.628)')).toBeInTheDocument();
    });

    // Click delete
    fireEvent.click(screen.getByTitle('Eliminar datos personales (Ley 19.628)'));

    // Check modal appears with Ley 19.628 text
    expect(screen.getByText('¿Eliminar datos de este cliente?')).toBeInTheDocument();
    expect(screen.getByText(/Ley 19\.628/)).toBeInTheDocument();

    // Click confirm
    fireEvent.click(screen.getByText('Eliminar definitivamente'));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('m-1', 'c-1');
      expect(mockNotifySuccess).toHaveBeenCalledWith(expect.stringContaining('Ley 19.628'));
    });
  });

  it('closes dialog on cancel without deleting', async () => {
    vi.spyOn(customersService, 'listCustomers').mockResolvedValue([
      {
        passId: 'p-1',
        customerId: 'c-1',
        rut: '12345678-5',
        phone: '+56912345678',
        activeStamps: 4,
        nextExpiryAt: null,
        joinedAt: '2026-09-20T12:00:00Z',
        lastActivityAt: '2026-09-24T12:00:00Z',
      },
    ]);
    const deleteSpy = vi.spyOn(customersService, 'deleteCustomer').mockResolvedValue(undefined);

    render(<MemoryRouter><Customers brandId="m-1" merchantId="m-1" /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByTitle('Eliminar datos personales (Ley 19.628)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Eliminar datos personales (Ley 19.628)'));
    expect(screen.getByText('¿Eliminar datos de este cliente?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.queryByText('¿Eliminar datos de este cliente?')).not.toBeInTheDocument();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('classifies customers with status badges (Nuevo, Frecuente, Inactivo) and filters them', async () => {
    const now = Date.now();
    const twoDaysAgo = new Date(now - 2 * 86400000).toISOString();
    const fortyDaysAgo = new Date(now - 40 * 86400000).toISOString();
    const hundredDaysAgo = new Date(now - 100 * 86400000).toISOString();

    vi.spyOn(customersService, 'listCustomers').mockResolvedValue([
      {
        passId: 'p-new',
        customerId: 'c-new',
        name: 'Cliente Nuevo',
        rut: '11111111-1',
        phone: '+56911111111',
        activeStamps: 1,
        nextExpiryAt: null,
        joinedAt: twoDaysAgo,
        lastActivityAt: twoDaysAgo,
      },
      {
        passId: 'p-frequent',
        customerId: 'c-frequent',
        name: 'Cliente Frecuente',
        rut: '22222222-2',
        phone: '+56922222222',
        activeStamps: 6,
        nextExpiryAt: null,
        joinedAt: hundredDaysAgo,
        lastActivityAt: twoDaysAgo,
      },
      {
        passId: 'p-inactive',
        customerId: 'c-inactive',
        name: 'Cliente Dormido',
        rut: '33333333-3',
        phone: '+56933333333',
        activeStamps: 2,
        nextExpiryAt: null,
        joinedAt: hundredDaysAgo,
        lastActivityAt: fortyDaysAgo,
      },
    ]);

    render(<MemoryRouter><Customers brandId="m-1" merchantId="m-1" /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Cliente Nuevo')).toBeInTheDocument();
    });

    // Check badges appear
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    expect(screen.getByText('Frecuente')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();

    // Check filter buttons with counts
    const frequentBtn = screen.getByRole('button', { name: /Frecuentes \(1\)/i });
    const newBtn = screen.getByRole('button', { name: /Nuevos \(1\)/i });
    const inactiveBtn = screen.getByRole('button', { name: /Inactivos \(1\)/i });
    const allBtn = screen.getByRole('button', { name: /Todos \(3\)/i });

    expect(frequentBtn).toBeInTheDocument();
    expect(newBtn).toBeInTheDocument();
    expect(inactiveBtn).toBeInTheDocument();

    // Filter by Frecuentes
    fireEvent.click(frequentBtn);
    expect(screen.getByText('Cliente Frecuente')).toBeInTheDocument();
    expect(screen.queryByText('Cliente Nuevo')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente Dormido')).not.toBeInTheDocument();

    // Filter by Nuevos
    fireEvent.click(newBtn);
    expect(screen.getByText('Cliente Nuevo')).toBeInTheDocument();
    expect(screen.queryByText('Cliente Frecuente')).not.toBeInTheDocument();

    // Filter by Inactivos
    fireEvent.click(inactiveBtn);
    expect(screen.getByText('Cliente Dormido')).toBeInTheDocument();
    expect(screen.queryByText('Cliente Nuevo')).not.toBeInTheDocument();

    // Back to Todos
    fireEvent.click(allBtn);
    expect(screen.getByText('Cliente Nuevo')).toBeInTheDocument();
    expect(screen.getByText('Cliente Frecuente')).toBeInTheDocument();
    expect(screen.getByText('Cliente Dormido')).toBeInTheDocument();
  });

  it('paginates customer list with previous and next buttons', async () => {
    const mockCustomers = Array.from({ length: 15 }, (_, i) => ({
      passId: `pass-${i + 1}`,
      customerId: `cust-${i + 1}`,
      name: `Cliente Número ${i + 1}`,
      rut: `1000000${i}-1`,
      phone: `+5691000000${i}`,
      activeStamps: 3,
      nextExpiryAt: null,
      joinedAt: '2026-09-01T12:00:00Z',
      lastActivityAt: '2026-09-25T12:00:00Z',
    }));

    vi.spyOn(customersService, 'listCustomers').mockResolvedValue(mockCustomers);

    render(<MemoryRouter><Customers brandId="m-1" merchantId="m-1" /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Cliente Número 1')).toBeInTheDocument();
    });

    // Page 1 shows first 10
    expect(screen.getByText('Cliente Número 10')).toBeInTheDocument();
    expect(screen.queryByText('Cliente Número 11')).not.toBeInTheDocument();
    expect(screen.getByText(/1 - 10/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior de clientes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente de clientes' })).toBeEnabled();

    // Next page
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de clientes' }));
    expect(screen.queryByText('Cliente Número 1')).not.toBeInTheDocument();
    expect(screen.getByText('Cliente Número 11')).toBeInTheDocument();
    expect(screen.getByText('Cliente Número 15')).toBeInTheDocument();
    expect(screen.getByText(/11 - 15/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página siguiente de clientes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página anterior de clientes' })).toBeEnabled();
  });
});
