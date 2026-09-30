import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PlatformRole } from '@fidelity/shared';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * El frontend pregunta, para cualquier sesión, si es del equipo interno: con /internal/me un
 * dueño recibiría un 403 en cada carga. No da acceso a nada; solo decide a dónde redirigir.
 */
@ApiTags('Internal')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('me')
export class AccessController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('access')
  @ApiOperation({ summary: 'Rol del equipo interno de la sesión, o null' })
  async access(@CurrentUser() user: AuthenticatedUser): Promise<{ platformRole: PlatformRole | null }> {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { userId: user.id }, select: { role: true } });
    return { platformRole: admin?.role ?? null };
  }
}
