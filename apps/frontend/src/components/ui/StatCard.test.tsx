import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('shows the value once loaded', () => {
    render(
      <StatCard title="Pases Activos" value={42} icon={<span />} color="blue" footnote="Total acumulado" />
    );
    expect(screen.getByText('Pases Activos')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total acumulado')).toBeInTheDocument();
  });

  it('shows a skeleton instead of the value while loading', () => {
    render(
      <StatCard title="Pases Activos" value={42} icon={<span />} color="blue" footnote="Total acumulado" loading />
    );
    expect(screen.getByText('Pases Activos')).toBeInTheDocument();
    expect(screen.getByTestId('stat-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('renders a neutral footnote tone without the trend icon', () => {
    render(
      <StatCard title="Premios Canjeados" value={5} icon={<span />} color="orange" footnote="Total histórico" footnoteTone="neutral" />
    );
    expect(screen.getByText('Total histórico')).toBeInTheDocument();
  });
});
