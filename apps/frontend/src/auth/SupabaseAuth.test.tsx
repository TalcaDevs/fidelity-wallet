import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuth } from './SupabaseAuth';
import { UpdatePassword } from './UpdatePassword';

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { auth } }));
vi.mock('./AuthFrame', () => ({ AuthFrame: ({ title, children }: { title: string; children: ReactNode }) => <><h1>{title}</h1>{children}</> }));

describe('Authentication forms', () => {
  beforeEach(() => vi.resetAllMocks());

  it('keeps labelled credentials and password visibility without losing their values', () => {
    render(<SupabaseAuth />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'demo@example.com' } });
    const password = screen.getByLabelText('Contraseña');
    fireEvent.change(password, { target: { value: 'example-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('example-password');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('demo@example.com');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('disables submission while signing in and presents a failed request with a retry', async () => {
    let rejectRequest!: (reason: Error) => void;
    auth.signInWithPassword.mockImplementation(() => new Promise((_, reject) => { rejectRequest = reject; }));
    const { container } = render(<SupabaseAuth />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'demo@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'example-password' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByRole('button', { name: 'Iniciando sesión…' })).toBeDisabled();
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'demo@example.com', password: 'example-password' });
    rejectRequest(new Error('Network unavailable'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tu conexión');
    expect(screen.getByRole('button', { name: /Entrar a mi cuenta/ })).toBeEnabled();
  });

  it('preserves the recovery redirect and a neutral notice, then clears it on return', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const { container } = render(<SupabaseAuth />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'demo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    expect(screen.getByRole('heading', { name: 'Recupera tu acceso' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('status')).toHaveTextContent('Si ese correo tiene una cuenta');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('demo@example.com', { redirectTo: `${window.location.origin}/admin/reset` });
    fireEvent.click(screen.getByRole('button', { name: /Volver a iniciar sesión/ }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('demo@example.com');
  });

  it('keeps authentication errors visible', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Credenciales inválidas' } });
    const { container } = render(<SupabaseAuth />);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
  });

  it('keeps password confirmation validation and completes only after a successful update', async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    const done = vi.fn();
    const { container } = render(<UpdatePassword onDone={done} />);
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'example-password' } });
    fireEvent.change(screen.getByLabelText('Repite la contraseña'), { target: { value: 'different-password' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Repite la contraseña'), { target: { value: 'example-password' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'example-password' });
  });
});
