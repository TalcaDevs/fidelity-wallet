import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuth } from './SupabaseAuth';
import { UpdatePassword } from './UpdatePassword';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signUp: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth } }));
vi.mock('./AuthFrame', () => ({
  AuthFrame: ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
    <>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </>
  ),
}));

function renderWithRouter(ui: ReactNode, { route = '/admin/login' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('Authentication forms', () => {
  beforeEach(() => vi.resetAllMocks());

  it('keeps labelled credentials and password visibility without losing their values', () => {
    renderWithRouter(<SupabaseAuth />);
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
    const { container } = renderWithRouter(<SupabaseAuth />);
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
    const { container } = renderWithRouter(<SupabaseAuth />);
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
    const { container } = renderWithRouter(<SupabaseAuth />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'demo@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong-password' } });
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

  it('initiates Google OAuth sign in and disables controls while connecting', async () => {
    let resolveOAuth!: (val: { error: null }) => void;
    auth.signInWithOAuth.mockImplementation(() => new Promise((resolve) => { resolveOAuth = resolve; }));
    renderWithRouter(<SupabaseAuth />);
    const googleButton = screen.getByRole('button', { name: /Continuar con Google/ });
    expect(googleButton).toBeInTheDocument();
    fireEvent.click(googleButton);
    expect(screen.getByRole('button', { name: 'Conectando con Google…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Entrar a mi cuenta/ })).toBeDisabled();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin`,
      },
    });
    resolveOAuth({ error: null });
    await waitFor(() => expect(screen.getByRole('button', { name: /Continuar con Google/ })).toBeEnabled());
  });

  it('preserves query parameters in redirectTo when returning from OAuth', async () => {
    const originalHref = window.location.href;
    window.history.pushState({}, '', '/admin/login?redirect=%2Fadmin%2Fcustomers');
    auth.signInWithOAuth.mockResolvedValue({ error: null });

    try {
      renderWithRouter(<SupabaseAuth />);
      fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/ }));

      expect(auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin?redirect=%2Fadmin%2Fcustomers`,
        },
      });
      await waitFor(() => expect(screen.getByRole('button', { name: /Continuar con Google/ })).toBeEnabled());
    } finally {
      window.history.pushState({}, '', originalHref);
    }
  });

  it('displays error if Google OAuth rejects', async () => {
    auth.signInWithOAuth.mockRejectedValue(new Error('Popup blocked'));
    renderWithRouter(<SupabaseAuth />);
    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('cancelada o bloqueada');
    expect(screen.getByRole('button', { name: /Continuar con Google/ })).toBeEnabled();
  });

  it('displays error message returned by Google OAuth provider', async () => {
    auth.signInWithOAuth.mockResolvedValue({ error: { message: 'OAuth provider error' } });
    renderWithRouter(<SupabaseAuth />);
    fireEvent.click(screen.getByRole('button', { name: /Continuar con Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un problema temporal al procesar tu solicitud');
  });

  it('hides Google button in password reset mode', () => {
    renderWithRouter(<SupabaseAuth />);
    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    expect(screen.queryByRole('button', { name: /Continuar con Google/ })).not.toBeInTheDocument();
  });

  it('displays session inactivity timeout alert from sessionStorage and clears it', async () => {
    let sessionStore: Record<string, string> = { fidelity_logout_reason: 'inactivity' };
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStore[key] ?? null,
      removeItem: (key: string) => {
        delete sessionStore[key];
      },
    });

    try {
      renderWithRouter(<SupabaseAuth />);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Tu sesión ha expirado por inactividad (1 hora)');
      expect(sessionStore.fidelity_logout_reason).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('displays session inactivity timeout alert from URL parameter', async () => {
    const originalHref = window.location.href;
    window.history.pushState({}, '', '/admin/login?reason=inactivity');

    try {
      renderWithRouter(<SupabaseAuth />);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Tu sesión ha expirado por inactividad (1 hora)');
    } finally {
      window.history.pushState({}, '', originalHref);
    }
  });

  describe('Merchant Registration Mode', () => {
    it('renders register form when on register route and shows password requirements', () => {
      renderWithRouter(<SupabaseAuth />, { route: '/admin/register' });
      expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre de tu negocio o tienda/)).toBeInTheDocument();
      expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
      expect(screen.getByText('Al menos un número (0-9)')).toBeInTheDocument();
      expect(screen.getByText('Al menos una mayúscula (A-Z)')).toBeInTheDocument();
      expect(screen.getByText('Al menos una minúscula (a-z)')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crear mi cuenta/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Registrarme con Google/ })).toBeInTheDocument();
    });

    it('switches between login and register modes', () => {
      renderWithRouter(<SupabaseAuth />, { route: '/admin/login' });
      expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();

      const registerLink = screen.getByRole('link', { name: 'Regístrate aquí' });
      fireEvent.click(registerLink);
      expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();

      const loginLink = screen.getByRole('link', { name: 'Inicia sesión aquí' });
      fireEvent.click(loginLink);
      expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    });

    it('validates password security requirements', async () => {
      const { container } = renderWithRouter(<SupabaseAuth initialMode="register" />);
      fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'owner@cafe.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'short' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.submit(container.querySelector('form')!);

      expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña debe cumplir con todos los requisitos de seguridad');
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    it('validates terms and conditions acceptance before submitting', async () => {
      const { container } = renderWithRouter(<SupabaseAuth initialMode="register" />);
      fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'owner@cafe.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ValidPass123' } });
      fireEvent.submit(container.querySelector('form')!);

      expect(await screen.findByRole('alert')).toHaveTextContent('Debes aceptar los Términos del Servicio');
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    it('successfully registers with optional business name in metadata and auto-confirms session', async () => {
      auth.signUp.mockResolvedValue({
        data: {
          session: { access_token: 'fake-token' },
          user: { id: 'user-1', email: 'owner@cafe.cl' },
        },
        error: null,
      });

      const { container } = renderWithRouter(<SupabaseAuth initialMode="register" />);
      fireEvent.change(screen.getByLabelText(/Nombre de tu negocio o tienda/), { target: { value: 'Cafetería Don Pepe' } });
      fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'owner@cafe.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ValidPass123' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.submit(container.querySelector('form')!);

      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'owner@cafe.cl',
        password: 'ValidPass123',
        options: {
          data: {
            business_name: 'Cafetería Don Pepe',
          },
        },
      });
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('successfully registers without business name (defaults to empty metadata object)', async () => {
      auth.signUp.mockResolvedValue({
        data: {
          session: { access_token: 'fake-token' },
          user: { id: 'user-2', email: 'solo-ver@tienda.cl' },
        },
        error: null,
      });

      const { container } = renderWithRouter(<SupabaseAuth initialMode="register" />);
      fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'solo-ver@tienda.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ValidPass123' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.submit(container.querySelector('form')!);

      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'solo-ver@tienda.cl',
        password: 'ValidPass123',
        options: {
          data: {},
        },
      });
    });

    it('displays notice message if Supabase requires email confirmation (session is null)', async () => {
      auth.signUp.mockResolvedValue({
        data: {
          session: null,
          user: { id: 'user-3', email: 'pending@confirm.cl' },
        },
        error: null,
      });

      const { container } = renderWithRouter(<SupabaseAuth initialMode="register" />);
      fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'pending@confirm.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ValidPass123' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.submit(container.querySelector('form')!);

      expect(await screen.findByRole('status')).toHaveTextContent('revisa tu correo electrónico para verificar tu cuenta');
    });

    it('translates user already registered error gracefully', async () => {
      auth.signUp.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'User already registered' },
      });

      const { container } = renderWithRouter(<SupabaseAuth initialMode="register" />);
      fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'existing@owner.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ValidPass123' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.submit(container.querySelector('form')!);

      expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con este correo electrónico');
    });

    it('translates "Signups not allowed for this instance" into clear Spanish advice', async () => {
      auth.signUp.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Signups not allowed for this instance' },
      });

      const { container } = renderWithRouter(<SupabaseAuth initialMode="register" />);
      fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'owner@cafe.cl' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ValidPass123' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.submit(container.querySelector('form')!);

      expect(await screen.findByRole('alert')).toHaveTextContent('El registro de nuevas cuentas está momentáneamente restringido');
    });
  });
});
