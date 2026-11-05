import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedTabs, SegmentedControl } from '../SegmentedTabs';

describe('SegmentedTabs', () => {
  const options = [
    { value: 'all', label: 'Todos', count: 24 },
    { value: 'frequent', label: '⭐ Frecuentes', count: 0 },
    { value: 'new', label: '🟢 Nuevos', count: 2 },
    { value: 'inactive', label: '💤 Inactivos', count: 0, disabled: true },
  ];

  it('renders all options with labels and counts', () => {
    render(
      <SegmentedTabs
        value="all"
        onChange={vi.fn()}
        options={options}
        ariaLabel="Filtro de clientes"
      />
    );

    const allBtn = screen.getByRole('button', { name: /Todos \(24\)/i });
    const frequentBtn = screen.getByRole('button', { name: /Frecuentes \(0\)/i });
    const newBtn = screen.getByRole('button', { name: /Nuevos \(2\)/i });
    const inactiveBtn = screen.getByRole('button', { name: /Inactivos \(0\)/i });

    expect(allBtn).toBeInTheDocument();
    expect(frequentBtn).toBeInTheDocument();
    expect(newBtn).toBeInTheDocument();
    expect(inactiveBtn).toBeInTheDocument();
  });

  it('marks active button with aria-pressed and calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedTabs
        value="all"
        onChange={handleChange}
        options={options}
      />
    );

    const allBtn = screen.getByRole('button', { name: /Todos \(24\)/i });
    const newBtn = screen.getByRole('button', { name: /Nuevos \(2\)/i });

    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    expect(newBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(newBtn);
    expect(handleChange).toHaveBeenCalledWith('new');
  });

  it('does not invoke onChange when a disabled button is clicked', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedTabs
        value="all"
        onChange={handleChange}
        options={options}
      />
    );

    const inactiveBtn = screen.getByRole('button', { name: /Inactivos \(0\)/i });
    expect(inactiveBtn).toBeDisabled();

    fireEvent.click(inactiveBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('supports buttonRole="tab" with role="tablist" and aria-selected', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedTabs
        value="today"
        onChange={handleChange}
        buttonRole="tab"
        ariaLabel="Filtro temporal"
        options={[
          { value: 'today', label: 'Hoy' },
          { value: 'week', label: 'Esta semana' },
        ]}
      />
    );

    const tablist = screen.getByRole('tablist', { name: 'Filtro temporal' });
    expect(tablist).toBeInTheDocument();

    const todayTab = screen.getByRole('tab', { name: 'Hoy' });
    const weekTab = screen.getByRole('tab', { name: 'Esta semana' });

    expect(todayTab).toHaveAttribute('aria-selected', 'true');
    expect(weekTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(weekTab);
    expect(handleChange).toHaveBeenCalledWith('week');
  });

  it('renders correctly with boolean values (e.g. billing annual switcher)', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedTabs<boolean>
        value={false}
        onChange={handleChange}
        variant="soft"
        activeTone="surface"
        size="md"
        options={[
          { value: false, label: 'Mensual' },
          { value: true, label: 'Anual' },
        ]}
      />
    );

    const mensualBtn = screen.getByRole('button', { name: 'Mensual' });
    const anualBtn = screen.getByRole('button', { name: 'Anual' });

    expect(mensualBtn).toHaveAttribute('aria-pressed', 'true');
    expect(anualBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(anualBtn);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('supports buttonRole="radio" with role="radiogroup" and aria-checked', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedTabs
        id="radio-test"
        value="opt1"
        onChange={handleChange}
        buttonRole="radio"
        variant="soft"
        size="sm"
        ariaLabel="Opciones de radio"
        options={[
          { value: 'opt1', label: 'Opción 1', id: 'opt1-btn', 'aria-label': 'Primera opción' },
          { value: 'opt2', label: 'Opción 2' },
        ]}
      />
    );

    const radiogroup = screen.getByRole('radiogroup', { name: 'Opciones de radio' });
    expect(radiogroup).toBeInTheDocument();
    expect(radiogroup).toHaveAttribute('id', 'radio-test');

    const radio1 = screen.getByRole('radio', { name: 'Primera opción' });
    const radio2 = screen.getByRole('radio', { name: 'Opción 2' });

    expect(radio1).toHaveAttribute('aria-checked', 'true');
    expect(radio2).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(radio2);
    expect(handleChange).toHaveBeenCalledWith('opt2');
  });

  it('supports icons and custom badges', () => {
    render(
      <SegmentedControl
        value="list"
        onChange={vi.fn()}
        options={[
          {
            value: 'list',
            label: 'Lista',
            icon: <span data-testid="icon-list">📋</span>,
            badge: <span data-testid="badge-pro">PRO</span>,
          },
        ]}
      />
    );

    expect(screen.getByTestId('icon-list')).toBeInTheDocument();
    expect(screen.getByTestId('badge-pro')).toBeInTheDocument();
  });
});
