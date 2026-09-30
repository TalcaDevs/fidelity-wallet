import { UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { ReportsController } from './reports.controller.js';
import type { ReportsService } from './reports.service.js';
import type { ReportPeriodQueryDto, RetentionReportQueryDto } from './dto/reports-query.dto.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: Partial<ReportsService>;

  const merchantId = 'a0000000-0000-0000-0000-000000000001';
  const mockUser = {
    id: 'user-owner-123',
    email: 'owner@example.com',
    role: 'authenticated',
  };

  beforeEach(() => {
    reportsService = {
      getOverview: vi.fn(),
      getRetention: vi.fn(),
      getPromotions: vi.fn(),
      getStaffActivity: vi.fn(),
    };

    controller = new ReportsController(reportsService as ReportsService);
  });

  describe('Guards Metadata & Route Protection', () => {
    it('applies SupabaseAuthGuard to ReportsController class', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, ReportsController);
      expect(guards).toBeDefined();
      expect(guards).toContain(SupabaseAuthGuard);
    });
  });

  describe('getOverview', () => {
    const query: ReportPeriodQueryDto = { tz: 'America/Santiago' };

    it('throws UnauthorizedException if user is not provided', async () => {
      await expect(controller.getOverview(merchantId, query, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(reportsService.getOverview).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException if user has no id', async () => {
      await expect(controller.getOverview(merchantId, query, {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(reportsService.getOverview).not.toHaveBeenCalled();
    });

    it('delegates to reportsService.getOverview with merchantId, query, and userId', async () => {
      const mockResult = { kpis: {} } as any;
      (reportsService.getOverview as any).mockResolvedValue(mockResult);

      const result = await controller.getOverview(merchantId, query, mockUser);

      expect(reportsService.getOverview).toHaveBeenCalledWith(merchantId, query, mockUser.id);
      expect(result).toBe(mockResult);
    });
  });

  describe('getRetention', () => {
    const query: RetentionReportQueryDto = { dormantDays: 30 };

    it('throws UnauthorizedException if user is missing', async () => {
      await expect(controller.getRetention(merchantId, query, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('delegates to reportsService.getRetention', async () => {
      const mockResult = { dormantCustomers: [] } as any;
      (reportsService.getRetention as any).mockResolvedValue(mockResult);

      const result = await controller.getRetention(merchantId, query, mockUser);

      expect(reportsService.getRetention).toHaveBeenCalledWith(merchantId, query, mockUser.id);
      expect(result).toBe(mockResult);
    });
  });

  describe('getPromotions', () => {
    const query: ReportPeriodQueryDto = {};

    it('throws UnauthorizedException if user is missing', async () => {
      await expect(controller.getPromotions(merchantId, query, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('delegates to reportsService.getPromotions', async () => {
      const mockResult = { promotions: [] } as any;
      (reportsService.getPromotions as any).mockResolvedValue(mockResult);

      const result = await controller.getPromotions(merchantId, query, mockUser);

      expect(reportsService.getPromotions).toHaveBeenCalledWith(merchantId, query, mockUser.id);
      expect(result).toBe(mockResult);
    });
  });

  describe('getStaffActivity', () => {
    const query: ReportPeriodQueryDto = {};

    it('throws UnauthorizedException if user is missing', async () => {
      await expect(controller.getStaffActivity(merchantId, query, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('delegates to reportsService.getStaffActivity', async () => {
      const mockResult = { staff: [], alerts: [] } as any;
      (reportsService.getStaffActivity as any).mockResolvedValue(mockResult);

      const result = await controller.getStaffActivity(merchantId, query, mockUser);

      expect(reportsService.getStaffActivity).toHaveBeenCalledWith(merchantId, query, mockUser.id);
      expect(result).toBe(mockResult);
    });
  });
});
