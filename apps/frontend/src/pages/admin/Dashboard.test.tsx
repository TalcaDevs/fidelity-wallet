import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    })),
  },
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), 
        removeListener: vi.fn(), 
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders without crashing and shows loading skeleton or empty state', async () => {
    const mockSession = { user: { id: 'test-uuid', email: 'test@local.com' } };
    render(<Dashboard session={mockSession as any} />);
    
    expect(screen.getByText(/Bienvenido, test@local.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Pases Activos/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/No hay actividad reciente/i)).toBeInTheDocument();
    });
  });
});
