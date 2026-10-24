import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { StaffActivityDto, StaffMemberDto } from '@fidelity/shared';
import { ActivitySidebar } from './ActivitySidebar';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
    customerId: 'cust-uuid-1',
  },
  {
    id: 'scan-2',
    type: 'STAMP_ADDED',
    method: 'MANUAL',
    createdAt: '2026-10-21T14:35:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 1111',
    promotionName: null,
    customerId: 'cust-uuid-1',
  },
  {
    id: 'scan-3',
    type: 'STAMP_ADDED',
    method: 'QR',
    createdAt: '2026-10-21T14:40:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 1111',
    promotionName: null,
    customerId: 'cust-uuid-1',
  },
  {
    id: 'scan-4',
    type: 'STAMP_ADDED',
    method: 'QR',
    createdAt: '2026-10-21T14:45:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 1111',
    promotionName: null,
    customerId: 'cust-uuid-1',
  },
  {
    id: 'scan-5',
    type: 'REWARD_REDEEMED',
    method: 'QR',
    createdAt: '2026-10-21T15:00:00Z',
    locationName: 'Sucursal Central',
    customerPhone: '+56 9 **** 2222',
    promotionName: 'Café Gratis',
    customerId: 'cust-uuid-2',
  },
];

describe('ActivitySidebar (Modal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('renders mini-KPIs, recurrence warnings, and customer links', async () => {
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

    // Customer history links
    expect(screen.getAllByText('Ver compras')).toHaveLength(5);
  });

  it('navigates to customer history when an operation card is clicked', async () => {
    const onClose = vi.fn();
    const onLoadActivity = vi.fn().mockResolvedValue(mockScans);
    render(<ActivitySidebar member={mockMember} onClose={onClose} onLoadActivity={onLoadActivity} />);

    const list = await screen.findByRole('list', { name: 'Lista de operaciones' });
    const items = within(list).getAllByRole('button');

    // Click on the first card
    await userEvent.click(items[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/customers/cust-uuid-1');
  });

  it('filters activity by type when filter buttons are clicked', async () => {
    const onLoadActivity = vi.fn().mockResolvedValue(mockScans);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    await screen.findByText('Auditoría de Actividad');

    const list = await screen.findByRole('list', { name: 'Lista de operaciones' });
    expect(within(list).getAllByRole('button')).toHaveLength(5);

    // Filter by Canjes
    await userEvent.click(screen.getByRole('button', { name: /Canjes \(1\)/i }));
    expect(within(list).getAllByRole('button')).toHaveLength(1);
    expect(within(list).getByText('Premio canjeado')).toBeInTheDocument();

    // Filter by Manuales
    await userEvent.click(screen.getByRole('button', { name: /Manuales \(1\)/i }));
    expect(within(list).getAllByRole('button')).toHaveLength(1);
    expect(within(list).getByText('Ingreso manual')).toBeInTheDocument();

    // Filter by Sellos
    await userEvent.click(screen.getByRole('button', { name: /Sellos \(4\)/i }));
    expect(within(list).getAllByRole('button')).toHaveLength(4);
  });

  it('can be closed via close icon, footer button, backdrop click, or Escape key', async () => {
    const onClose = vi.fn();
    const onLoadActivity = vi.fn().mockResolvedValue(mockScans);
    render(<ActivitySidebar member={mockMember} onClose={onClose} onLoadActivity={onLoadActivity} />);

    // 1. Close icon in header
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar modal de actividad' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // 2. Footer "Cerrar" button
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    // 3. Escape key
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);

    // 4. Backdrop click (the outer portal container)
    const backdrop = document.body.querySelector('.fixed.inset-0.z-50')!;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('groups recurrence strictly by customerId and not by masked phone', async () => {
    // 4 scans from 4 DIFFERENT customers who happen to share the same masked phone
    const scansWithDifferentCustomers: StaffActivityDto[] = [
      { id: 's1', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:00:00Z', locationName: 'Central', customerPhone: '+56 9 **** 5678', promotionName: null, customerId: 'cust-1' },
      { id: 's2', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:05:00Z', locationName: 'Central', customerPhone: '+56 9 **** 5678', promotionName: null, customerId: 'cust-2' },
      { id: 's3', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:10:00Z', locationName: 'Central', customerPhone: '+56 9 **** 5678', promotionName: null, customerId: 'cust-3' },
      { id: 's4', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:15:00Z', locationName: 'Central', customerPhone: '+56 9 **** 5678', promotionName: null, customerId: 'cust-4' },
    ];
    const onLoadActivity = vi.fn().mockResolvedValue(scansWithDifferentCustomers);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    await screen.findByText('Auditoría de Actividad');
    expect(screen.queryByText(/Cliente frecuente/i)).toBeNull();
    expect(screen.queryByText(/visitas en este historial/i)).toBeNull();
  });

  it('tracks recurrence for the same customerId even when phone is absent', async () => {
    // 4 scans from the SAME customer without phone (registered via email)
    const emailOnlyCustomerScans: StaffActivityDto[] = [
      { id: 'se1', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:00:00Z', locationName: 'Central', customerPhone: null, promotionName: null, customerId: 'cust-email-only' },
      { id: 'se2', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:05:00Z', locationName: 'Central', customerPhone: null, promotionName: null, customerId: 'cust-email-only' },
      { id: 'se3', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:10:00Z', locationName: 'Central', customerPhone: null, promotionName: null, customerId: 'cust-email-only' },
      { id: 'se4', type: 'STAMP_ADDED', method: 'QR', createdAt: '2026-10-21T10:15:00Z', locationName: 'Central', customerPhone: null, promotionName: null, customerId: 'cust-email-only' },
    ];
    const onLoadActivity = vi.fn().mockResolvedValue(emailOnlyCustomerScans);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    await screen.findByText('Auditoría de Actividad');
    expect(screen.getAllByText('Cliente frecuente (4 visitas en este historial)')).toHaveLength(4);
  });
  it('correctly calculates stampCount for multi-stamp scans and displays dynamic badges', async () => {
    const multiStampScans: StaffActivityDto[] = [
      {
        id: 'ms-1',
        type: 'STAMP_ADDED',
        method: 'QR',
        stampCount: 5,
        pointsEarned: 0,
        createdAt: '2026-10-21T10:00:00Z',
        locationName: 'Central',
        customerPhone: '+56 9 **** 1234',
        promotionName: null,
        customerId: 'cust-multi',
      },
    ];

    const onLoadActivity = vi.fn().mockResolvedValue(multiStampScans);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    await screen.findByText('Auditoría de Actividad');

    // KPI "Sellos otorgados" should reflect the 5 stamps granted, not 1 operation
    expect(screen.getByText('5')).toBeInTheDocument();

    // The filter pill should reflect 1 operation
    expect(screen.getByRole('button', { name: /Sellos \(1\)/i })).toBeInTheDocument();

    // The card badge should display dynamic "+5 Sellos entregados"
    expect(screen.getByText('+5 Sellos entregados')).toBeInTheDocument();
  });

  it('handles points-only and mixed stamp/point scans accurately', async () => {
    const mixedScans: StaffActivityDto[] = [
      {
        id: 'pts-only',
        type: 'STAMP_ADDED',
        method: 'QR',
        stampCount: 0,
        pointsEarned: 250,
        createdAt: '2026-10-21T11:00:00Z',
        locationName: 'Central',
        customerPhone: '+56 9 **** 4321',
        promotionName: null,
        customerId: 'cust-points',
      },
      {
        id: 'mixed',
        type: 'STAMP_ADDED',
        method: 'MANUAL',
        stampCount: 2,
        pointsEarned: 100,
        createdAt: '2026-10-21T11:30:00Z',
        locationName: 'Central',
        customerPhone: '+56 9 **** 9876',
        promotionName: null,
        customerId: 'cust-mixed',
      },
    ];

    const onLoadActivity = vi.fn().mockResolvedValue(mixedScans);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    await screen.findByText('Auditoría de Actividad');

    // Total stamps: 0 + 2 = 2
    expect(screen.getByText('2')).toBeInTheDocument();

    // Dynamic badges
    expect(screen.getByText('+250 Puntos entregados')).toBeInTheDocument();
    expect(screen.getByText('+2 Sellos / +100 Puntos')).toBeInTheDocument();
  });

  it('filters activity by timeframe (Hoy, Esta semana, Este mes, Todo) and shows unique customers', async () => {
    const todayIso = new Date().toISOString();
    const tenDaysAgoIso = new Date(Date.now() - 10 * 86400000).toISOString();
    const fortyDaysAgoIso = new Date(Date.now() - 40 * 86400000).toISOString();

    const dateScans: StaffActivityDto[] = [
      {
        id: 's-today-1',
        type: 'STAMP_ADDED',
        method: 'QR',
        stampCount: 2,
        pointsEarned: 0,
        createdAt: todayIso,
        locationName: 'Central',
        customerPhone: '+56 9 **** 1111',
        promotionName: null,
        customerId: 'c-today-1',
      },
      {
        id: 's-today-2',
        type: 'STAMP_ADDED',
        method: 'QR',
        stampCount: 1,
        pointsEarned: 0,
        createdAt: todayIso,
        locationName: 'Central',
        customerPhone: '+56 9 **** 1111',
        promotionName: null,
        customerId: 'c-today-1',
      },
      {
        id: 's-week-1',
        type: 'REWARD_REDEEMED',
        method: 'QR',
        stampCount: 0,
        pointsEarned: 0,
        createdAt: tenDaysAgoIso,
        locationName: 'Central',
        customerPhone: '+56 9 **** 2222',
        promotionName: 'Postre Gratis',
        customerId: 'c-old-1',
      },
      {
        id: 's-old-1',
        type: 'STAMP_ADDED',
        method: 'MANUAL',
        stampCount: 1,
        pointsEarned: 0,
        createdAt: fortyDaysAgoIso,
        locationName: 'Central',
        customerPhone: '+56 9 **** 3333',
        promotionName: null,
        customerId: 'c-old-2',
      },
    ];

    const onLoadActivity = vi.fn().mockResolvedValue(dateScans);
    render(<ActivitySidebar member={mockMember} onClose={vi.fn()} onLoadActivity={onLoadActivity} />);

    await screen.findByText('Auditoría de Actividad');

    expect(screen.getByText('3 clientes')).toBeInTheDocument();
    expect(screen.getByText('4 operaciones en total')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByText('1 cliente')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2 operaciones en este período')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Este mes' }));
    expect(screen.getByText('2 clientes')).toBeInTheDocument();
    expect(screen.getByText('3 operaciones en este período')).toBeInTheDocument();
  });
});
