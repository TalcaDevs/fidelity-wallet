import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from '../Pagination';

describe('Pagination Component', () => {
  it('no renderiza nada cuando hay 1 página o menos por defecto', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza cuando hideOnSinglePage es false aunque haya 1 sola página', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={1}
        hideOnSinglePage={false}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('muestra el resumen de rango correctamente cuando se provee totalItems y pageSize', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={45}
        pageSize={10}
        itemLabel="clientes"
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/11 - 20/)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/clientes/)).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument();
  });

  it('calcula correctamente el rango en la última página', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalItems={45}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/41 - 45/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('deshabilita el botón anterior en la primera página y llama a onPageChange al presionar siguiente', async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    );

    const prevBtn = screen.getByRole('button', { name: 'Anterior' });
    const nextBtn = screen.getByRole('button', { name: 'Siguiente' });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    await userEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('llama a onPageChange con la página anterior al presionar anterior', async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={3}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    );

    const prevBtn = screen.getByRole('button', { name: 'Anterior' });
    const nextBtn = screen.getByRole('button', { name: 'Siguiente' });

    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();

    await userEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('utiliza aria-labels accesibles personalizados o derivados de itemLabel', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={2}
        itemLabel="movimientos"
        onPageChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Página anterior de movimientos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Página siguiente de movimientos' }),
    ).toBeInTheDocument();
  });
});
