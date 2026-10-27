import { describe, expect, it, vi } from 'vitest';
import type { CardConfigDto } from '@fidelity/shared';
import {
  getDefaultIncentiveText,
  generateFlyerHtml,
  printCounterFlyer,
  type FlyerRenderOptions,
} from './printKitHelpers';

describe('printKitHelpers', () => {
  describe('getDefaultIncentiveText', () => {
    it('retorna texto por defecto cuando no hay cardConfig', () => {
      expect(getDefaultIncentiveText(null)).toBe('Junta 10 sellos y llévate tu premio gratis');
      expect(getDefaultIncentiveText(undefined)).toBe('Junta 10 sellos y llévate tu premio gratis');
    });

    it('formatea el texto usando la primera recompensa de sellos', () => {
      const config = {
        type: 'STAMPS',
        rewards: [{ name: 'Café de Especialidad Gratis', target: 8, currency: 'STAMPS' }],
      } as unknown as CardConfigDto;

      expect(getDefaultIncentiveText(config)).toBe('Junta 8 sellos y llévate Café de Especialidad Gratis');
    });

    it('formatea el texto usando la primera recompensa de puntos', () => {
      const config = {
        type: 'POINTS',
        rewards: [{ name: 'Descuento $5.000', target: 500, currency: 'POINTS' }],
      } as unknown as CardConfigDto;

      expect(getDefaultIncentiveText(config)).toBe('Junta 500 puntos y llévate Descuento $5.000');
    });

    it('retorna fallback para puntos cuando no hay recompensas cargadas', () => {
      const config = {
        type: 'POINTS',
        rewards: [],
      } as unknown as CardConfigDto;

      expect(getDefaultIncentiveText(config)).toBe('Acumula puntos con cada compra y canjea premios gratis');
    });
  });

  describe('generateFlyerHtml', () => {
    const baseOptions: FlyerRenderOptions = {
      paperSize: 'A5',
      colorMode: 'BRAND',
      brandName: 'Café Gourmet',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#1E3A8A',
      headline: '¡Escanea y guarda tu tarjeta!',
      subheadline: 'En Apple Wallet o Google Wallet',
      incentive: 'Junta 10 sellos y llévate tu café gratis',
      qrDataUrl: 'data:image/png;base64,mockqr',
      locationName: 'Sucursal Providencia',
      commune: 'Providencia',
      joinUrl: 'https://fidelity.cl/join/cafe-provi',
      origin: 'https://fidelity.cl',
    };

    it('genera HTML con tamaño A5 y datos de la marca', () => {
      const html = generateFlyerHtml(baseOptions);
      expect(html).toContain('size: a5 portrait');
      expect(html).toContain('Café Gourmet');
      expect(html).toContain('https://example.com/logo.png');
      expect(html).toContain('¡Escanea y guarda tu tarjeta!');
      expect(html).toContain('En Apple Wallet o Google Wallet');
      expect(html).toContain('Junta 10 sellos y llévate tu café gratis');
      expect(html).toContain('data:image/png;base64,mockqr');
      expect(html).toContain('Sucursal Providencia');
      expect(html).toContain('Providencia');
      expect(html).toContain('https://fidelity.cl/join/cafe-provi');
      expect(html).toContain('apple-wallet-es.svg');
      expect(html).toContain('google-wallet-es.svg');
    });

    it('genera HTML con tamaño Carta cuando se selecciona LETTER', () => {
      const html = generateFlyerHtml({ ...baseOptions, paperSize: 'LETTER' });
      expect(html).toContain('size: letter portrait');
    });

    it('genera HTML con tamaño Oficio cuando se selecciona OFICIO', () => {
      const html = generateFlyerHtml({ ...baseOptions, paperSize: 'OFICIO' });
      expect(html).toContain('size: 216mm 330mm');
    });

    it('aplica paleta de alto contraste en modo MONO', () => {
      const html = generateFlyerHtml({ ...baseOptions, colorMode: 'MONO' });
      expect(html).toContain('#0F172A');
      expect(html).toContain('#F1F5F9');
    });

    it('escapa caracteres especiales para prevenir inyecciones HTML', () => {
      const html = generateFlyerHtml({
        ...baseOptions,
        brandName: '<script>alert("xss")</script>',
        headline: 'Café & "Té" <Delicioso>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;Té&quot;');
    });
  });

  describe('printCounterFlyer', () => {
    it('crea el iframe, inyecta el HTML y ejecuta print', async () => {
      const printSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      // Mock iframe contentWindow
      const originalCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreate(tagName);
        if (tagName === 'iframe') {
          Object.defineProperty(el, 'contentWindow', {
            value: {
              document: {
                open: vi.fn(),
                write: vi.fn(),
                close: vi.fn(),
                images: [],
              },
              focus: vi.fn(),
              print: printSpy,
            },
            writable: true,
          });
        }
        return el;
      });

      const promise = printCounterFlyer({
        paperSize: 'A5',
        colorMode: 'BRAND',
        brandName: 'Test Brand',
        headline: 'Test Headline',
        subheadline: 'Test Subhead',
        incentive: 'Test Benefit',
        qrDataUrl: 'data:image/png;base64,123',
        locationName: 'Local 1',
        joinUrl: 'https://test.cl/join/local1',
      });

      await new Promise((r) => setTimeout(r, 300));
      expect(appendChildSpy).toHaveBeenCalled();
      expect(printSpy).toHaveBeenCalled();

      await promise;
    });
  });
});
