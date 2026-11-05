import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyBox } from '../CopyBox';
import { ToastContext } from '../../../lib/toastContext';

describe('CopyBox Component', () => {
  const notifySuccess = vi.fn();
  const notifyError = vi.fn();
  const writeTextMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    writeTextMock.mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  const renderWithToast = (ui: React.ReactElement) => {
    return render(
      <ToastContext.Provider value={{ notifySuccess, notifyError }}>
        {ui}
      </ToastContext.Provider>,
    );
  };

  it('renderiza la etiqueta y el valor a copiar', () => {
    renderWithToast(
      <CopyBox
        label="Link de registro"
        value="https://app.fidelity.cl/join/cafe"
      />,
    );

    expect(screen.getByText('Link de registro')).toBeInTheDocument();
    expect(screen.getByText('https://app.fidelity.cl/join/cafe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });

  it('copia el texto al portapapeles y cambia a ¡Copiado!', async () => {
    renderWithToast(
      <CopyBox
        value="https://app.fidelity.cl/join/cafe"
        buttonLabel="Copiar"
        copiedLabel="¡Copiado!"
      />,
    );

    const button = screen.getByRole('button', { name: 'Copiar' });
    await userEvent.click(button);

    expect(writeTextMock).toHaveBeenCalledWith('https://app.fidelity.cl/join/cafe');
    expect(await screen.findByText('¡Copiado!')).toBeInTheDocument();
  });

  it('notifica éxito por Toast cuando se provee successMessage', async () => {
    renderWithToast(
      <CopyBox
        value="codigo-123"
        buttonLabel="Copiar link"
        successMessage="Link copiado con éxito."
      />,
    );

    const button = screen.getByRole('button', { name: 'Copiar link' });
    await userEvent.click(button);

    expect(notifySuccess).toHaveBeenCalledWith('Link copiado con éxito.');
  });

  it('muestra error por Toast cuando la escritura en portapapeles falla', async () => {
    writeTextMock.mockRejectedValue(new Error('Permission denied'));

    renderWithToast(
      <CopyBox
        value="codigo-123"
        errorMessage="No se pudo copiar el texto"
      />,
    );

    const button = screen.getByRole('button', { name: 'Copiar' });
    await userEvent.click(button);

    expect(notifyError).toHaveBeenCalledWith('No se pudo copiar el texto');
  });

  it('ejecuta callback onCopied tras copiar con éxito', async () => {
    const onCopied = vi.fn();
    renderWithToast(
      <CopyBox
        value="https://app.fidelity.cl/join/cafe"
        onCopied={onCopied}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(onCopied).toHaveBeenCalledTimes(1);
  });
});
