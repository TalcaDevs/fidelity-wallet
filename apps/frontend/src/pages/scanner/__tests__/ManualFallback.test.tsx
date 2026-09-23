import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManualFallback } from '../ManualFallback';

describe('ManualFallback', () => {
  it('should disable submit button if input is too short', () => {
    const mockSubmit = vi.fn();
    render(<ManualFallback onSubmit={mockSubmit} onCancel={() => {}} isLoading={false} />);
    
    const input = screen.getByPlaceholderText(/12\.345\.678-9/i);
    const button = screen.getByRole('button', { name: /buscar cliente/i });
    
    expect(button).toBeDisabled();
    
    fireEvent.change(input, { target: { value: '123' } });
    expect(button).toBeDisabled();
    
    fireEvent.change(input, { target: { value: '1234' } });
    expect(button).not.toBeDisabled();
  });

  it('should call onSubmit when form is submitted', () => {
    const mockSubmit = vi.fn();
    render(<ManualFallback onSubmit={mockSubmit} onCancel={() => {}} isLoading={false} />);
    
    const input = screen.getByPlaceholderText(/12\.345\.678-9/i);
    const button = screen.getByRole('button', { name: /buscar cliente/i });
    
    fireEvent.change(input, { target: { value: '12345678-5' } });
    fireEvent.click(button);
    
    expect(mockSubmit).toHaveBeenCalledWith('12345678-5');
  });

  it('should call onCancel when cancel button is clicked', () => {
    const mockCancel = vi.fn();
    render(<ManualFallback onSubmit={() => {}} onCancel={mockCancel} isLoading={false} />);
    
    const cancelButton = screen.getByRole('button', { name: /volver a la cámara/i });
    fireEvent.click(cancelButton);
    
    expect(mockCancel).toHaveBeenCalled();
  });
});
