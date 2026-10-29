import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard, formatChange } from '../StatCard';

describe('formatChange', () => {
  it('formats null as N/A neutral', () => {
    expect(formatChange(null)).toEqual({ text: 'N/A', positive: true, neutral: true });
  });

  it('formats 0 as 0% neutral', () => {
    expect(formatChange(0)).toEqual({ text: '0%', positive: true, neutral: true });
  });

  it('formats positive change with plus sign', () => {
    expect(formatChange(25)).toEqual({ text: '+25%', positive: true, neutral: false });
  });

  it('formats negative change without extra plus sign', () => {
    expect(formatChange(-10)).toEqual({ text: '-10%', positive: false, neutral: false });
  });
});

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

  it('renders a positive footnote with trend icon', () => {
    const { container } = render(
      <StatCard title="Cargas" value={100} icon={<span />} footnote="+15% este mes" footnoteTone="positive" />
    );
    expect(screen.getByText('+15% este mes')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders subtle footnote tone without pill background', () => {
    render(
      <StatCard title="Total Clientes" value={10} footnote="8 frecuentes · 2 nuevos" footnoteTone="subtle" />
    );
    expect(screen.getByText('8 frecuentes · 2 nuevos')).toBeInTheDocument();
  });

  it('renders string values and custom valueClassName', () => {
    render(
      <StatCard
        title="Compras Registradas"
        value="$50.000"
        valueClassName="text-emerald-500 font-bold"
      />
    );
    expect(screen.getByText('$50.000')).toHaveClass('text-emerald-500');
  });

  it('renders change percentage badge and previous value', () => {
    render(
      <StatCard
        title="Tasa de Recurrencia"
        value={75}
        previousValue={60}
        changePercentage={25}
        suffix="%"
      />
    );
    expect(screen.getByText('Tasa de Recurrencia')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('+25%')).toBeInTheDocument();
    expect(screen.getByText(/Período anterior:/)).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders negative change badge and null change as N/A', () => {
    const { rerender } = render(
      <StatCard title="Ventas" value={100} changePercentage={-12} />
    );
    expect(screen.getByText('-12%')).toBeInTheDocument();

    rerender(<StatCard title="Ventas" value={100} changePercentage={null} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders tooltip accessible element when tooltip is passed', () => {
    render(
      <StatCard
        title="Sellos Vencidos"
        value={3}
        tooltip="Sellos no canjeados a tiempo"
      />
    );
    expect(screen.getByLabelText('Sellos no canjeados a tiempo')).toBeInTheDocument();
  });
});
