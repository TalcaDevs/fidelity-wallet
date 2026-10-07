import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  InternalBrandDetailDto,
  InternalBrandSummaryDto,
  Paginated,
} from '@fidelity/shared';
import { MerchantRole, Prisma, TicketStatus } from '@prisma/client';
import { toSubscription, BillingService } from '../billing/billing.service.js';
import { diffFields, recordAudit } from '../common/audit/audit.js';
import { UserDirectoryService } from '../common/users/user-directory.service.js';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { assertPointsCanBeDisabled } from '../merchants/brand-settings.js';
import { toLocationDto } from '../locations/location-mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListBrandsQueryDto, UpdateBrandDto } from './dto/internal.dto.js';

const OPEN_TICKET_STATUSES = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_ON_MERCHANT,
];

const brandSummarySelect = {
  id: true,
  name: true,
  status: true,
  planId: true,
  trialEndsAt: true,
  createdAt: true,
  _count: {
    select: {
      locations: true,
      passes: true,
      tickets: { where: { status: { in: OPEN_TICKET_STATUSES } } },
    },
  },
} satisfies Prisma.BrandSelect;

type BrandSummaryRow = Prisma.BrandGetPayload<{
  select: typeof brandSummarySelect;
}>;

/** Marcas y locales de todos los clientes para /internal (HANDOFF §11.5). */
@Injectable()
export class InternalBrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserDirectoryService,
    private readonly billing: BillingService,
  ) {}

  async list(
    query: ListBrandsQueryDto,
  ): Promise<Paginated<InternalBrandSummaryDto>> {
    const q = query.q?.trim();
    const where: Prisma.BrandWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { locations: { some: { slug: { contains: q.toLowerCase() } } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        select: brandSummarySelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      items: await this.summaries(rows),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(brandId: string): Promise<InternalBrandDetailDto> {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        ...brandSummarySelect,
        legalName: true,
        taxId: true,
        contactEmail: true,
        contactPhone: true,
        pointsEnabled: true,
        pesosPerPoint: true,
        locations: { orderBy: { createdAt: 'asc' } },
        programs: {
          orderBy: { createdAt: 'asc' },
          include: { promotions: { orderBy: { createdAt: 'desc' } } },
        },
        members: {
          include: { merchant: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!brand) throw new NotFoundException('La marca no existe');

    const [[summary], usage, access, scans] = await Promise.all([
      this.summaries([brand]),
      this.billing.getUsage(brandId),
      this.users.lookupAccess(brand.members.map((m) => m.userId)),
      this.prisma.scan.findMany({
        where: { brandId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          method: true,
          createdAt: true,
          merchant: { select: { name: true } },
          pass: {
            select: { customer: { select: { rut: true, phone: true } } },
          },
        },
      }),
    ]);

    return {
      ...summary,
      legalName: brand.legalName,
      taxId: brand.taxId,
      contactEmail: brand.contactEmail,
      contactPhone: brand.contactPhone,
      subscription: toSubscription(brand, usage, new Date()),
      pointsEnabled: brand.pointsEnabled,
      pesosPerPoint: brand.pesosPerPoint,
      locationsList: brand.locations.map(toLocationDto),
      programs: brand.programs.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        stampValidityDays: p.stampValidityDays,
        isActive: p.isActive,
        promotions: p.promotions.map((pr) => ({
          id: pr.id,
          name: pr.name,
          targetStamps: pr.targetStamps,
          rewardName: pr.rewardName,
          isActive: pr.isActive,
        })),
      })),
      members: brand.members.map((m) => ({
        userId: m.userId,
        email: access.get(m.userId)?.email ?? null,
        role: m.role,
        locationId: m.merchantId,
        locationName: m.merchant?.name ?? null,
        lastSignInAt: access.get(m.userId)?.lastSignInAt?.toISOString() ?? null,
      })),
      recentActivity: scans.map((s) => ({
        id: s.id,
        type: s.type,
        method: s.method,
        locationName: s.merchant.name,
        customer: maskedCustomer(s.pass.customer),
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async update(
    brandId: string,
    actorUserId: string,
    dto: UpdateBrandDto,
  ): Promise<InternalBrandDetailDto> {
    const current = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });
    if (!current) throw new NotFoundException('La marca no existe');

    const { reason, trialEndsAt, ...fields } = dto;
    const changes = {
      ...fields,
      ...(trialEndsAt ? { trialEndsAt: new Date(trialEndsAt) } : {}),
    };
    const diff = diffFields(current, changes);
    if (!diff) return this.get(brandId);

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${brandId}::uuid FOR UPDATE`;
      if (dto.pointsEnabled === false) await assertPointsCanBeDisabled(tx, brandId);
      await tx.brand.update({ where: { id: brandId }, data: changes });
      await recordAudit(tx, {
        actorUserId,
        actorType: 'PLATFORM',
        action:
          'status' in diff.after && fields.status
            ? `brand.${fields.status.toLowerCase()}`
            : 'brand.update',
        entity: 'Brand',
        entityId: brandId,
        before: diff.before as Prisma.InputJsonObject,
        after: diff.after as Prisma.InputJsonObject,
        reason,
      });
    });
    return this.get(brandId);
  }

  private async summaries(
    rows: BrandSummaryRow[],
  ): Promise<InternalBrandSummaryDto[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const [owners, lastScans] = await Promise.all([
      this.prisma.brandMember.findMany({
        where: { brandId: { in: ids }, role: MerchantRole.OWNER },
        orderBy: { createdAt: 'asc' },
        select: { brandId: true, userId: true },
      }),
      this.prisma.scan.groupBy({
        by: ['brandId'],
        where: { brandId: { in: ids } },
        _max: { createdAt: true },
      }),
    ]);
    const emails = await this.users.lookup(owners.map((o) => o.userId));
    const ownerOf = new Map<string, string>();
    for (const o of owners)
      if (!ownerOf.has(o.brandId)) ownerOf.set(o.brandId, o.userId);
    const lastScanOf = new Map(
      lastScans.map((s) => [s.brandId, s._max.createdAt]),
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      planId: r.planId,
      trialEndsAt: r.trialEndsAt.toISOString(),
      ownerEmail: emails.get(ownerOf.get(r.id) ?? '')?.email ?? null,
      locations: r._count.locations,
      customers: r._count.passes,
      openTickets: r._count.tickets,
      lastScanAt: lastScanOf.get(r.id)?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

export function maskedCustomer(
  customer: { rut: string | null; phone: string | null } | null,
): string {
  if (customer?.rut) return maskRut(customer.rut);
  if (customer?.phone) return maskPhone(customer.phone);
  return 'Cliente';
}
