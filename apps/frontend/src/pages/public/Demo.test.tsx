import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect, vi } from 'vitest';
import Demo from './Demo';

function click(name: RegExp) { fireEvent.click(screen.getByRole('button', { name })); }
function mount() { render(<MemoryRouter><Demo /></MemoryRouter>); }
function openScanner() {
  click(/Atender mi primera visita/);
  click(/Mostrar mi QR/);
  click(/Abrir lector y escanear QR/);
}

describe('Demo pública guiada', () => {
  afterEach(() => vi.useRealTimers());

  it('personaliza, guía la compra y el canje y refleja el historial del dueño', async () => {
    vi.useFakeTimers();
    mount();
    fireEvent.change(screen.getByLabelText('Nombre de tu cafetería'), { target: { value: 'Café del Sur' } });
    click(/Terracota/);
    const client = within(screen.getByRole('region', { name: 'Vista del cliente' }));
    expect(client.getByText('Café del Sur')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Terracota/ })).toHaveAttribute('aria-pressed', 'true');
    expect(client.getByLabelText('4 de 5 sellos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar compra/ })).not.toBeInTheDocument();
    openScanner();
    expect(screen.getByRole('button', { name: /Identificando tarjeta/ })).toBeDisabled();
    expect(client.getByLabelText('4 de 5 sellos')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1700));
    expect(screen.getByRole('button', { name: /Confirmar compra/ })).toHaveFocus();
    click(/Confirmar compra/);
    expect(client.getByLabelText('5 de 5 sellos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Elegir mi café/ })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /Confirmar compra/ })).not.toBeInTheDocument();
    click(/Elegir mi café/);
    expect(client.getByLabelText('5 de 5 sellos')).toBeInTheDocument();
    click(/Entregar café y confirmar canje/);
    expect(client.getByLabelText('0 de 5 sellos')).toBeInTheDocument();
    expect(screen.getByText('847')).toBeInTheDocument();
    expect(screen.getByText('93')).toBeInTheDocument();
    click(/Explorar la ficha/);
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    expect(screen.getByText('Hoy · Canje confirmado · −5 sellos')).toBeInTheDocument();
    click(/^Métricas$/);
    expect(screen.getByText('847')).toBeInTheDocument();
    click(/Reiniciar demo/);
    expect(client.getByLabelText('4 de 5 sellos')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de tu cafetería')).toHaveValue('Café del Sur');
    expect(screen.queryByText('847')).not.toBeInTheDocument();
  });

  it('cancela una lectura pendiente al reiniciar', async () => {
    vi.useFakeTimers();
    mount();
    openScanner();
    click(/Reiniciar demo/);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByLabelText('Nombre de tu cafetería')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar compra/ })).not.toBeInTheDocument();
  });

  it('permite completar la lectura con las animaciones pausadas y cambiar de vista', async () => {
    vi.useFakeTimers();
    mount();
    click(/Pausar animaciones/);
    expect(screen.getByRole('button', { name: /Activar animaciones/ })).toHaveAttribute('aria-pressed', 'true');
    click(/^Teléfono del cliente$/);
    expect(screen.getByRole('region', { name: 'Vista del cliente' })).toHaveAttribute('data-mobile-visible', 'true');
    click(/^Tu comercio$/);
    openScanner();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByRole('button', { name: /Confirmar compra/ })).toBeEnabled();
  });
});
