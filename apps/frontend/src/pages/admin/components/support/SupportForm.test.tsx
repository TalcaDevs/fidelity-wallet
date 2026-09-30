import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CreateTicketInput } from '@fidelity/shared';
import { SupportForm } from './SupportForm';

function setup() {
  const submitted: CreateTicketInput[] = [];
  const onSubmit = async (input: CreateTicketInput) => {
    submitted.push(input);
    return true;
  };
  render(
    <SupportForm
      locations={[{ id: 'loc-1', name: 'Centro', isActive: true }]}
      onSubmit={onSubmit}
    />,
  );
  return { submitted, submit: () => screen.getByRole('button', { name: 'Enviar solicitud' }) };
}

describe('SupportForm (HANDOFF §6.6)', () => {
  it('stays disabled until the category and a 20+ character description are set', async () => {
    const { submit } = setup();
    expect(submit()).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'SCANNER');
    await userEvent.type(screen.getByLabelText('Describe tu problema'), 'muy corto');
    expect(submit()).toBeDisabled();
    expect(screen.getByText(/al menos 20/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Describe tu problema'), ' pero ahora ya alcanza');
    expect(submit()).toBeEnabled();
  });

  it('sends the phone in E.164 with +56 by default and the chosen location', async () => {
    const { submit, submitted } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'TEAM');
    await userEvent.type(screen.getByLabelText('Describe tu problema'), 'El mesero no puede entrar al escáner');
    await userEvent.selectOptions(screen.getByLabelText('Local (opcional)'), 'loc-1');
    await userEvent.type(screen.getByLabelText('Teléfono (opcional)'), '9 1234 5678');

    await userEvent.click(submit());

    expect(submitted).toEqual([
      {
        category: 'TEAM',
        description: 'El mesero no puede entrar al escáner',
        locationId: 'loc-1',
        contactPhone: '+56912345678',
      },
    ]);
  });

  it('blocks an invalid phone', async () => {
    const { submit } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'OTHER');
    await userEvent.type(screen.getByLabelText('Describe tu problema'), 'Una descripción suficientemente larga');
    await userEvent.type(screen.getByLabelText('Teléfono (opcional)'), '123');

    expect(submit()).toBeDisabled();
    expect(screen.getByText(/Revisa el número/)).toBeInTheDocument();
  });
});
