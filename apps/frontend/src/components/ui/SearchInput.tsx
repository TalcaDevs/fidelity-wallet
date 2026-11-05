import type { ChangeEvent } from 'react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
  autoFocus?: boolean;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  ariaLabel,
  id = 'search-input',
  className = '',
  autoFocus = false,
  onClear,
}: SearchInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={`relative w-full ${className}`}>
      {ariaLabel && (
        <label htmlFor={id} className="sr-only">
          {ariaLabel}
        </label>
      )}
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-panel-muted">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        id={id}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-11 pr-10 py-3 bg-panel-surface rounded-2xl border border-panel-border focus:outline-none focus:ring-4 focus:ring-panel-accent/20 focus:border-panel-accent transition-all text-panel-text font-medium text-sm"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-panel-muted hover:text-panel-text transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
