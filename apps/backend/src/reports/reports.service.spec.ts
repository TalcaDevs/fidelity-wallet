import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportsService } from './reports.service.js';
import { ReportsOverviewService } from './services/reports-overview.service.js';
import { RetentionAnalyticsService } from './services/retention-analytics.service.js';
import { PromotionsAnalyticsService } from './services/promotions-analytics.service.js';
import { StaffAuditService } from './services/staff-audit.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;

  const brandId = 'b0000000-0000-0000-0000-000000000001';
  const merchantId = 'a0000000-0000-0000-0000-000000000001';
  const ownerId = 'owner-uuid-1';
  const staffUserId = 'staff-uuid-2';

  const mockMerchant = {
    id: merchantId,
    brandId,
    name: 'Café Del Sol',
    slug: 'cafe-del-sol',
  };

  const mockBrand = {
    id: brandId,
    name: 'Café Del Sol Marca',
  };

  beforeEach(() => {
    prisma = {
      brandMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      merchant: {
        findUnique: vi.fn(),
      },
      brand: {
        findUnique: vi.fn(),
      },
      pass: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      stamp: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      scan: {
        findMany: vi.fn(),
      },
      promotion: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    const overviewService = new ReportsOverviewService(prisma);
    const retentionService = new RetentionAnalyticsService(prisma);
    const promotionsService = new PromotionsAnalyticsService(prisma);
    const staffService = new StaffAuditService(prisma);
    service = new ReportsService(
      prisma,
      overviewService,
      retentionService,
      promotionsService,
      staffService,
    );
  });

  describe('assertOwner', () => {
    it('throws UnauthorizedException if callerUserId is empty', async () => {
      await expect(service.assertOwner(merchantId, '')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws NotFoundException if neither merchant nor brand exists', async () => {
      (prisma.merchant.findUnique as any).mockResolvedValue(null);
      (prisma.brand.findUnique as any).mockResolvedValue(null);

      await expect(service.assertOwner(merchantId, ownerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if brandMember record not found', async () => {
      (prisma.merchant.findUnique as any).mockResolvedValue(mockMerchant);
      (prisma.brandMember.findUnique as any).mockResolvedValue(null);

      await expect(service.assertOwner(merchantId, ownerId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException if brandMember role is STAFF (not OWNER)', async () => {
      (prisma.merchant.findUnique as any).mockResolvedValue(mockMerchant);
      (prisma.brandMember.findUnique as any).mockResolvedValue({
        userId: ownerId,
        brandId,
        role: 'STAFF',
      });

      await expect(service.assertOwner(merchantId, ownerId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('resolves cleanly with merchant and brand scope when caller is OWNER of location', async () => {
      (prisma.merchant.findUnique as any).mockResolvedValue(mockMerchant);
      (prisma.brandMember.findUnique as any).mockResolvedValue({
        userId: ownerId,
        brandId,
        role: 'OWNER',
      });

      const scope = await service.assertOwner(merchantId, ownerId);
      expect(scope).toEqual({ brandId, merchantId });
    });

    it('resolves cleanly with brand scope when caller is OWNER of brand directly', async () => {
      (prisma.merchant.findUnique as any).mockResolvedValue(null);
      (prisma.brand.findUnique as any).mockResolvedValue(mockBrand);
      (prisma.brandMember.findUnique as any).mockResolvedValue({
        userId: ownerId,
        brandId,
        role: 'OWNER',
      });

      const scope = await service.assertOwner(brandId, ownerId);
      expect(scope).toEqual({ brandId, merchantId: null });
    });
  });

  describe('resolveDateRange', () => {
    it('throws BadRequestException on invalid timezone', () => {
      expect(() =>
        service.resolveDateRange({ tz: 'Invalid/Timezone_Name_XYZ' }),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException on invalid date strings', () => {
      expect(() =>
        service.resolveDateRange({ from: 'not-a-date' }),
      ).toThrow(BadRequestException);
      expect(() =>
        service.resolveDateRange({ to: 'invalid-date' }),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException if from > to', () => {
      expect(() =>
        service.resolveDateRange({
          from: '2026-09-30T00:00:00Z',
          to: '2026-09-01T00:00:00Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException if range exceeds 366 days', () => {
      expect(() =>
        service.resolveDateRange({
          from: '2024-01-01T00:00:00Z',
          to: '2026-01-01T00:00:00Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('defaults to 30 days and America/Santiago if no dates provided', () => {
      const range = service.resolveDateRange({});
      expect(range.timeZone).toBe('America/Santiago');
      expect(range.to.getTime()).toBeGreaterThan(range.from.getTime());
      const diffDays = Math.round((range.to.getTime() - range.from.getTime()) / (24 * 3600 * 1000));
      expect(diffDays).toBe(30);
    });
  });

  describe('getOverview', () => {
    beforeEach(() => {
      (prisma.merchant.findUnique as any).mockResolvedValue(mockMerchant);
      (prisma.brandMember.findUnique as any).mockResolvedValue({
        userId: ownerId,
        brandId,
        role: 'OWNER',
      });
    });

    it('calculates KPIs, time series, and QR/Manual method distribution', async () => {
      (prisma.pass.count as any)
        .mockResolvedValueOnce(15) // current new customers
        .mockResolvedValueOnce(10); // previous new customers

      (prisma.stamp.count as any)
        .mockResolvedValueOnce(2) // curr expired stamps
        .mockResolvedValueOnce(1); // prev expired stamps

      const mockCurrentScans = [
        {
          id: 'scan-1',
          type: 'STAMP_ADDED',
          method: 'QR',
          createdAt: new Date('2026-09-10T15:00:00Z'),
          pass: { customerId: 'cust-1' },
        },
        {
          id: 'scan-2',
          type: 'REWARD_REDEEMED',
          method: 'MANUAL',
          createdAt: new Date('2026-09-10T16:00:00Z'),
          pass: { customerId: 'cust-1' },
        },
        {
          id: 'scan-3',
          type: 'STAMP_ADDED',
          method: 'QR',
          createdAt: new Date('2026-09-11T12:00:00Z'),
          pass: { customerId: 'cust-2' },
        },
      ];

      const mockPrevScans = [
        {
          id: 'scan-prev-1',
          type: 'REWARD_REDEEMED',
          method: 'QR',
          createdAt: new Date('2026-08-10T15:00:00Z'),
          pass: { customerId: 'cust-1' },
        },
      ];

      (prisma.scan.findMany as any)
        .mockResolvedValueOnce(mockCurrentScans)
        .mockResolvedValueOnce(mockPrevScans);

      const overview = await service.getOverview(
        merchantId,
        {
          from: '2026-09-01T00:00:00Z',
          to: '2026-09-20T00:00:00Z',
          tz: 'America/Santiago',
        },
        ownerId,
      );

      expect(overview).toBeDefined();
      expect(overview.kpis.newCustomers.current).toBe(15);
      expect(overview.kpis.newCustomers.previous).toBe(10);
      expect(overview.kpis.newCustomers.changePercentage).toBe(50);

      expect(overview.kpis.stampsDelivered.current).toBe(2);
      expect(overview.kpis.stampsDelivered.previous).toBe(0);

      expect(overview.kpis.rewardsRedeemed.current).toBe(1);
      expect(overview.kpis.rewardsRedeemed.previous).toBe(1);
      expect(overview.kpis.rewardsRedeemed.changePercentage).toBe(0);

      // Method distribution: 2 QR and 1 MANUAL
      expect(overview.methodDistribution.qrCount).toBe(2);
      expect(overview.methodDistribution.manualCount).toBe(1);
      expect(overview.methodDistribution.qrPercentage).toBe(66.7);
      expect(overview.methodDistribution.manualPercentage).toBe(33.3);
    });
  });

  describe('getRetention', () => {
    beforeEach(() => {
      (prisma.merchant.findUnique as any).mockResolvedValue(mockMerchant);
      (prisma.brandMember.findUnique as any).mockResolvedValue({
        userId: ownerId,
        brandId,
        role: 'OWNER',
      });
    });

    it('calculates retention, visit frequency distribution and dormant customers with masked PII', async () => {
      const now = new Date();
      const past40Days = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const mockPasses = [
        {
          id: 'pass-dormant',
          customerId: 'cust-dormant',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          customer: {
            rut: '12.345.678-5',
            phone: '+56912345678',
          },
          scans: [
            {
              createdAt: past40Days,
            },
          ],
        },
      ];

      (prisma.scan.findMany as any).mockResolvedValue([
        {
          createdAt: past40Days,
          pass: { customerId: 'cust-dormant', createdAt: new Date('2026-01-01T00:00:00Z') },
        },
      ]);
      (prisma.pass.findMany as any).mockResolvedValue(mockPasses);

      const retention = await service.getRetention(
        merchantId,
        { dormantDays: 30, tz: 'America/Santiago' },
        ownerId,
      );

      expect(retention.dormantCustomers.count).toBe(1);
      expect(retention.dormantCustomers.customers.length).toBe(1);
      const dormant = retention.dormantCustomers.customers[0];
      expect(dormant.customerId).toBe('cust-dormant');
      expect(dormant.daysInactive).toBeGreaterThanOrEqual(39);
      // Ensure PII masking is applied
      expect(dormant.maskedIdentifier).toContain('***');
    });
  });

  describe('getPromotions', () => {
    beforeEach(() => {
      (prisma.merchant.findUnique as any).mockResolvedValue(mockMerchant);
      (prisma.brandMember.findUnique as any).mockResolvedValue({
        userId: ownerId,
        brandId,
        role: 'OWNER',
      });
    });

    it('returns metrics per promotion with redemptions and breakage', async () => {
      const mockPromotions = [
        {
          id: 'promo-1',
          name: 'Café de cortesía',
          rewardName: 'Café Americano',
          targetStamps: 5,
          isActive: true,
        },
      ];
      (prisma.promotion.findMany as any).mockResolvedValue(mockPromotions);

      const mockRedeems = [
        {
          id: 'redeem-1',
          promotionId: 'promo-1',
          createdAt: new Date('2026-09-15T12:00:00Z'),
          pass: {
            stamps: [
              { earnedAt: new Date('2026-09-05T12:00:00Z') }, // 10 days to redeem
            ],
          },
        },
      ];
      (prisma.scan.findMany as any).mockResolvedValue(mockRedeems);
      (prisma.stamp.findMany as any).mockResolvedValue([
        { promotionId: 'promo-1' },
        { promotionId: 'promo-1' },
        { promotionId: 'promo-1' },
      ]);

      const result = await service.getPromotions(
        merchantId,
        { tz: 'America/Santiago' },
        ownerId,
      );

      expect(result.promotions.length).toBe(1);
      const promo = result.promotions[0];
      expect(promo.id).toBe('promo-1');
      expect(promo.redeemedCount).toBe(1);
      expect(promo.averageDaysToRedeem).toBe(10);
      expect(promo.breakageCount).toBe(3);
    });
  });

  describe('getStaffActivity and Antifraud Alerts', () => {
    beforeEach(() => {
      (prisma.merchant.findUnique as any).mockResolvedValue(mockMerchant);
      (prisma.brandMember.findUnique as any).mockResolvedValue({
        userId: ownerId,
        brandId,
        role: 'OWNER',
      });
    });

    it('detects antifraud alerts for abnormal manual scans and multiple stamps to same customer', async () => {
      (prisma.brandMember.findMany as any).mockResolvedValue([
        {
          userId: staffUserId,
          role: 'STAFF',
        },
      ]);

      const today = new Date();
      // Generate 22 scans with method MANUAL to the same customer on the same day
      const mockScans = Array.from({ length: 22 }, (_, i) => ({
        id: `scan-${i}`,
        type: i === 21 ? 'REWARD_REDEEMED' : 'STAMP_ADDED',
        method: 'MANUAL',
        passId: 'pass-target',
        createdByUserId: staffUserId,
        createdAt: new Date(today.getTime() + i * 1000),
      }));

      (prisma.scan.findMany as any).mockResolvedValue(mockScans);

      const result = await service.getStaffActivity(
        merchantId,
        { tz: 'America/Santiago' },
        ownerId,
      );

      expect(result.staff.length).toBe(1);
      const staffMember = result.staff[0];
      expect(staffMember.userId).toBe(staffUserId);
      expect(staffMember.role).toBe('STAFF');
      expect(staffMember.stampsCount).toBe(21);
      expect(staffMember.redeemsCount).toBe(1);
      expect(staffMember.manualPercentage).toBe(100);

      // Antifraud heuristics:
      // 1. >=4 stamps to same pass in 7 days
      // 2. >50% manual ratio with >=20 ops
      // 3. Stamp & redeem on same day
      expect(staffMember.alerts.length).toBe(3);
      const types = staffMember.alerts.map((a) => a.type);
      expect(types).toContain('EXCESSIVE_STAMPS_SAME_CUSTOMER');
      expect(types).toContain('HIGH_MANUAL_RATIO');
      expect(types).toContain('STAMP_AND_REDEEM_SAME_DAY');
    });
  });
});
