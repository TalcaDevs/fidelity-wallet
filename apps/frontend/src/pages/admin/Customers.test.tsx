import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    render(<Customers merchantId="m-1" />);

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

    render(<Customers merchantId="m-1" />);

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

    render(<Customers merchantId="m-1" />);

    await waitFor(() => {
      expect(screen.getByTitle('Eliminar datos personales (Ley 19.628)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Eliminar datos personales (Ley 19.628)'));
    expect(screen.getByText('¿Eliminar datos de este cliente?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.queryByText('¿Eliminar datos de este cliente?')).not.toBeInTheDocument();
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
