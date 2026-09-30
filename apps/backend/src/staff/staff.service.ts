import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  STAFF_ACTIVITY_LIMIT,
  type StaffActivityDto,
  type StaffMemberDto,
} from '@fidelity/shared';
import { MerchantRole, type BrandMember } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  requireBrandOwner,
  resolveLocationAccess,
  type LocationWithBrand,
} from '../common/access/brand-access.js';
import {
  UserDirectoryService,
  type UserAccessInfo,
} from '../common/users/user-directory.service.js';
import { maskPhone } from '../common/utils/mask.util.js';
import { assertPlanAllows } from '../common/plan/plan-limits.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InviteStaffMemberDto,
  StaffResponseDto,
} from './dto/staff.dto.js';

/** ~100 años: Supabase no tiene baneo permanente. Invalida los refresh tokens del usuario. */
const BAN_FOREVER = '876000h';

const STAFF_ERRORS = {
  ownerOnly: 'Solo el dueño del comercio puede invitar personal',
  notFound: 'Miembro del personal no encontrado',
  ownerProtected: 'El dueño de la marca no se puede dar de baja ni reasignar',
  self: 'No puedes darte de baja a ti mismo',
  foreignLocation: 'El local no pertenece a esta marca',
  inactiveLocation: 'El local está inactivo',
  alreadyActivated:
    'Este usuario ya activó su cuenta o se creó con contraseña: no hay invitación que reenviar',
} as const;

