import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('renders input with placeholder and accessibility label', () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        placeholder="Buscar clientes..."
        ariaLabel="Buscar por nombre o RUT"
      />
    );
    expect(screen.getByPlaceholderText('Buscar clientes...')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar por nombre o RUT')).toBeInTheDocument();
  });

  it('triggers onChange when typing', () => {
    const handleChange = vi.fn();
    render(<SearchInput value="" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(input, { target: { value: 'Juan' } });
    expect(handleChange).toHaveBeenCalledWith('Juan');
  });

  it('shows clear button when value is present and clears input on click', () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();
    render(
      <SearchInput
        value="Carlos"
        onChange={handleChange}
        onClear={handleClear}
      />
    );
    const clearBtn = screen.getByRole('button', { name: 'Limpiar búsqueda' });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('');
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
