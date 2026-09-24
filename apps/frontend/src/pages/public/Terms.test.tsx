import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { Terms, TERMS_VERSION } from './Terms';

function renderTerms() {
  render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>
  );
}

describe('Terms', () => {
  it('shows the terms title and the version in force', () => {
    renderTerms();
    expect(screen.getByRole('heading', { level: 1, name: /términos y condiciones/i })).toBeInTheDocument();
    expect(screen.getByText(/versión vigente desde el/i)).toBeInTheDocument();
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('covers the rules the product actually enforces', () => {
    renderTerms();
    // Registro con ambos datos, bloqueo antifraude, saldo compartido y datos personales
    expect(screen.getByText(/RUT y tu número de teléfono celular/)).toBeInTheDocument();
    expect(screen.getByText(/como máximo un sello cada 30 minutos/)).toBeInTheDocument();
    expect(screen.getByText(/sirven para cualquiera de las promociones activas/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tus datos personales/i })).toBeInTheDocument();
    expect(screen.getByText(/Ley N° 19.628/)).toBeInTheDocument();
  });

  it('links back to the public home', () => {
    renderTerms();
    expect(screen.getByRole('link', { name: /fidelity wallet/i })).toHaveAttribute('href', '/');
  });
});
