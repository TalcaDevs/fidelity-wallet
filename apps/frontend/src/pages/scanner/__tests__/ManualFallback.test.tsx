import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualFallback } from '../ManualFallback';

describe('ManualFallback', () => {
  it('should disable submit button if input is too short', () => {
    const submitCalls: string[] = [];
    render(<ManualFallback onSubmit={(id) => submitCalls.push(id)} onCancel={() => {}} />);
    
    const input = screen.getByPlaceholderText(/12\.345\.678-9/i);
    const button = screen.getByRole('button', { name: /buscar cliente/i });
    
    expect(button).toBeDisabled();
    
    fireEvent.change(input, { target: { value: '123' } });
    expect(button).toBeDisabled();
    
    fireEvent.change(input, { target: { value: '1234' } });
    expect(button).not.toBeDisabled();
  });

  it('should call onSubmit when form is submitted', () => {
    const submitCalls: string[] = [];
    render(<ManualFallback onSubmit={(id) => submitCalls.push(id)} onCancel={() => {}} />);
    
    const input = screen.getByPlaceholderText(/12\.345\.678-9/i);
    const button = screen.getByRole('button', { name: /buscar cliente/i });
    
    fireEvent.change(input, { target: { value: '12345678-5' } });
    fireEvent.click(button);
    
    expect(submitCalls).toEqual(['12345678-5']);
  });

  it('should call onCancel when cancel button is clicked', () => {
    let cancelCalledCount = 0;
    render(<ManualFallback onSubmit={() => {}} onCancel={() => cancelCalledCount++} />);
    
    const cancelButton = screen.getByRole('button', { name: /volver a la cámara/i });
    fireEvent.click(cancelButton);
    
    expect(cancelCalledCount).toBe(1);
  });
});
