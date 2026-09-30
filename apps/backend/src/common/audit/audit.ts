import type { AuditActorType, Prisma } from '@prisma/client';
import type { Db } from '../access/brand-access.js';

export interface AuditEntry {
  actorUserId: string;
  actorType: AuditActorType;
  action: string;
  entity: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string;
}

/** AuditLog es append-only: toda edición interna y toda vista de un dato personal completo. */
export function recordAudit(db: Db, entry: AuditEntry) {
  return db.auditLog.create({ data: entry });
}

/** Solo los campos que cambian, con su valor antes y después (fechas como ISO). */
export function diffFields<T extends object>(
  current: T,
  changes: Partial<T>,
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const asJson = (v: unknown) =>
    v instanceof Date ? v.toISOString() : (v ?? null);

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    const previous = (current as Record<string, unknown>)[key];
    if (asJson(previous) === asJson(value)) continue;
    before[key] = asJson(previous);
    after[key] = asJson(value);
  }
  return Object.keys(after).length > 0 ? { before, after } : null;
}