type MembershipWithLocation = BrandMember & {
  merchant: { id: string; name: string } | null;
};

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  private supabaseAdmin: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly users: UserDirectoryService,
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

  async inviteStaff(
    brandId: string,
    callerUserId: string,
    dto: InviteStaffMemberDto,
  ): Promise<StaffResponseDto> {
    const merchant = await this.resolveOwnedLocation(
      brandId,
      callerUserId,
      dto.locationId,
    );
    await assertPlanAllows(this.prisma, brandId, 'teamUsers');
    const supabase = this.getSupabaseAdmin();

    if (dto.password) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        // Solo para que el trigger handle_new_user no le cree un local propio. La metadata la
        // controla el cliente, así que NO otorga permisos: la membresía se crea abajo.
        user_metadata: { merchant_id: merchant.id },
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      if (!data?.user) {
        throw new BadRequestException(
          'No se pudo crear el usuario de personal',
        );
      }

      await this.grantStaffMembership(data.user.id, merchant.brandId, merchant.id);

      return {
        id: data.user.id,
        email: data.user.email ?? dto.email,
        merchantId: merchant.id,
        role: MerchantRole.STAFF,
        message: 'Personal creado exitosamente con credenciales de acceso',
      };
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      dto.email,
      {
        // Igual que arriba: evita que el trigger cree un local; no otorga permisos.
        data: { merchant_id: merchant.id },
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

    await this.grantStaffMembership(data.user.id, merchant.brandId, merchant.id);

    return {
      id: data.user.id,
      email: data.user.email ?? dto.email,
      merchantId: merchant.id,
      role: MerchantRole.STAFF,
      message: 'Invitación enviada exitosamente por correo electrónico',
    };
  }

  /** El OWNER aparece primero; luego el personal por fecha de alta. */
  async listStaff(
    brandId: string,
    callerUserId: string,
  ): Promise<StaffMemberDto[]> {
    await requireBrandOwner(this.prisma, callerUserId, brandId);

    const memberships = await this.prisma.brandMember.findMany({
      where: { brandId },
      include: { merchant: { select: { id: true, name: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    const access = await this.users.lookupAccess(
      memberships.map((m) => m.userId),
    );

    return memberships.map((m) => {
      const info = access.get(m.userId);
      if (!info) {
        this.logger.warn(
          `Miembro ${m.userId} de la marca ${brandId} sin cuenta en auth.users`,
        );
      }
      return toStaffMember(m, info);
    });
  }

  async removeStaff(
    brandId: string,
    callerUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await requireBrandOwner(this.prisma, callerUserId, brandId);
    if (targetUserId === callerUserId) {
      throw new BadRequestException(STAFF_ERRORS.self);
    }
    const target = await this.findStaffMembership(brandId, targetUserId);

    const remaining = await this.prisma.$transaction(async (tx) => {
      await tx.brandMember.delete({
        where: { userId_brandId: { userId: targetUserId, brandId } },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: callerUserId,
          actorType: 'OWNER',
          action: 'staff.remove',
          entity: 'BrandMember',
          entityId: targetUserId,
          before: { brandId, role: target.role, merchantId: target.merchantId },
        },
      });
      return tx.brandMember.count({ where: { userId: targetUserId } });
    });

    // El corte inmediato lo dan el backend (membresía en cada request) y el RLS. El baneo
    // invalida los refresh tokens; si falla, se registra y la baja sigue siendo efectiva.
    if (remaining === 0) {
      const { error } = await this.getSupabaseAdmin().auth.admin.updateUserById(
        targetUserId,
        { ban_duration: BAN_FOREVER },
      );
      if (error) {
        this.logger.error(
          `No se pudo banear a ${targetUserId} tras la baja: ${error.message}`,
        );
      }
    }
  }

  async resendInvite(
    brandId: string,
    callerUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await requireBrandOwner(this.prisma, callerUserId, brandId);
    const target = await this.findStaffMembership(brandId, targetUserId);

    const info = (await this.users.lookupAccess([targetUserId])).get(
      targetUserId,
    );
    if (!info?.email) {
      throw new NotFoundException(STAFF_ERRORS.notFound);
    }
    if (!canResendInvite(target.role, info)) {
      throw new ConflictException(STAFF_ERRORS.alreadyActivated);
    }

    // Con un usuario que existe pero no confirmó su correo, Supabase reenvía la invitación.
    const { error } = await this.getSupabaseAdmin().auth.admin.inviteUserByEmail(
      info.email,
      { data: { merchant_id: target.merchantId } },
    );
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async reassignStaff(
    brandId: string,
    callerUserId: string,
    targetUserId: string,
    locationId: string,
  ): Promise<StaffMemberDto> {
    await requireBrandOwner(this.prisma, callerUserId, brandId);
    const target = await this.findStaffMembership(brandId, targetUserId);

    const location = await this.prisma.merchant.findUnique({
      where: { id: locationId },
      select: { id: true, brandId: true, isActive: true },
    });
    if (!location || location.brandId !== brandId) {
      throw new BadRequestException(STAFF_ERRORS.foreignLocation);
    }
    if (!location.isActive) {
      throw new BadRequestException(STAFF_ERRORS.inactiveLocation);
    }

    const updated =
      target.merchantId === locationId
        ? target
        : await this.prisma.$transaction(async (tx) => {
            const row = await tx.brandMember.update({
              where: { userId_brandId: { userId: targetUserId, brandId } },
              data: { merchantId: locationId },
              include: { merchant: { select: { id: true, name: true } } },
            });
            await tx.auditLog.create({
              data: {
                actorUserId: callerUserId,
                actorType: 'OWNER',
                action: 'staff.reassign',
                entity: 'BrandMember',
                entityId: targetUserId,
                before: { brandId, merchantId: target.merchantId },
                after: { brandId, merchantId: locationId },
              },
            });
            return row;
          });

    const info = (await this.users.lookupAccess([targetUserId])).get(
      targetUserId,
    );
    return toStaffMember(updated, info);
  }

  async getStaffActivity(
    brandId: string,
    callerUserId: string,
    targetUserId: string,
  ): Promise<StaffActivityDto[]> {
    await requireBrandOwner(this.prisma, callerUserId, brandId);

    const scans = await this.prisma.scan.findMany({
      where: { brandId, createdByUserId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: STAFF_ACTIVITY_LIMIT,
      select: {
        id: true,
        type: true,
        method: true,
        createdAt: true,
        merchant: { select: { name: true } },
        promotion: { select: { name: true } },
        pass: { select: { customer: { select: { phone: true } } } },
      },
    });

    return scans.map((s) => {
      const phone = s.pass.customer.phone;
      return {
        id: s.id,
        type: s.type,
        method: s.method,
        createdAt: s.createdAt.toISOString(),
        locationName: s.merchant.name,
        customerPhone: phone ? maskPhone(phone) : null,
        promotionName: s.promotion?.name ?? null,
      };
    });
  }

  /**
   * Valida marca activa, local operativo y OWNER (resolveLocationAccess), y además que el local
   * sea de la marca de la URL: sin esto, un dueño de dos marcas podría cruzar personal entre ellas.
   */
  private async resolveOwnedLocation(
    brandId: string,
    callerUserId: string,
    locationId: string,
  ): Promise<LocationWithBrand> {
    const { merchant } = await resolveLocationAccess(
      this.prisma,
      callerUserId,
      locationId,
      {
        ownerOnly: true,
        forbiddenMessage: STAFF_ERRORS.ownerOnly,
        ownerMessage: STAFF_ERRORS.ownerOnly,
      },
    );
    if (merchant.brandId !== brandId) {
      throw new ForbiddenException(STAFF_ERRORS.ownerOnly);
    }
    return merchant;
  }

  /** Solo el personal se gestiona: el OWNER no se da de baja, no se reasigna ni se reinvita. */
  private async findStaffMembership(
    brandId: string,
    userId: string,
  ): Promise<MembershipWithLocation> {
    const membership = await this.prisma.brandMember.findUnique({
      where: { userId_brandId: { userId, brandId } },
      include: { merchant: { select: { id: true, name: true } } },
    });
    if (!membership) {
      throw new NotFoundException(STAFF_ERRORS.notFound);
    }
    if (membership.role === MerchantRole.OWNER) {
      throw new BadRequestException(STAFF_ERRORS.ownerProtected);
    }
    return membership;
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
      if (existing.role === MerchantRole.STAFF && existing.merchantId === merchantId)
        return;
      throw new ConflictException(
        existing.role === MerchantRole.OWNER
          ? 'Ese usuario ya es dueño de la marca'
          : 'Ese usuario ya trabaja en otro local de la marca: reasígnalo desde Equipo',
      );
    }

    await this.prisma.brandMember.create({
      data: { userId, brandId, merchantId, role: MerchantRole.STAFF },
    });
    await this.liftBan(userId);
  }

  /** Quien fue dado de baja y vuelve a ser invitado queda baneado si no se levanta el baneo. */
  private async liftBan(userId: string): Promise<void> {
    const info = (await this.users.lookupAccess([userId])).get(userId);
    if (!info?.bannedUntil) return;

    const { error } = await this.getSupabaseAdmin().auth.admin.updateUserById(
      userId,
      { ban_duration: 'none' },
    );
    if (error) {
      throw new InternalServerErrorException(
        'Se creó el acceso, pero no se pudo reactivar la cuenta del usuario',
      );
    }
  }
}

function canResendInvite(
  role: MerchantRole,
  info: UserAccessInfo | undefined,
): boolean {
  return role === MerchantRole.STAFF && !!info && !info.emailConfirmedAt;
}

function toStaffMember(
  m: MembershipWithLocation,
  info: UserAccessInfo | undefined,
): StaffMemberDto {
  return {
    userId: m.userId,
    email: info?.email ?? null,
    role: m.role,
    locationId: m.merchant?.id ?? null,
    locationName: m.merchant?.name ?? null,
    // Sin cuenta de auth no pudo entrar nunca: no se informa como ACTIVE.
    status: info?.lastSignInAt ? 'ACTIVE' : 'INVITED',
    canResendInvite: canResendInvite(m.role, info),
    invitedAt: (info?.createdAt ?? m.createdAt).toISOString(),
    lastSignInAt: info?.lastSignInAt?.toISOString() ?? null,
  };
}
