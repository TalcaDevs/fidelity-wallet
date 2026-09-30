import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resolveLocationAccess } from '../common/access/brand-access.js';
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

    const ownerOnlyMessage = 'Solo el dueño del comercio puede invitar personal';
    const { merchant } = await resolveLocationAccess(this.prisma, callerUserId, dto.merchantId, {
      ownerOnly: true,
      forbiddenMessage: ownerOnlyMessage,
      ownerMessage: ownerOnlyMessage,
    });

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

      await this.grantStaffMembership(data.user.id, merchant.brandId, merchant.id);

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

    await this.grantStaffMembership(data.user.id, merchant.brandId, merchant.id);

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
   * El rol es siempre STAFF, y si el usuario ya era miembro de la marca no se toca: no degrada
   * a un OWNER ni cambia de local a un mesero en silencio.
   */
  private async grantStaffMembership(userId: string, brandId: string, merchantId: string): Promise<void> {
    await this.prisma.brandMember.upsert({
      where: { userId_brandId: { userId, brandId } },
      create: { userId, brandId, merchantId, role: 'STAFF' },
      update: {},
    });
  }
}
