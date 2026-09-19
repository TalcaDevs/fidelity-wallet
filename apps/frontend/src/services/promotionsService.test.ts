import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listPromotions, setPromotionActive } from './promotionsService';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: '1', merchantId: 'm1', name: 'x', targetStamps: 5, rewardName: 'Café', isActive: true, createdAt: '2026-01-01' }],
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

import { supabase } from '../lib/supabase';

describe('promotionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists promotions for a merchant', async () => {
    const promotions = await listPromotions('m1');
    expect(supabase.from).toHaveBeenCalledWith('Promotion');
    expect(promotions).toHaveLength(1);
    expect(promotions[0].rewardName).toBe('Café');
  });

  it('toggles the active status of a promotion', async () => {
    await setPromotionActive('1', false);
    expect(supabase.from).toHaveBeenCalledWith('Promotion');
  });
});
