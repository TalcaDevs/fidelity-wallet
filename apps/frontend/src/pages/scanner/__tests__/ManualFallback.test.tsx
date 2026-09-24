import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualFallback } from '../ManualFallback';
import { IdentifierValue } from '../../../components/ui/IdentifierInput';

function setup() {
  const submitCalls: IdentifierValue[] = [];
  let cancelCalls = 0;
  render(<ManualFallback onSubmit={(id) => submitCalls.push(id)} onCancel={() => cancelCalls++} />);
  return { submitCalls, cancelCalls: () => cancelCalls };
}

describe('ManualFallback', () => {
  it('does not submit an incomplete RUT and tells the cashier why', () => {
    const { submitCalls } = setup();

    fireEvent.change(screen.getByPlaceholderText('12.345.678-9'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar cliente/i }));

    expect(submitCalls).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent(/incompleto/i);
  });

  it('does not submit a RUT with a wrong check digit', () => {
    const { submitCalls } = setup();

    fireEvent.change(screen.getByPlaceholderText('12.345.678-9'), { target: { value: '123456780' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar cliente/i }));

    expect(submitCalls).toEqual([]);
  });

  it('submits the RUT with its kind, so the service does not have to guess it', () => {
    const { submitCalls } = setup();

    fireEvent.change(screen.getByPlaceholderText('12.345.678-9'), { target: { value: '123456785' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar cliente/i }));

    expect(submitCalls).toEqual([{ kind: 'rut', value: '12.345.678-5', isValid: true }]);
  });

  it('submits the phone with the +56 prefix', () => {
    const { submitCalls } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Teléfono' }));
    fireEvent.change(screen.getByPlaceholderText('9 1234 5678'), { target: { value: '912345678' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar cliente/i }));

    expect(submitCalls).toEqual([{ kind: 'phone', value: '+56912345678', isValid: true }]);
  });

  it('calls onCancel when the cashier goes back to the camera', () => {
    const { cancelCalls } = setup();

    fireEvent.click(screen.getByRole('button', { name: /volver a la cámara/i }));

    expect(cancelCalls()).toBe(1);
  });
});
