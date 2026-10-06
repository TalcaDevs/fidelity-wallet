import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_DETAILS,
  DEFAULT_REGISTRATION,
  type CardConfigDto,
} from '@fidelity/shared';
import * as toastHook from '../../../hooks/useToast';
import * as cardService from '../../../services/cardService';
import { CardEditor } from './CardEditor';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,') } }));

const card = (overrides: Partial<CardConfigDto> = {}): CardConfigDto => ({
  programId: 'prog-1',
  brandName: 'Café Demo',
  designVersion: 2,
  updatedAt: '2026-10-03T12:00:00Z',
  points: { enabled: false, pesosPerPoint: 1000 },
  typeLocked: false,
  customers: 12,
  locations: 1,
  type: 'STAMPS',
  stampsEnabled: true,
  pointsEnabled: false,
  name: 'Tarjeta Café',
  rewards: [{ id: 'r-1', name: 'Café gratis', target: 10 }],
  welcomeBalance: 0,
  dailyStampLimit: true,
  stampValidityDays: null,
  validity: { type: 'UNLIMITED', expiresAt: null, days: null },
  registration: DEFAULT_REGISTRATION,
  design: DEFAULT_CARD_DESIGN,
  details: DEFAULT_CARD_DETAILS,
  ...overrides,
});

function renderEditor() {
  return render(
    <MemoryRouter>
      <CardEditor brandId="brand-1" />
    </MemoryRouter>,
  );
}

describe('CardEditor', () => {
  const notifySuccess = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    notifySuccess.mockReset();
    vi.spyOn(toastHook, 'useToast').mockReturnValue({ notifySuccess, notifyError: vi.fn() });
  });

  it('walks through the steps with a live preview', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card());
    renderEditor();

    expect(await screen.findByRole('heading', { name: 'Tarjeta Café' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Publicada');
    const preview = screen.getByRole('complementary', { name: 'Vista previa en vivo' });
    expect(within(preview).getByRole('img', { name: '3 de 10 sellos' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar →' }));
    fireEvent.change(screen.getByLabelText('Nombre de la tarjeta'), { target: { value: 'Club Café' } });

    expect(screen.getByRole('heading', { name: 'Club Café' })).toBeInTheDocument();
    expect(within(preview).getByText('Club Café')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cambios sin guardar');
  });

  it('only offers points when the brand has them enabled', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card());
    renderEditor();

    const points = await screen.findByRole('radio', { name: /Puntos por compra/ });
    expect(points).toBeDisabled();
    expect(screen.getByText(/no están habilitados/)).toBeInTheDocument();
  });

  it('switches to points and proposes equivalent rewards', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card({ points: { enabled: true, pesosPerPoint: 500 } }));
    renderEditor();

    fireEvent.click(await screen.findByRole('radio', { name: /Puntos por compra/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar →' }));

    expect(screen.getByLabelText('puntos de la recompensa 1')).toHaveValue('100');
    expect(screen.getByText(/1 punto cada \$500/)).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /1 sello por día/ })).not.toBeInTheDocument();
  });

  it('shows every problem instead of saving an invalid card', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card());
    const save = vi.spyOn(cardService, 'saveCard');
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la recompensa 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Agrega al menos una recompensa');
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Detalles' }));
    fireEvent.click(screen.getByRole('button', { name: 'Información: Agrega al menos una recompensa' }));
    expect(screen.getByLabelText('Nombre de la tarjeta')).toBeInTheDocument();
  });

  it('links detail errors to their wizard step', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card());
    const save = vi.spyOn(cardService, 'saveCard');
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Detalles' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar sección' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tarjeta' }));
    const link = await screen.findByRole('button', { name: 'Detalles: La sección 1 necesita un título y un texto' });
    fireEvent.click(screen.getByRole('button', { name: 'Diseño' }));
    fireEvent.click(link);
    expect(screen.getByLabelText('Título de la sección 1')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it('saves the whole card and tells how many passes get updated', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card());
    const save = vi.spyOn(cardService, 'saveCard').mockImplementation(async (_brandId, config) => card(config));
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Diseño' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Corazón' }));
    fireEvent.click(screen.getByRole('button', { name: 'Detalles' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar sección' }));
    fireEvent.change(screen.getByLabelText('Título de la sección 1'), { target: { value: 'Condiciones' } });
    fireEvent.change(screen.getByLabelText('Texto de la sección 1'), { target: { value: 'Un premio por visita' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tarjeta' }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    const [, config] = save.mock.calls[0];
    expect(config.design.stampIcon).toBe('HEART');
    expect(config.details.sections).toEqual([{ header: 'Condiciones', body: 'Un premio por visita' }]);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(expect.stringContaining('12 clientes')));
    expect(screen.getByRole('status')).toHaveTextContent('Publicada');
  });

  it('uploads an image and uses the returned URL', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card());
    const upload = vi
      .spyOn(cardService, 'uploadCardImage')
      .mockResolvedValue({ url: 'http://storage.local/card-assets/brand-1/logo-1.png' });
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Diseño' }));
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Elegir imagen: Logotipo cuadrado'), { target: { files: [file] } });

    await waitFor(() => expect(upload).toHaveBeenCalledWith('brand-1', 'logo', file));
    expect(await screen.findByRole('img', { name: 'Logotipo cuadrado' })).toHaveAttribute(
      'src',
      'http://storage.local/card-assets/brand-1/logo-1.png',
    );
  });

  it('rejects images that are not PNG, JPG or WebP before uploading', async () => {
    vi.spyOn(cardService, 'getCard').mockResolvedValue(card());
    const upload = vi.spyOn(cardService, 'uploadCardImage');
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Diseño' }));
    fireEvent.change(screen.getByLabelText('Elegir imagen: Imagen destacada'), {
      target: { files: [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })] },
    });

    expect(await screen.findByText('La imagen debe ser PNG, JPG o WebP')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });
});
