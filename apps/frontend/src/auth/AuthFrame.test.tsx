import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthFrame } from './AuthFrame';

vi.mock('./AuthParticles', () => ({ AuthParticles: ({ reducedMotion }: { reducedMotion: boolean }) => <div data-testid="particles" data-motion-active={!reducedMotion} /> }));

describe('Authentication motion preference', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('responds to the system preference without remounting the form', () => {
    let change!: (event: MediaQueryListEvent) => void;
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
        if (query === '(prefers-reduced-motion: reduce)') change = listener;
      },
      removeEventListener: vi.fn(),
    }));
    render(<MemoryRouter><AuthFrame title="Acceso" description="Tu cuenta"><input aria-label="Borrador" defaultValue="" /></AuthFrame></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Borrador'), { target: { value: 'Sin perder el formulario' } });
    expect(screen.getByTestId('particles')).toHaveAttribute('data-motion-active', 'true');
    act(() => change({ matches: true } as MediaQueryListEvent));
    expect(screen.getByTestId('particles')).toHaveAttribute('data-motion-active', 'false');
    expect(screen.getByLabelText('Borrador')).toHaveValue('Sin perder el formulario');
  });
});
