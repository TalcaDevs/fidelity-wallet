import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JoinSuccess } from './JoinSuccess';

describe('JoinSuccess', () => {
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

  it('renders already registered message when alreadyExists is true', () => {
    render(
      <JoinSuccess
        alreadyExists={true}
        merchantName="Café Test"
      />,
    );

    expect(screen.getByText('¡Ya tienes tu tarjeta!')).toBeInTheDocument();
    expect(screen.getByText(/Ya estás registrado en Café Test/i)).toBeInTheDocument();
    expect(screen.getByText(/acércate al mesón del local/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add to Apple Wallet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add to Google Wallet/i)).not.toBeInTheDocument();
  });
});
