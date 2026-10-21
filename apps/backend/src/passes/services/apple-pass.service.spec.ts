import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ApplePassService } from './apple-pass.service';
import type { PassData } from '../interfaces/pass-data.interface';
import { DEFAULT_CARD_DESIGN, DEFAULT_CARD_DETAILS, DEFAULT_REGISTRATION } from '@fidelity/shared';

describe('ApplePassService', () => {
  let service: ApplePassService;
  let configService: ConfigService;

  const mockConfig: Record<string, string> = {
    APPLE_PASS_TYPE_IDENTIFIER: 'pass.com.talcadevs.fidelity',
    APPLE_TEAM_IDENTIFIER: 'TALCADEVS1',
    BACKEND_URL: 'https://api.fidelity.test',
  };

  const createPassData = (
    overrides: Partial<PassData> = {},
    cardOverrides: Record<string, unknown> = {},
  ): PassData => ({
    passId: 'p0000000-0000-0000-0000-000000000001',
    serialNumber: 'TALCA-001',
    passToken: 'token-xyz',
    programId: 'prog-001',
    merchantName: 'Café Test',
    customerLabel: 'Cliente Frecuente',
    stampsEnabled: true,
    pointsEnabled: false,
    activeStamps: 4,
    activePoints: 0,
    targetStamps: 5,
    rewardCurrency: 'STAMPS',
    rewardName: 'Café Gratis',
    nextExpiryAt: null,
    memberSince: new Date('2026-01-01T12:00:00Z'),
    cardExpiresAt: null,
    cardClass: {
      programId: 'prog-001',
      brandName: 'Café Test',
      locations: [],
      card: {
        id: 'card-001',
        brandId: 'brand-001',
        name: 'Tarjeta Café',
        type: 'STAMPS',
        stampsEnabled: true,
        pointsEnabled: false,
        stampValidityDays: null,
        targetStamps: 5,
        targetPoints: 0,
        rewardCurrency: 'STAMPS',
        rewardName: 'Café Gratis',
        dailyStampLimit: true,
        allowMultipleRedemptionsPerVisit: false,
        design: { ...DEFAULT_CARD_DESIGN, backgroundColor: '#000000', textColor: '#ffffff', labelColor: '#cccccc' },
        details: { ...DEFAULT_CARD_DETAILS, sections: [], links: [] },
        registration: DEFAULT_REGISTRATION,
        ...cardOverrides,
      } as any,
    },
    ...overrides,
  });

  beforeEach(() => {
    configService = {
      get: vi.fn((key: string) => mockConfig[key]),
    } as unknown as ConfigService;
    service = new ApplePassService(configService);
  });

  describe('buildPassJson', () => {
    it('sets "Tus sellos no vencen." when nextExpiryAt is null and stampValidityDays is null', () => {
      const data = createPassData({ nextExpiryAt: null }, { stampValidityDays: null });
      const pass = service.buildPassJson(data) as any;

      const expiryField = pass.storeCard.backFields.find((f: any) => f.key === 'expiryInfo');
      expect(expiryField).toBeDefined();
      expect(expiryField.value).toBe('Tus sellos no vencen.');
    });

    it('sets "Vencen a los X días de obtenerlos." when nextExpiryAt is null but stampValidityDays is configured', () => {
      const data = createPassData({ nextExpiryAt: null }, { stampValidityDays: 30 });
      const pass = service.buildPassJson(data) as any;

      const expiryField = pass.storeCard.backFields.find((f: any) => f.key === 'expiryInfo');
      expect(expiryField).toBeDefined();
      expect(expiryField.value).toBe('Vencen a los 30 días de obtenerlos.');
    });

    it('sets "Vencen a 1 día de obtenerlos." when stampValidityDays is 1', () => {
      const data = createPassData({ nextExpiryAt: null }, { stampValidityDays: 1 });
      const pass = service.buildPassJson(data) as any;

      const expiryField = pass.storeCard.backFields.find((f: any) => f.key === 'expiryInfo');
      expect(expiryField).toBeDefined();
      expect(expiryField.value).toBe('Vencen a 1 día de obtenerlos.');
    });

    it('sets specific date when nextExpiryAt is present', () => {
      const expiryDate = new Date('2026-12-31T15:00:00Z');
      const data = createPassData({ nextExpiryAt: expiryDate }, { stampValidityDays: 30 });
      const pass = service.buildPassJson(data) as any;

      const expiryField = pass.storeCard.backFields.find((f: any) => f.key === 'expiryInfo');
      expect(expiryField).toBeDefined();
      expect(expiryField.value).toContain('Próximo vencimiento:');
      expect(expiryField.value).toContain('31');
    });

    it('sets "Tus sellos y puntos no vencen." when both enabled and stampValidityDays is null', () => {
      const data = createPassData(
        { nextExpiryAt: null, stampsEnabled: true, pointsEnabled: true },
        { stampsEnabled: true, pointsEnabled: true, stampValidityDays: null },
      );
      const pass = service.buildPassJson(data) as any;

      const expiryField = pass.storeCard.backFields.find((f: any) => f.key === 'expiryInfo');
      expect(expiryField).toBeDefined();
      expect(expiryField.value).toBe('Tus sellos y puntos no vencen.');
    });
  });
});
