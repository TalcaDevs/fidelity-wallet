import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PasswordRequirements, evaluatePassword } from './PasswordRequirements';

describe('PasswordRequirements & evaluatePassword', () => {
  it('correctly evaluates all criteria', () => {
    // Empty
    expect(evaluatePassword('').isValid).toBe(false);
    expect(evaluatePassword('').metCount).toBe(0);

    // Only length
    expect(evaluatePassword('abcdefgh').isValid).toBe(false);
    expect(evaluatePassword('abcdefgh').metCount).toBe(2); // length + lowercase

    // Length + lowercase + number
    expect(evaluatePassword('abcdefg1').isValid).toBe(false);
    expect(evaluatePassword('abcdefg1').metCount).toBe(3); // length + lowercase + number

    // Full valid password
    const valid = evaluatePassword('Abcdefg1');
    expect(valid.isValid).toBe(true);
    expect(valid.metCount).toBe(4);
    expect(valid.criteria.every((c) => c.met)).toBe(true);
  });

  it('renders all criteria in neutral state when password is empty', () => {
    render(<PasswordRequirements password="" />);
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Al menos un número (0-9)')).toBeInTheDocument();
    expect(screen.getByText('Al menos una mayúscula (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Al menos una minúscula (a-z)')).toBeInTheDocument();
    expect(screen.queryByText(/Seguridad:/)).not.toBeInTheDocument();
  });

  it('displays strength meter and highlights met criteria when password is typed', () => {
    const { rerender } = render(<PasswordRequirements password="Pass" />);
    expect(screen.getByText(/Seguridad:/)).toBeInTheDocument();
    expect(screen.getByText('Débil')).toBeInTheDocument();

    rerender(<PasswordRequirements password="Password123" />);
    expect(screen.getByText('Segura')).toBeInTheDocument();
  });
});
