import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JoinSuccess } from './JoinSuccess';
import * as customersService from '../../services/customersService';

vi.mock('../../services/customersService', () => ({
  requestPassRecovery: vi.fn(),
  verifyPassRecovery: vi.fn(),
}));

describe('JoinSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wallet buttons when pass is new (alreadyExists is false)', () => {
    render(
      <JoinSuccess
        appleWalletUrl="/api/passes/token1/apple"
        googleWalletUrl="/api/passes/token1/google"
        alreadyExists={false}
        merchantName="Café Test"
      />,
    );

    expect(screen.getByText('¡Tarjeta Lista!')).toBeInTheDocument();
    expect(screen.getByText(/Add to Apple Wallet/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Google Wallet/i)).toBeInTheDocument();
  });

  it('renders recovery prompt when alreadyExists is true', () => {
    render(
      <JoinSuccess
        alreadyExists={true}
        merchantName="Café Test"
        merchantId="m-1"
        initialRut="11.111.111-1"
        initialPhone="+56912345678"
      />,
    );

    expect(screen.getByText('¡Ya tienes tu tarjeta!')).toBeInTheDocument();
    expect(screen.getByText(/Recuperar mi tarjeta/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add to Apple Wallet/i)).not.toBeInTheDocument();
  });

  it('handles the full OTP recovery flow', async () => {
    vi.mocked(customersService.requestPassRecovery).mockResolvedValue({
      success: true,
      message: 'Código enviado',
      phoneMasked: '+56 9 **** 5678',
      devCode: '654321',
    });

    vi.mocked(customersService.verifyPassRecovery).mockResolvedValue({
      success: true,
      appleWalletUrl: '/api/passes/recovered/apple',
      googleWalletUrl: '/api/passes/recovered/google',
      message: '¡Tarjeta recuperada!',
    });

    render(
      <JoinSuccess
        alreadyExists={true}
        merchantName="Café Test"
        merchantId="m-1"
        initialRut="11.111.111-1"
        initialPhone="+56912345678"
      />,
    );

    // 1. Click request recovery code
    const recoverBtn = screen.getByText('Recuperar mi tarjeta');
    fireEvent.click(recoverBtn);

    await waitFor(() => {
      expect(customersService.requestPassRecovery).toHaveBeenCalledWith({
        merchantId: 'm-1',
        rut: '11.111.111-1',
        phone: '+56912345678',
      });
    });

    // 2. Expect code input screen
    expect(screen.getByText(/\+56 9 \*\*\*\* 5678/)).toBeInTheDocument();
    const codeInput = screen.getByPlaceholderText('123456');
    expect(codeInput).toBeInTheDocument();

    // 3. Enter code and submit
    fireEvent.change(codeInput, { target: { value: '654321' } });
    const verifyBtn = screen.getByText('Confirmar y Obtener Tarjeta');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(customersService.verifyPassRecovery).toHaveBeenCalledWith({
        merchantId: 'm-1',
        rut: '11.111.111-1',
        phone: '+56912345678',
        code: '654321',
      });
    });

    // 4. Wallet URLs should be displayed and recovery completed!
    await waitFor(() => {
      expect(screen.getByText('¡Tarjeta Lista!')).toBeInTheDocument();
      expect(screen.getByText(/Add to Apple Wallet/i)).toBeInTheDocument();
      expect(screen.getByText(/Add to Google Wallet/i)).toBeInTheDocument();
    });
  });

  it('displays error message if verification fails', async () => {
    vi.mocked(customersService.requestPassRecovery).mockResolvedValue({
      success: true,
      message: 'Código enviado',
      phoneMasked: '+56 9 **** 5678',
    });

    vi.mocked(customersService.verifyPassRecovery).mockResolvedValue({
      success: false,
      error: 'Código de verificación incorrecto',
    });

    render(
      <JoinSuccess
        alreadyExists={true}
        merchantName="Café Test"
        merchantId="m-1"
        initialRut="11.111.111-1"
        initialPhone="+56912345678"
      />,
    );

    fireEvent.click(screen.getByText('Recuperar mi tarjeta'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '999999' } });
    fireEvent.click(screen.getByText('Confirmar y Obtener Tarjeta'));

    await waitFor(() => {
      expect(screen.getByText('Código de verificación incorrecto')).toBeInTheDocument();
    });
  });
});
