import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldValue, IdentifierInput, IdentifierValue, PhoneField, RutField } from './IdentifierInput';

function setup(showErrors = false) {
  const changes: IdentifierValue[] = [];
  render(<IdentifierInput onChange={(v) => changes.push(v)} showErrors={showErrors} />);
  const last = () => changes[changes.length - 1];
  return { changes, last };
}

describe('IdentifierInput', () => {
  it('starts in RUT mode and formats with dots and dash while typing', () => {
    const { last } = setup();
    const input = screen.getByPlaceholderText('12.345.678-9');

    fireEvent.change(input, { target: { value: '123456785' } });

    expect(input).toHaveValue('12.345.678-5');
    expect(last()).toEqual({ kind: 'rut', value: '12.345.678-5', isValid: true });
  });

  it('flags a complete RUT with a wrong check digit (módulo 11)', () => {
    const { last } = setup();
    const input = screen.getByPlaceholderText('12.345.678-9');

    fireEvent.change(input, { target: { value: '123456780' } });

    expect(last()).toEqual({ kind: 'rut', value: '', isValid: false });
    expect(screen.getByRole('alert')).toHaveTextContent(/dígito verificador/i);
  });

  it('does not complain about an incomplete RUT until asked', () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('12.345.678-9'), { target: { value: '1234' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the incomplete-RUT error when showErrors is set', () => {
    setup(true);
    fireEvent.change(screen.getByPlaceholderText('12.345.678-9'), { target: { value: '1234' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/incompleto/i);
  });

  it('switches to phone mode with a fixed +56 prefix and emits the full number', () => {
    const { last } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Teléfono' }));

    expect(screen.getByText('+56')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('9 1234 5678');
    fireEvent.change(input, { target: { value: '912345678' } });

    expect(input).toHaveValue('9 1234 5678');
    expect(last()).toEqual({ kind: 'phone', value: '+56912345678', isValid: true });
  });

  it('strips a pasted +56 so the prefix is never duplicated', () => {
    const { last } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Teléfono' }));
    fireEvent.change(screen.getByPlaceholderText('9 1234 5678'), { target: { value: '+56 9 8765 4321' } });

    expect(last()).toEqual({ kind: 'phone', value: '+56987654321', isValid: true });
  });

  it('rejects a phone that does not start with 9', () => {
    const { last } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Teléfono' }));
    fireEvent.change(screen.getByPlaceholderText('9 1234 5678'), { target: { value: '22345678' } });

    expect(last().isValid).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent(/comenzar con 9/i);
  });

  it('clears the value when switching type', () => {
    const { last } = setup();
    fireEvent.change(screen.getByPlaceholderText('12.345.678-9'), { target: { value: '123456785' } });
    fireEvent.click(screen.getByRole('button', { name: 'Teléfono' }));

    expect(screen.getByPlaceholderText('9 1234 5678')).toHaveValue('');
    expect(last()).toEqual({ kind: 'phone', value: '', isValid: false });
    expect(screen.getByRole('button', { name: 'Teléfono' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('RutField and PhoneField (alta del cliente: los dos obligatorios)', () => {
  it('RutField reports the formatted RUT once it is valid', () => {
    const changes: FieldValue[] = [];
    render(<RutField label="RUT" onChange={(v) => changes.push(v)} />);

    fireEvent.change(screen.getByLabelText('RUT'), { target: { value: '123456785' } });

    expect(screen.getByLabelText('RUT')).toHaveValue('12.345.678-5');
    expect(changes[changes.length - 1]).toEqual({ value: '12.345.678-5', isValid: true });
  });

  it('PhoneField always carries the +56 prefix', () => {
    const changes: FieldValue[] = [];
    render(<PhoneField label="Teléfono celular" onChange={(v) => changes.push(v)} />);

    expect(screen.getByText('+56')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Teléfono celular'), { target: { value: '987654321' } });

    expect(changes[changes.length - 1]).toEqual({ value: '+56987654321', isValid: true });
  });

  it('shows both "required" errors when the form is submitted empty', () => {
    render(
      <>
        <RutField label="RUT" onChange={() => {}} showErrors />
        <PhoneField label="Teléfono celular" onChange={() => {}} showErrors />
      </>
    );

    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts).toEqual(['Ingresa tu RUT', 'Ingresa tu teléfono']);
  });
});
