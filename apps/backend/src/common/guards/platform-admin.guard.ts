import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PlatformRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

export interface PlatformAdminUser extends AuthenticatedUser {
  platformRole: PlatformRole;
}

const PLATFORM_ROLES_KEY = 'platformRoles';

/** Roles de PlatformAdmin que admite el controller o el handler. */
export const PlatformRoles = (...roles: PlatformRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, roles);

/**
 * Va después de SupabaseAuthGuard. Valida contra la tabla PlatformAdmin en cada request:
 * nunca contra metadata del usuario ni contra el JWT (HANDOFF §7.10). Sin @PlatformRoles
 * deniega: un rol nuevo no obtiene acceso a nada hasta que se lo den explícitamente.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

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

    const allowed =
      this.reflector.getAllAndOverride<PlatformRole[] | undefined>(
        PLATFORM_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    if (!allowed.includes(admin.role)) {
      throw new ForbiddenException(
        'Tu rol del equipo interno no tiene acceso a esta sección',
      );
    }

    request.user.platformRole = admin.role;
    return true;
  }
}
