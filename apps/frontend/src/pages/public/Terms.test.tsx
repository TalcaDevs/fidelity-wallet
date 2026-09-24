import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
// ?raw (Vite): el archivo del backend como texto, sin depender de APIs de Node.
import backendTermsSource from '../../../../backend/src/customers/terms.ts?raw';
import { Terms } from './Terms';
import { TERMS_VERSION, LEGAL_IS_DRAFT } from '../../lib/legal';

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

  it('uses the same TERMS_VERSION the backend stores in Customer.termsVersion', () => {
    // Si alguien cambia el texto y sube solo una de las dos versiones, la página mostraría una
    // fecha y la BD guardaría otra: el consentimiento quedaría asociado a un texto distinto.
    const match = backendTermsSource.match(/TERMS_VERSION\s*=\s*'([^']+)'/);
    expect(match?.[1]).toBe(TERMS_VERSION);
  });

  it('warns that it is a draft while the legal data is missing', () => {
    renderTerms();
    if (LEGAL_IS_DRAFT) {
      expect(screen.getByRole('note')).toHaveTextContent(/borrador/i);
    } else {
      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    }
  });
});
