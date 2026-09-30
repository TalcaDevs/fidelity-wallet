import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface UserInfo {
  name: string | null;
  email: string | null;
}

/** Nombres y correos de auth.users, que Prisma no modela. */
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
}
