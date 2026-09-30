import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { PlatformRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

export interface PlatformAdminUser extends AuthenticatedUser {
  platformRole: PlatformRole;
}

/**
 * Va después de SupabaseAuthGuard. Valida contra la tabla PlatformAdmin en cada request:
 * nunca contra metadata del usuario ni contra el JWT (HANDOFF §7.10).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{
        user?: AuthenticatedUser & { platformRole?: PlatformRole };
      }>();
    const userId = request.user?.id;
    const admin = userId
      ? await this.prisma.platformAdmin.findUnique({ where: { userId } })
      : null;
    if (!admin || !request.user) {
      throw new ForbiddenException('Acceso restringido al equipo interno');
    }
    request.user.platformRole = admin.role;
    return true;
  }
}
