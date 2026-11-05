import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LocationOption } from '../../../../../services/locationsService';
import { InviteModal } from '../InviteModal';

const mockLocations: LocationOption[] = [
  { id: 'loc-1', name: 'Sucursal Centro', isActive: true },
  { id: 'loc-2', name: 'Sucursal Providencia', isActive: true },
];

describe('InviteModal', () => {
  it('renders name, surname, email and location fields', () => {
    render(<InviteModal locations={mockLocations} onClose={vi.fn()} onInvite={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Agregar usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellido')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Local')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña (opcional)')).toBeInTheDocument();
  });

  it('submits firstName, lastName, email, locationId and password', async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<InviteModal locations={mockLocations} onClose={onClose} onInvite={onInvite} />);

    await userEvent.type(screen.getByLabelText('Nombre'), 'Carlos');
    await userEvent.type(screen.getByLabelText('Apellido'), 'González');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'carlos@cafedemo.cl');
    await userEvent.selectOptions(screen.getByLabelText('Local'), 'loc-2');
    await userEvent.type(screen.getByLabelText('Contraseña (opcional)'), 'ClaveSegura123!');

    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(onInvite).toHaveBeenCalledWith({
      firstName: 'Carlos',
      lastName: 'González',
      email: 'carlos@cafedemo.cl',
      locationId: 'loc-2',
      password: 'ClaveSegura123!',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sends invitation without password and omits empty names', async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<InviteModal locations={mockLocations} onClose={onClose} onInvite={onInvite} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'nuevo@cafedemo.cl');
    await userEvent.selectOptions(screen.getByLabelText('Local'), 'loc-1');

    await userEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    expect(onInvite).toHaveBeenCalledWith({
      firstName: undefined,
      lastName: undefined,
      email: 'nuevo@cafedemo.cl',
      locationId: 'loc-1',
      password: undefined,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
