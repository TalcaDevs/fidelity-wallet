import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionsModule } from './PromotionsModule';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ 
        data: [
          { id: '1', targetStamps: 10, rewardName: 'Free Coffee', isActive: true, createdAt: new Date().toISOString() }
        ], 
        error: null 
      }),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('PromotionsModule Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders promotions and handles modal toggle', async () => {
    const mockSession = { user: { id: 'test-uuid', email: 'test@local.com' } };
    render(<PromotionsModule session={mockSession as any} />);
    
    expect(screen.getByText(/Promociones Activas/i)).toBeInTheDocument();
    
    // Wait for the mock data to load
    await waitFor(() => {
      expect(screen.getByText(/Free Coffee/i)).toBeInTheDocument();
      expect(screen.getByText(/10 Sellos/i)).toBeInTheDocument();
    });

    // Open Modal
    const newPromoBtn = screen.getByText(/Nueva Promoción/i);
    fireEvent.click(newPromoBtn);
    
    expect(screen.getByText(/Regla de Promoción/i)).toBeInTheDocument(); // Inside PromotionSettings modal
  });

});
