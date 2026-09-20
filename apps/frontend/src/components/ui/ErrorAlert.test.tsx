import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ErrorAlert } from './ErrorAlert';

describe('ErrorAlert', () => {
  it('renders the provided message', () => {
    render(<ErrorAlert message="Algo salió mal" />);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });
});
