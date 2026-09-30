import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface UserInfo {
  name: string | null;
  email: string | null;
}

/** Lo que Equipo necesita saber de la cuenta de auth de cada miembro. */
export interface UserAccessInfo {
  email: string | null;
  createdAt: Date;
  lastSignInAt: Date | null;
  emailConfirmedAt: Date | null;
  bannedUntil: Date | null;
}

/** Nombres, correos y datos de acceso de auth.users, que Prisma no modela. */
@Injectable()
export class UserDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(ids: string[]): Promise<Map<string, UserInfo>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      { id: string; email: string | null; name: string | null }[]
    >`
      SELECT id::text AS id, email, raw_user_meta_data ->> 'full_name' AS name
      FROM auth.users
      WHERE id = ANY(${unique}::uuid[])`;

    return new Map(rows.map((r) => [r.id, { name: r.name, email: r.email }]));
  }

  /** Una sola consulta acotada a los ids pedidos: nunca lista usuarios de otras marcas. */
  async lookupAccess(ids: string[]): Promise<Map<string, UserAccessInfo>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        email: string | null;
        created_at: Date;
        last_sign_in_at: Date | null;
        email_confirmed_at: Date | null;
        banned_until: Date | null;
      }[]
    >`
      SELECT id::text AS id, email, created_at, last_sign_in_at, email_confirmed_at, banned_until
      FROM auth.users
      WHERE id = ANY(${unique}::uuid[])`;

    return new Map(
      rows.map((r) => [
        r.id,
        {
          email: r.email,
          createdAt: r.created_at,
          lastSignInAt: r.last_sign_in_at,
          emailConfirmedAt: r.email_confirmed_at,
          bannedUntil: r.banned_until,
        },
      ]),
    );
  }
}
