import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
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
      const url =
        this.configService.get<string>('SUPABASE_URL') ||
        process.env.SUPABASE_URL;
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
        throw new BadRequestException(
          'No se pudo crear el usuario de personal',
        );
      }

      await this.grantStaffMembership(
        data.user.id,
        merchant.brandId,
        merchant.id,
      );

      return {
        id: data.user.id,
        email: data.user.email ?? dto.email,
        merchantId: dto.merchantId,
        role: 'STAFF',
        message: 'Personal creado exitosamente con credenciales de acceso',
      };
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      dto.email,
      {
        // Igual que arriba: evita que el trigger cree un local; no otorga permisos.
        data: { merchant_id: dto.merchantId },
      },
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data?.user) {
      throw new BadRequestException(
        'No se pudo enviar la invitación al personal',
      );
    }

    await this.grantStaffMembership(
      data.user.id,
      merchant.brandId,
      merchant.id,
    );

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
   * El rol es siempre STAFF. Una membresía existente no se degrada ni se mueve de local: eso
   * responde 409 para que el dueño lo haga explícitamente desde Equipo.
   */
  private async grantStaffMembership(
    userId: string,
    brandId: string,
    merchantId: string,
  ): Promise<void> {
    const existing = await this.prisma.brandMember.findUnique({
      where: { userId_brandId: { userId, brandId } },
    });

    if (existing) {
      if (existing.role === 'STAFF' && existing.merchantId === merchantId)
        return;
      throw new ConflictException(
        existing.role === 'OWNER'
          ? 'Ese usuario ya es dueño de la marca'
          : 'Ese usuario ya trabaja en otro local de la marca: reasígnalo desde Equipo',
      );
    }

    await this.prisma.brandMember.create({
      data: { userId, brandId, merchantId, role: 'STAFF' },
    });
  }

  async listStaff(brandId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: brandId },
      select: { name: true },
    });

    const memberships = await this.prisma.merchantUser.findMany({
      where: { merchantId: brandId },
      orderBy: { createdAt: 'desc' }
    });

    const supabase = this.getSupabaseAdmin();
    // Fetch all users to avoid N+1.
    // listUsers paginates up to 50 by default, using a larger perPage if needed,
    // but typically a brand won't have 1000s of staff members right now.
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUsers = authError || !authData?.users ? [] : authData.users;
    
    // Create a map for fast lookup
    const userMap = new Map(authUsers.map(u => [u.id, u]));

    const result = memberships.map((m) => {
      const u = userMap.get(m.userId);
      const isInvited = u ? !u.last_sign_in_at : false;
      return {
        userId: m.userId,
        email: u?.email || 'Desconocido',
        role: m.role,
        locationId: brandId, // Map to brandId for now until Location migration
        locationName: merchant?.name || 'Desconocido',
        status: isInvited ? 'INVITED' : 'ACTIVE',
        invitedAt: u?.created_at || m.createdAt,
        lastSignInAt: u?.last_sign_in_at || null,
      };
    });

    return result;
  }

  async removeStaff(brandId: string, userIdToRemove: string) {
    const targetMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: userIdToRemove, merchantId: brandId } },
    });

    if (!targetMembership) {
      throw new NotFoundException('Miembro del personal no encontrado');
    }
    
    if (targetMembership.role === 'OWNER') {
      throw new BadRequestException('No puedes eliminar al dueño del comercio');
    }

    await this.prisma.merchantUser.delete({
      where: { userId_merchantId: { userId: userIdToRemove, merchantId: brandId } },
    });

    return { success: true, message: 'Personal eliminado exitosamente' };
  }

  async resendInvite(brandId: string, userId: string) {
    const supabase = this.getSupabaseAdmin();
    
    const targetMembership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId, merchantId: brandId } },
    });

    if (!targetMembership) {
      throw new NotFoundException('Miembro del personal no encontrado');
    }

    const { data: userResponse, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userResponse?.user?.email) {
      throw new BadRequestException('No se pudo obtener el correo electrónico del usuario');
    }

    const { error } = await supabase.auth.admin.inviteUserByEmail(userResponse.user.email, {
      data: { merchant_id: brandId },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getStaffActivity(brandId: string, targetUserId: string) {

    const scans = await this.prisma.scan.findMany({
      where: { merchantId: brandId, createdByUserId: targetUserId },
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


}
