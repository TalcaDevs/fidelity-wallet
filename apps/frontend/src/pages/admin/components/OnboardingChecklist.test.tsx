import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OnboardingChecklist } from './OnboardingChecklist';
import { ROUTES } from '../../../components/routing/routePaths';

describe('OnboardingChecklist', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders all 3 onboarding steps with correct route links', () => {
    render(
      <MemoryRouter>
        <OnboardingChecklist brandId="brand-test-123" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Primeros pasos/ })).toBeInTheDocument();

    const cardLink = screen.getByRole('link', { name: /Personaliza tu tarjeta/ });
    expect(cardLink).toHaveAttribute('href', ROUTES.card);

    const qrLink = screen.getByRole('link', { name: /Imprime tu Kit de Mesón/ });
    expect(qrLink).toHaveAttribute('href', ROUTES.locations);

    const teamLink = screen.getByRole('link', { name: /Invita a tu equipo/ });
    expect(teamLink).toHaveAttribute('href', ROUTES.team);
  });

  it('hides the checklist when the dismiss button is clicked and remembers it in localStorage', () => {
    render(
      <MemoryRouter>
        <OnboardingChecklist brandId="brand-test-123" />
      </MemoryRouter>
    );

    const dismissBtn = screen.getByRole('button', { name: /Ocultar guía/ });
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole('heading', { name: /Primeros pasos/ })).not.toBeInTheDocument();
    expect(store['fw_dismissed_onboarding_brand-test-123']).toBe('true');
  });

  it('does not render full checklist if already dismissed in localStorage, but offers restore button', () => {
    store['fw_dismissed_onboarding_brand-test-123'] = 'true';

    render(
      <MemoryRouter>
        <OnboardingChecklist brandId="brand-test-123" />
      </MemoryRouter>
    );

    expect(screen.queryByRole('heading', { name: /Primeros pasos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mostrar guía/ })).toBeInTheDocument();
  });

  it('restores the full checklist when the restore button is clicked', () => {
    store['fw_dismissed_onboarding_brand-test-123'] = 'true';

    render(
      <MemoryRouter>
        <OnboardingChecklist brandId="brand-test-123" />
      </MemoryRouter>
    );

    const restoreBtn = screen.getByRole('button', { name: /Mostrar guía/ });
    fireEvent.click(restoreBtn);

    expect(screen.getByRole('heading', { name: /Primeros pasos/ })).toBeInTheDocument();
    expect(store['fw_dismissed_onboarding_brand-test-123']).toBeUndefined();
  });
});
