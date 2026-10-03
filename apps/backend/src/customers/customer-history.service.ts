import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CustomerHistoryDto, PurchaseHistoryEntryDto } from '@fidelity/shared';
import { ScanType, type Customer } from '@prisma/client';
import { findStampsProgram, requireActiveBrandOwner } from '../common/access/brand-access.js';
import { recordAudit } from '../common/audit/audit.js';
import { UserDirectoryService } from '../common/users/user-directory.service.js';
import { maskEmail, maskPhone, maskRut } from '../common/utils/mask.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReceiptStorageService } from '../scan/receipt-storage.service.js';
import { resolveOwnerMaxStamps } from '../scan/scan.service.js';
import type { CustomerHistoryQueryDto } from './dto/history.dto.js';

/**
 * Historial de compras de un cliente en una marca: cada sello validado (con monto, nota y foto
 * de la boleta) y cada canje. Solo lo ven el OWNER de la marca y SUPERADMIN.
 */
@Injectable()
export class CustomerHistoryService {
  private readonly logger = new Logger(CustomerHistoryService.name);
  private readonly maxStampsPerLoad: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserDirectoryService,
    private readonly receipts: ReceiptStorageService,
    configService: ConfigService,
  ) {
    this.maxStampsPerLoad = resolveOwnerMaxStamps(
      configService.get<string>('OWNER_MAX_STAMPS_PER_LOAD'),
    );
  }

  async forOwner(
    customerId: string,
    query: CustomerHistoryQueryDto,
    userId: string,
  ): Promise<CustomerHistoryDto> {
    await requireActiveBrandOwner(this.prisma, userId, query.brandId);
    return this.build(customerId, query, false);
  }

  /**
   * El equipo interno ve los identificadores enmascarados (el dato completo exige motivo en
   * /reveal) y cada consulta queda en AuditLog: incluye fotos de boletas del cliente.
   */
  async forPlatform(
    customerId: string,
    query: CustomerHistoryQueryDto,
    actorUserId: string,
  ): Promise<CustomerHistoryDto> {
    const history = await this.build(customerId, query, true);
    await recordAudit(this.prisma, {
      actorUserId,
      actorType: 'PLATFORM',
      action: 'customer.history.view',
      entity: 'Customer',
      entityId: customerId,
      after: { brandId: query.brandId, page: query.page },
    });
    return history;
  }

  private async build(
    customerId: string,
    { brandId, page, pageSize }: CustomerHistoryQueryDto,
    maskIdentifiers: boolean,
  ): Promise<CustomerHistoryDto> {
    const program = await findStampsProgram(this.prisma, brandId);
    const pass = program
      ? await this.prisma.pass.findUnique({
          where: { customerId_programId: { customerId, programId: program.id } },
          include: { customer: true },
        })
      : null;
    if (!pass) {
      throw new NotFoundException('El cliente no tiene una tarjeta en esta marca');
    }

    const now = new Date();
    const [scans, total, visits, redemptions, amount, activeStamps] = await Promise.all([
      this.prisma.scan.findMany({
        where: { passId: pass.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          merchant: { select: { name: true } },
          promotion: { select: { rewardName: true } },
          receipt: { select: { storagePath: true } },
        },
      }),
      this.prisma.scan.count({ where: { passId: pass.id } }),
      this.prisma.scan.count({ where: { passId: pass.id, type: ScanType.STAMP_ADDED } }),
      this.prisma.scan.count({ where: { passId: pass.id, type: ScanType.REWARD_REDEEMED } }),
      this.prisma.scan.aggregate({
        where: { passId: pass.id, type: ScanType.STAMP_ADDED },
        _sum: { purchaseAmount: true },
      }),
      this.prisma.stamp.count({
        where: {
          passId: pass.id,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
    ]);

    const redeemIds = scans.filter((s) => s.type === ScanType.REWARD_REDEEMED).map((s) => s.id);
    const consumed = redeemIds.length
      ? await this.prisma.stamp.groupBy({
          by: ['consumedByScanId'],
          where: { consumedByScanId: { in: redeemIds } },
          _count: { _all: true },
        })
      : [];
    const consumedByScan = new Map(consumed.map((c) => [c.consumedByScanId, c._count._all]));

    const staff = await this.users.lookup(
      scans.flatMap((s) => (s.createdByUserId ? [s.createdByUserId] : [])),
    );
    const receiptUrls = await this.signReceipts(
      scans.flatMap((s) => (s.receipt ? [s.receipt.storagePath] : [])),
    );

    const items: PurchaseHistoryEntryDto[] = scans.map((s) => ({
      id: s.id,
      type: s.type,
      createdAt: s.createdAt.toISOString(),
      method: s.method,
      locationName: s.merchant.name,
      staffEmail: s.createdByUserId ? (staff.get(s.createdByUserId)?.email ?? null) : null,
      stamps: s.type === ScanType.STAMP_ADDED ? s.stampCount : (consumedByScan.get(s.id) ?? 0),
      purchaseAmount: s.purchaseAmount,
      note: s.note,
      rewardName: s.promotion?.rewardName ?? null,
      receiptUrl: s.receipt ? (receiptUrls.get(s.receipt.storagePath) ?? null) : null,
    }));

    return {
      customer: this.profile(pass, activeStamps, maskIdentifiers),
      totals: {
        visits,
        redemptions,
        purchaseAmount: amount._sum.purchaseAmount ?? 0,
      },
      history: { items, page, pageSize, total },
      maxStampsPerLoad: this.maxStampsPerLoad,
    };
  }

  private profile(
    { customer, createdAt, merchantId }: { customer: Customer; createdAt: Date; merchantId: string },
    activeStamps: number,
    maskIdentifiers: boolean,
  ): CustomerHistoryDto['customer'] {
    const mask = <T extends string | null>(value: T, masker: (v: string) => string) =>
      value && maskIdentifiers ? masker(value) : value;
    return {
      id: customer.id,
      name: customer.name,
      email: mask(customer.email, maskEmail),
      phone: mask(customer.phone, maskPhone),
      rut: mask(customer.rut, maskRut),
      birthDay: customer.birthDay,
      birthMonth: customer.birthMonth,
      birthYear: customer.birthYear,
      joinedAt: createdAt.toISOString(),
      activeStamps,
      homeLocationId: merchantId,
    };
  }

  /** Sin Storage disponible el historial se muestra igual, solo que sin las fotos. */
  private async signReceipts(paths: string[]): Promise<Map<string, string>> {
    try {
      return await this.receipts.signedUrls(paths);
    } catch (err) {
      this.logger.warn(`No se pudieron firmar las fotos de boletas: ${String(err)}`);
      return new Map();
    }
  }
}
