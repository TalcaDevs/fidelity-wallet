import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualFallback } from '../ManualFallback';

describe('ManualFallback', () => {
  it('should keep submit disabled until the RUT is valid', () => {
    const submitCalls: string[] = [];
    render(<ManualFallback onSubmit={(id) => submitCalls.push(id)} onCancel={() => {}} />);

    const input = screen.getByPlaceholderText('12.345.678-9');
    const button = screen.getByRole('button', { name: /buscar cliente/i });

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: '1234' } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: '123456780' } }); // DV incorrecto
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: '123456785' } });
    expect(button).not.toBeDisabled();
  });

  it('should submit the formatted RUT', () => {
    const submitCalls: string[] = [];
    render(<ManualFallback onSubmit={(id) => submitCalls.push(id)} onCancel={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('12.345.678-9'), { target: { value: '123456785' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar cliente/i }));

    expect(submitCalls).toEqual(['12.345.678-5']);
  });

  it('should submit the phone with the +56 prefix', () => {
    const submitCalls: string[] = [];
    render(<ManualFallback onSubmit={(id) => submitCalls.push(id)} onCancel={() => {}} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Teléfono' }));
    fireEvent.change(screen.getByPlaceholderText('9 1234 5678'), { target: { value: '912345678' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar cliente/i }));

    expect(submitCalls).toEqual(['+56912345678']);
  });

  it('should call onCancel when cancel button is clicked', () => {
    let cancelCalledCount = 0;
    render(<ManualFallback onSubmit={() => {}} onCancel={() => cancelCalledCount++} />);

    const cancelButton = screen.getByRole('button', { name: /volver a la cámara/i });
    fireEvent.click(cancelButton);

    expect(cancelCalledCount).toBe(1);
  });
});
