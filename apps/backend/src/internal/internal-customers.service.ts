import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AuditLogEntryDto,
  InternalCustomerDto,
  Paginated,
  RevealedCustomerDto,
} from '@fidelity/shared';
import type { Prisma } from '@prisma/client';
import { recordAudit } from '../common/audit/audit.js';
import { UserDirectoryService } from '../common/users/user-directory.service.js';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ListAuditQueryDto,
  SearchCustomersQueryDto,
} from './dto/internal.dto.js';

/**
 * Clientes finales para soporte (HANDOFF §11.5, Ley 19.628): siempre enmascarados, sin búsqueda
 * parcial por RUT o teléfono, y ver el dato completo exige motivo y queda en AuditLog.
 */
@Injectable()
export class InternalCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserDirectoryService,
  ) {}

  async search(
    query: SearchCustomersQueryDto,
  ): Promise<Paginated<InternalCustomerDto>> {
    if (!query.q && !query.brandId) {
      throw new BadRequestException(
        'Busca por RUT o teléfono, o filtra por marca',
      );
    }

    const where: Prisma.CustomerWhereInput = {
      ...(query.q ? identifierFilter(query.q) : {}),
      ...(query.brandId
        ? { passes: { some: { brandId: query.brandId } } }
        : {}),
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { passes: { include: { brand: { select: { name: true } } } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const balances = await this.activeStamps(
      customers.flatMap((c) => c.passes.map((p) => p.id)),
    );
    const items = customers.map((c) => ({
      id: c.id,
      rut: c.rut ? maskRut(c.rut) : null,
      phone: c.phone ? maskPhone(c.phone) : null,
      createdAt: c.createdAt.toISOString(),
      cards: c.passes.map((p) => ({
        brandId: p.brandId,
        brandName: p.brand.name,
        activeStamps: balances.get(p.id) ?? 0,
        joinedAt: p.createdAt.toISOString(),
      })),
    }));

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async reveal(
    customerId: string,
    actorUserId: string,
    reason: string,
  ): Promise<RevealedCustomerDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, rut: true, phone: true },
    });
    if (!customer) throw new NotFoundException('El cliente no existe');

    await recordAudit(this.prisma, {
      actorUserId,
      actorType: 'PLATFORM',
      action: 'customer.reveal',
      entity: 'Customer',
      entityId: customerId,
      reason,
    });
    return customer;
  }

  async audit(query: ListAuditQueryDto): Promise<Paginated<AuditLogEntryDto>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const actors = await this.users.lookup(rows.map((r) => r.actorUserId));

    return {
      items: rows.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        actorEmail: actors.get(r.actorUserId)?.email ?? null,
        actorType: r.actorType,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        before: r.before,
        after: r.after,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  private async activeStamps(passIds: string[]): Promise<Map<string, number>> {
    if (passIds.length === 0) return new Map();
    const now = new Date();
    const rows = await this.prisma.stamp.groupBy({
      by: ['passId'],
      where: {
        passId: { in: passIds },
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.passId, r._count._all]));
  }
}

/** Coincidencia exacta con el RUT o el teléfono normalizados. */
export function identifierFilter(raw: string): Prisma.CustomerWhereInput {
  const q = raw.trim();
  if (validateRut(q)) return { rut: cleanRut(q) };
  const phone = normalizePhone(q);
  if (phone) return { phone };
  throw new BadRequestException(
    'Ingresa un RUT válido o un celular chileno completo',
  );
}
