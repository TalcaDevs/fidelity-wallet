import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InviteStaffDto, StaffResponseDto } from './dto/invite-staff.dto.js';

@Injectable()
export class StaffService {
  private supabaseAdmin: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  public getSupabaseAdmin(): SupabaseClient {
    if (!this.supabaseAdmin) {
      const url = this.configService.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL;
      const serviceRoleKey =
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceRoleKey) {
        throw new InternalServerErrorException(
          'Las credenciales de Supabase (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY) son requeridas',
        );
      }

      this.supabaseAdmin = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return this.supabaseAdmin;
  }

  async inviteStaff(dto: InviteStaffDto, callerUserId: string): Promise<StaffResponseDto> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const callerMembership = await this.prisma.merchantUser.findUnique({
      where: {
        userId_merchantId: {
          userId: callerUserId,
          merchantId: dto.merchantId,
        },
      },
    });

    if (!callerMembership || callerMembership.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño del comercio puede invitar personal');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`El comercio con ID ${dto.merchantId} no fue encontrado`);
    }

    const supabase = this.getSupabaseAdmin();

    if (dto.password) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        // Solo para que el trigger handle_new_user no le cree un local propio. La metadata la
        // controla el cliente, así que NO otorga permisos: la membresía se crea abajo.
        user_metadata: { merchant_id: dto.merchantId },
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data?.user) {
        throw new BadRequestException('No se pudo crear el usuario de personal');
      }

      await this.grantStaffMembership(data.user.id, dto.merchantId);

      return {
        id: data.user.id,
        email: data.user.email ?? dto.email,
        merchantId: dto.merchantId,
        role: 'STAFF',
        message: 'Personal creado exitosamente con credenciales de acceso',
      };
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(dto.email, {
      // Igual que arriba: evita que el trigger cree un local; no otorga permisos.
      data: { merchant_id: dto.merchantId },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data?.user) {
      throw new BadRequestException('No se pudo enviar la invitación al personal');
    }

    await this.grantStaffMembership(data.user.id, dto.merchantId);

    return {
      id: data.user.id,
      email: data.user.email ?? dto.email,
      merchantId: dto.merchantId,
      role: 'STAFF',
      message: 'Invitación enviada exitosamente por correo electrónico',
    };
  }

  /**
   * La membresía la crea el backend, y solo después de verificar que quien invita es OWNER.
   * Antes la creaba el trigger leyendo raw_user_meta_data, que el cliente puede escribir en
   * signUp con la anon key: cualquiera podía darse de alta como OWNER de cualquier local.
   * El rol es siempre STAFF, y si el usuario ya era miembro no se toca (no degrada a un OWNER).
   */
  private async grantStaffMembership(userId: string, merchantId: string): Promise<void> {
    await this.prisma.merchantUser.upsert({
      where: { userId_merchantId: { userId, merchantId } },
      create: { userId, merchantId, role: 'STAFF' },
      update: {},
    });
  }

  async listStaff(merchantId: string, callerUserId: string) {
    if (!callerUserId) throw new UnauthorizedException('Usuario no autenticado');

    const callerMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: callerUserId, merchantId } },
    });

    if (!callerMembership || callerMembership.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño del comercio puede ver el personal');
    }

    const memberships = await this.prisma.merchantUser.findMany({
      where: { merchantId, role: 'STAFF' },
      orderBy: { createdAt: 'desc' }
    });

    const supabase = this.getSupabaseAdmin();
    const result = [];

    for (const m of memberships) {
      const { data, error } = await supabase.auth.admin.getUserById(m.userId);
      if (error || !data?.user) continue;

      const isInvited = !data.user.last_sign_in_at;
      result.push({
        id: m.userId,
        email: data.user.email,
        role: m.role,
        status: isInvited ? 'INVITED' : 'ACTIVE',
        lastSignIn: data.user.last_sign_in_at,
        createdAt: m.createdAt,
      });
    }

    return result;
  }

  async removeStaff(merchantId: string, userIdToRemove: string, callerUserId: string) {
    if (!callerUserId) throw new UnauthorizedException('Usuario no autenticado');

    const callerMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: callerUserId, merchantId } },
    });

    if (!callerMembership || callerMembership.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño del comercio puede eliminar personal');
    }

    const targetMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: userIdToRemove, merchantId } },
    });

    if (!targetMembership) {
      throw new NotFoundException('Miembro del personal no encontrado');
    }
    
    if (targetMembership.role === 'OWNER') {
      throw new BadRequestException('No puedes eliminar al dueño del comercio');
    }

    await this.prisma.merchantUser.delete({
      where: { userId_merchantId: { userId: userIdToRemove, merchantId } },
    });

    return { success: true, message: 'Personal eliminado exitosamente' };
  }

  async getStaffActivity(merchantId: string, targetUserId: string, callerUserId: string) {
    if (!callerUserId) throw new UnauthorizedException('Usuario no autenticado');

    const callerMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: callerUserId, merchantId } },
    });

    if (!callerMembership || callerMembership.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño del comercio puede ver la actividad del personal');
    }

    const scans = await this.prisma.scan.findMany({
      where: { merchantId, createdByUserId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        pass: {
          include: { customer: true }
        },
        promotion: true
      },
      take: 50
    });

    return scans.map(s => ({
      id: s.id,
      type: s.type,
      method: s.method,
      createdAt: s.createdAt,
      customerPhone: s.pass?.customer?.phone || 'Desconocido',
      promotionName: s.promotion?.name || null
    }));
  }

  async updateStaffPassword(merchantId: string, targetUserId: string, newPassword: string, callerUserId: string) {
    if (!callerUserId) throw new UnauthorizedException('Usuario no autenticado');

    const callerMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: callerUserId, merchantId } },
    });

    if (!callerMembership || callerMembership.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño del comercio puede editar personal');
    }

    const targetMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: targetUserId, merchantId } },
    });

    if (!targetMembership) {
      throw new NotFoundException('Miembro del personal no encontrado');
    }

    const supabase = this.getSupabaseAdmin();
    const { error } = await supabase.auth.admin.updateUserById(targetUserId, { password: newPassword });
    
    if (error) {
      throw new BadRequestException(error.message);
    }

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  }
}
