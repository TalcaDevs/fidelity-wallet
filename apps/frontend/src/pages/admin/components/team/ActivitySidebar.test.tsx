import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StaffActivityDto, StaffMemberDto } from '@fidelity/shared';
import { ActivitySidebar } from './ActivitySidebar';

const mockMember: StaffMemberDto = {
  userId: 'user-cajero-1',
  email: 'cajero1@cafedemo.cl',
  role: 'STAFF',
  locationId: 'loc-1',
  locationName: 'Sucursal Central',
  status: 'ACTIVE',
  canResendInvite: false,
  invitedAt: '2026-09-01T10:00:00Z',
  lastSignInAt: '2026-10-21T08:00:00Z',
};

const mockScans: StaffActivityDto[] = [
  {
    id: 'scan-1',
    type: 'STAMP_ADDED',
    method: 'QR',
    createdAt: '2026-10-21T14:30:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 1111',
    promotionName: null,
  },
  {
    id: 'scan-2',
    type: 'STAMP_ADDED',
    method: 'MANUAL',
    createdAt: '2026-10-21T14:35:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 1111',
    promotionName: null,
  },
  {
    id: 'scan-3',
    type: 'STAMP_ADDED',
    method: 'QR',
    createdAt: '2026-10-21T14:40:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 1111',
    promotionName: null,
  },
  {
    id: 'scan-4',
    type: 'STAMP_ADDED',
    method: 'QR',
    createdAt: '2026-10-21T14:45:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 1111',
    promotionName: null,
  },
  {
    id: 'scan-5',
    type: 'REWARD_REDEEMED',
    method: 'QR',
    createdAt: '2026-10-21T15:00:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 2222',
    promotionName: 'Café Gratis',
  },
];

describe('ActivitySidebar', () => {
  it('renders loading spinner and member header information', () => {
    const onLoadActivity = vi.fn(() => new Promise<StaffActivityDto[]>(() => {}));
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    expect(screen.getByText('Auditoría de Actividad')).toBeInTheDocument();
    expect(screen.getByText('cajero1@cafedemo.cl')).toBeInTheDocument();
    expect(screen.getByText('Sucursal: Sucursal Central')).toBeInTheDocument();
    expect(screen.getByText('Cajero')).toBeInTheDocument();
    expect(screen.getByLabelText('Cargando actividad')).toBeInTheDocument();
  });

  it('renders empty state when there is no activity', async () => {
    const onLoadActivity = vi.fn().mockResolvedValue([]);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    expect(await screen.findByText('Sin actividad registrada')).toBeInTheDocument();
    expect(screen.getByText(/Este miembro del equipo aún no ha registrado escaneos/i)).toBeInTheDocument();
  });

  it('renders mini-KPIs and scan cards with recurrence warnings', async () => {
    const onLoadActivity = vi.fn().mockResolvedValue(mockScans);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    // Mini KPIs: 4 Sellos, 1 Canje, 20% Manual (1 de 5)
    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();

    // Recurrence alert for customer with 4 visits
    expect(screen.getAllByText(/Cliente frecuente \(4 visitas en este historial\)/i)).toHaveLength(4);

    // Scan method badges
    expect(screen.getByText('Ingreso manual')).toBeInTheDocument();
    expect(screen.getAllByText('QR Wallet')).toHaveLength(4);
    expect(screen.getByText('Café Gratis')).toBeInTheDocument();
  });

  it('filters activity by type when filter buttons are clicked', async () => {
    const onLoadActivity = vi.fn().mockResolvedValue(mockScans);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    await screen.findByText('Auditoría de Actividad');

    // Initially 5 cards
    const list = await screen.findByRole('list', { name: 'Lista de operaciones' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);

    // Filter by Canjes
    await userEvent.click(screen.getByRole('button', { name: /Canjes \(1\)/i }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Premio canjeado')).toBeInTheDocument();

    // Filter by Manuales
    await userEvent.click(screen.getByRole('button', { name: /Manuales \(1\)/i }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Ingreso manual')).toBeInTheDocument();

    // Filter by Sellos
    await userEvent.click(screen.getByRole('button', { name: /Sellos \(4\)/i }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  it('calls onClose when close button is clicked or Escape is pressed', async () => {
    const onClose = vi.fn();
    const onLoadActivity = vi.fn().mockResolvedValue(mockScans);
    render(<ActivitySidebar member={mockMember} onClose={onClose} onLoadActivity={onLoadActivity} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel de actividad' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
