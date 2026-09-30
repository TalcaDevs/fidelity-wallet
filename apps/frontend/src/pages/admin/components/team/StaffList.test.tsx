import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StaffMemberDto } from '@fidelity/shared';
import { StaffList, type StaffActions } from './StaffList';

const member = (overrides: Partial<StaffMemberDto>): StaffMemberDto => ({
  userId: 'u',
  email: 'x@test.cl',
  role: 'STAFF',
  locationId: 'l1',
  locationName: 'Centro',
  status: 'ACTIVE',
  canResendInvite: false,
  invitedAt: '2026-09-01T12:00:00Z',
  lastSignInAt: null,
  ...overrides,
});

function recorder() {
  const calls: { action: string; userId: string }[] = [];
  const record = (action: string) => (m: StaffMemberDto) => calls.push({ action, userId: m.userId });
  const actions: StaffActions = {
    onViewActivity: record('activity'),
    onReassign: record('reassign'),
    onResendInvite: record('resend'),
    onRemove: record('remove'),
  };
  return { calls, actions };
}

describe('StaffList', () => {
  const staff = [
    member({ userId: 'owner', email: 'dueno@test.cl', role: 'OWNER', locationId: null, locationName: null }),
    member({ userId: 'invited', email: 'nuevo@test.cl', status: 'INVITED', canResendInvite: true }),
  ];

  it('never offers to remove or reassign the OWNER', () => {
    const { actions } = recorder();
    render(<StaffList staff={staff} actions={actions} />);

    const table = screen.getByRole('table');
    const ownerRow = within(table).getByText('dueno@test.cl').closest('tr')!;
    expect(within(ownerRow).queryByText('Dar de baja')).toBeNull();
    expect(within(ownerRow).queryByText('Cambiar local')).toBeNull();
    expect(within(ownerRow).getByText('Todos')).toBeInTheDocument();
  });

  it('offers to resend the invitation only when the backend allows it', async () => {
    const { calls, actions } = recorder();
    render(<StaffList staff={staff} actions={actions} />);

    const table = screen.getByRole('table');
    const invitedRow = within(table).getByText('nuevo@test.cl').closest('tr')!;
    await userEvent.click(within(invitedRow).getByText('Reenviar invitación'));
    await userEvent.click(within(invitedRow).getByText('Dar de baja'));

    expect(calls).toEqual([
      { action: 'resend', userId: 'invited' },
      { action: 'remove', userId: 'invited' },
    ]);
    expect(within(table).getAllByText('Reenviar invitación')).toHaveLength(1);
  });
});
