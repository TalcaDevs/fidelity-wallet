import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

function ExampleForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Editar datos</button>
      {open && <Modal trapFocus title="Datos" onClose={() => setOpen(false)}><input aria-label="Nombre" /></Modal>}
    </>
  );
}

describe('Panel dialog focus', () => {
  it('includes form fields in the focus loop and restores the opener after Escape', () => {
    render(<ExampleForm />);
    const opener = screen.getByRole('button', { name: 'Editar datos' });
    opener.focus();
    fireEvent.click(opener);
    const close = screen.getByRole('button', { name: 'Cerrar' });
    const input = screen.getByRole('textbox', { name: 'Nombre' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('keeps focus in a confirmation dialog while all actions are disabled', () => {
    render(<ConfirmDialog trapFocus isBusy title="Guardando" message="Procesando" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(dialog).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled();
  });
});
