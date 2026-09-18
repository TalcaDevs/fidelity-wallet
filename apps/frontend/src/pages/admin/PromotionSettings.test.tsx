import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionSettings } from './PromotionSettings';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { targetStamps: 10, rewardName: 'Old Reward' }, 
        error: null 
      }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('PromotionSettings Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and fetches data when promoId is provided', async () => {
    render(<PromotionSettings merchantId="merchant-1" promoId="promo-1" onClose={mockOnClose} />);
    
    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Reward')).toBeInTheDocument();
    });
  });

  it('allows creating a new promotion', async () => {
    render(<PromotionSettings merchantId="merchant-1" promoId={null} onClose={mockOnClose} />);
    
    // Fill out form
    const input = screen.getByPlaceholderText(/1 Producto Gratis/i);
    fireEvent.change(input, { target: { value: 'New Reward' } });
    
    const saveBtn = screen.getByText(/Guardar Cambios/i);
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('Promotion');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
  
  it('allows updating an existing promotion', async () => {
    render(<PromotionSettings merchantId="merchant-1" promoId="promo-1" onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Reward')).toBeInTheDocument();
    });
    
    const saveBtn = screen.getByText(/Guardar Cambios/i);
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('Promotion');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
