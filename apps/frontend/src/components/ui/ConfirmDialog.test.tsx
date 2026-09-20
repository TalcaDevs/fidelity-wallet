import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

// Sin librería de mocks: funciones reales que registran lo que reciben.
function createRecorder() {
  const calls: number[] = [];
  return { calls, fn: () => calls.push(1) };
}

describe('ConfirmDialog', () => {
  it('muestra el título y el mensaje', () => {
    const confirm = createRecorder();
    const cancel = createRecorder();

    render(
      <ConfirmDialog title="Eliminar promoción" message="Esta acción no se puede deshacer." onConfirm={confirm.fn} onCancel={cancel.fn} />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Eliminar promoción')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  });

  it('avisa al confirmar y al cancelar, cada uno por su lado', async () => {
    const user = userEvent.setup();
    const confirm = createRecorder();
    const cancel = createRecorder();

    render(
      <ConfirmDialog title="Eliminar" message="¿Seguro?" confirmLabel="Sí, eliminar" onConfirm={confirm.fn} onCancel={cancel.fn} />
    );

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(confirm.calls).toHaveLength(1);
    expect(cancel.calls).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cancel.calls).toHaveLength(1);
  });

  it('cancela al presionar Escape', async () => {
    const user = userEvent.setup();
    const confirm = createRecorder();
    const cancel = createRecorder();

    render(<ConfirmDialog title="Eliminar" message="¿Seguro?" onConfirm={confirm.fn} onCancel={cancel.fn} />);

    await user.keyboard('{Escape}');
    expect(cancel.calls).toHaveLength(1);
    expect(confirm.calls).toHaveLength(0);
  });

  it('bloquea ambos botones mientras la acción está en curso', () => {
    const confirm = createRecorder();
    const cancel = createRecorder();

    render(<ConfirmDialog title="Eliminar" message="¿Seguro?" isBusy onConfirm={confirm.fn} onCancel={cancel.fn} />);

    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
