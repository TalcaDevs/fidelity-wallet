import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Join } from './Join';

// Simulación de fetch sin usar vi.fn()
let currentFetchHandler: ((url: string, init?: any) => Promise<Response>) | null = null;

globalThis.fetch = async (input, init) => {
  if (currentFetchHandler) return currentFetchHandler(input.toString(), init);
  return new Response('Not found', { status: 404 });
};

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
    currentFetchHandler = null as any;
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
});
