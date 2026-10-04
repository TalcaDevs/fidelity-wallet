import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Join } from './Join';

// Simulación de fetch sin usar vi.fn()
let currentFetchHandler: ((url: string, init?: RequestInit) => Promise<Response>) | null = null;
let originalFetch: typeof globalThis.fetch;

beforeAll(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (currentFetchHandler) return currentFetchHandler(input.toString(), init);
    return new Response('Not found', { status: 404 });
  };
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});


function renderJoin(merchantName = 'test-merchant') {
  return render(
    <MemoryRouter initialEntries={[`/join/${merchantName}`]}>
      <Routes>
        <Route path="/join/:merchantName" element={<Join />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Join', () => {
  afterEach(() => {
    currentFetchHandler = null;
  });

  it('muestra mensaje de error si hay fallo de red al cargar el local', async () => {
    currentFetchHandler = async () => {
      throw new Error('Network failure');
    };

    renderJoin();

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar la información del local. Revisa tu conexión.')).toBeInTheDocument();
    });
  });

  it('muestra mensaje específico si el local no tiene promociones', async () => {
    currentFetchHandler = async (url) => {
      if (url.includes('/api/merchants/by-slug/test-merchant')) {
        return new Response(JSON.stringify({ 
          id: 'm1', 
          name: 'Local Sin Promos', 
          slug: 'test-merchant',
          Promotion: [],
          activePromotions: []
        }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    };

    renderJoin();

    await waitFor(() => {
      expect(screen.getByText('Este local aún no tiene un programa de sellos activo. Vuelve a intentarlo más adelante.')).toBeInTheDocument();
    });
  });

  it('exige validación del checkbox para poder obtener la tarjeta', async () => {
    currentFetchHandler = async (url) => {
      if (url.includes('/api/merchants/by-slug/test-merchant')) {
        return new Response(JSON.stringify({ 
          id: 'm1', 
          name: 'Local Test', 
          slug: 'test-merchant',
          Promotion: [{ id: 'p1', targetStamps: 5, rewardName: 'Café' }],
          activePromotions: [{ id: 'p1' }]
        }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    };

    renderJoin();

    // Esperar a que cargue el local
    await waitFor(() => {
      expect(screen.getByText('Local Test')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    
    // Llenar RUT y Teléfono válidos
    await user.type(screen.getByLabelText(/RUT/i), '12345678-5');
    await user.type(screen.getByLabelText(/celular/i), '912345678');

    // Click en obtener tarjeta SIN aceptar términos
    await user.click(screen.getByRole('button', { name: 'Obtener mi Tarjeta' }));

    // Debería mostrar error de términos
    expect(screen.getByText('Debes aceptar los términos y condiciones para obtener tu tarjeta.')).toBeInTheDocument();

    // Aceptar términos y volver a intentar
    await user.click(screen.getByRole('checkbox', { name: /Acepto los/i }));
    
    // Preparar el fetch para el POST /api/customers
    let postCalled = false;
    currentFetchHandler = async (url, init) => {
      if (url.includes('/api/customers') && init?.method === 'POST') {
        postCalled = true;
        return new Response(JSON.stringify({ appleWalletUrl: 'http://apple', googleWalletUrl: 'http://google' }), { status: 201 });
      }
      return new Response('{}', { status: 404 });
    };

    await user.click(screen.getByRole('button', { name: 'Obtener mi Tarjeta' }));

    await waitFor(() => {
      expect(postCalled).toBe(true);
      expect(screen.getByText('¡Tarjeta Lista!')).toBeInTheDocument();
    });
  });
describe('datos del alta', () => {
    const merchantHandler = (onPost: (body: Record<string, unknown>) => void) =>
      async (url: string, init?: RequestInit) => {
        if (url.includes('/api/merchants/by-slug/test-merchant')) {
          return new Response(JSON.stringify({
            id: 'm1',
            name: 'Local Test',
            slug: 'test-merchant',
            Promotion: [{ id: 'p1', targetStamps: 5, rewardName: 'Café' }],
            activePromotions: [{ id: 'p1' }],
          }), { status: 200 });
        }
        if (url.includes('/api/customers') && init?.method === 'POST') {
          onPost(JSON.parse(init.body as string) as Record<string, unknown>);
          return new Response(JSON.stringify({ appleWalletUrl: 'http://apple', googleWalletUrl: 'http://google' }), { status: 201 });
        }
        return new Response('{}', { status: 404 });
      };

    it('pide el teléfono o el correo y no envía nada sin ellos', async () => {
      const posts: Record<string, unknown>[] = [];
      currentFetchHandler = merchantHandler((body) => posts.push(body));
      renderJoin();
      await screen.findByText('Local Test');
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/nombre/i), 'María');
      await user.click(screen.getByRole('checkbox', { name: /Acepto los/i }));
      await user.click(screen.getByRole('button', { name: 'Obtener mi Tarjeta' }));

      expect(screen.getByText('Ingresa tu teléfono o tu correo para recibir tu tarjeta.')).toBeInTheDocument();
      expect(posts).toEqual([]);
    });

    it('emite la tarjeta solo con correo, nombre y cumpleaños sin año', async () => {
      const posts: Record<string, unknown>[] = [];
      currentFetchHandler = merchantHandler((body) => posts.push(body));
      renderJoin();
      await screen.findByText('Local Test');
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/nombre/i), '  María Pérez ');
      await user.type(screen.getByLabelText(/correo electrónico/i), 'Maria@Gmail.com');
      await user.selectOptions(screen.getByLabelText('Día'), '14');
      await user.selectOptions(screen.getByLabelText('Mes'), 'Febrero');
      await user.click(screen.getByRole('checkbox', { name: /Acepto los/i }));
      await user.click(screen.getByRole('button', { name: 'Obtener mi Tarjeta' }));

      await screen.findByText('¡Tarjeta Lista!');
      expect(posts).toEqual([{
        merchantId: 'm1',
        name: 'María Pérez',
        email: 'maria@gmail.com',
        birthDay: 14,
        birthMonth: 2,
        acceptedTerms: true,
      }]);
    });

    it('no envía un RUT opcional mal escrito ni un cumpleaños incompleto', async () => {
      const posts: Record<string, unknown>[] = [];
      currentFetchHandler = merchantHandler((body) => posts.push(body));
      renderJoin();
      await screen.findByText('Local Test');
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/celular/i), '912345678');
      await user.type(screen.getByLabelText(/RUT/i), '12345678-0');
      await user.selectOptions(screen.getByLabelText('Mes'), 'Abril');
      await user.click(screen.getByRole('checkbox', { name: /Acepto los/i }));
      await user.click(screen.getByRole('button', { name: 'Obtener mi Tarjeta' }));

      expect(screen.getByText('Indica el día y el mes de tu cumpleaños')).toBeInTheDocument();
      expect(posts).toEqual([]);
    });
  });

  describe('lo que pide la tarjeta', () => {
    const merchantWith = (card: object) => async (url: string, init?: RequestInit) => {
      if (url.includes('/api/merchants/by-slug/')) {
        return new Response(
          JSON.stringify({
            id: 'm1',
            name: 'Café Puntos',
            slug: 'test-merchant',
            stampValidityDays: null,
            activePromotions: [{ id: 'p1', name: 'Postre', targetStamps: 500, rewardName: 'Postre gratis' }],
            card: {
              type: 'POINTS',
              name: 'Club',
              backgroundColor: '#A3472F',
              textColor: '#FFFFFF',
              logoUrl: null,
              heroImageUrl: null,
              pesosPerPoint: 1000,
              welcomeBalance: 50,
              registration: { phone: 'OPTIONAL', email: 'OPTIONAL', name: 'OPTIONAL', birthday: 'OPTIONAL', rut: 'OPTIONAL' },
              closed: false,
              ...card,
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes('/api/customers')) {
        lastBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ googleWalletUrl: 'https://pay.google.com/x' }), { status: 201 });
      }
      return new Response('{}', { status: 404 });
    };
    let lastBody: Record<string, unknown> | null = null;

    it('talks about points and the welcome gift', async () => {
      currentFetchHandler = merchantWith({});
      renderJoin();
      expect(await screen.findByText('Junta 500 puntos, llévate Postre gratis')).toBeInTheDocument();
      expect(screen.getByText(/te regalamos 50 puntos/i)).toBeInTheDocument();
    });

    it('hides what the brand does not ask for and requires what it does', async () => {
      currentFetchHandler = merchantWith({
        registration: { phone: 'REQUIRED', email: 'HIDDEN', name: 'REQUIRED', birthday: 'HIDDEN', rut: 'HIDDEN' },
      });
      const user = userEvent.setup();
      renderJoin();

      await screen.findByText('Junta 500 puntos, llévate Postre gratis');
      expect(screen.queryByLabelText(/Correo electrónico/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Cumpleaños/)).not.toBeInTheDocument();
      expect(screen.queryByText(/al menos uno/)).not.toBeInTheDocument();

      await user.type(screen.getByLabelText(/Teléfono celular/), '912345678');
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Obtener mi Tarjeta' }));
      expect(screen.getByText('Ingresa tu nombre.')).toBeInTheDocument();
      expect(lastBody).toBeNull();

      await user.type(screen.getByLabelText(/Nombre/), 'Ana');
      await user.click(screen.getByRole('button', { name: 'Obtener mi Tarjeta' }));
      await waitFor(() => expect(lastBody).toMatchObject({ name: 'Ana', phone: expect.any(String) }));
      expect(lastBody).not.toHaveProperty('email');
    });

    it('does not offer new cards once the program ended', async () => {
      currentFetchHandler = merchantWith({ closed: true });
      renderJoin();
      expect(await screen.findByText(/ya terminó/)).toBeInTheDocument();
    });
  });
});
