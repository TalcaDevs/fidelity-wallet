import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Pass, Prisma } from '@prisma/client';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeneratePassDto, PassEmissionResponseDto } from './dto/generate-pass.dto.js';
import { PassData } from './interfaces/pass-data.interface.js';
import { ApplePassService } from './services/apple-pass.service.js';
import { GoogleWalletService } from './services/google-wallet.service.js';

@Injectable()
export class PassesService {
  private readonly logger = new Logger(PassesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applePassService: ApplePassService,
    private readonly googleWalletService: GoogleWalletService,
  ) {}

  /**
   * Punto único de emisión y recuperación de pases con entropía de 32 bytes y manejo de P2002.
   */
  async findOrCreatePass(
    customerId: string,
    merchantId: string,
  ): Promise<{ pass: Pass; isNew: boolean }> {
    let pass = await this.prisma.pass.findUnique({
      where: {
        customerId_merchantId: {
          customerId,
          merchantId,
        },
      },
    });

    if (pass) {
      return { pass, isNew: false };
    }

    const passToken = randomBytes(32).toString('hex');
    try {
      pass = await this.prisma.pass.create({
        data: {
          customerId,
          merchantId,
          passToken,
        },
      });
      return { pass, isNew: true };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        pass = await this.prisma.pass.findUnique({
          where: {
            customerId_merchantId: {
              customerId,
              merchantId,
            },
          },
        });
        if (!pass) throw err;
        return { pass, isNew: false };
      }
      throw err;
    }
  }

  async generatePass(
    dto: GeneratePassDto,
    callerUserId: string,
  ): Promise<PassEmissionResponseDto> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const membership = await this.prisma.merchantUser.findUnique({
      where: {
        userId_merchantId: {
          userId: callerUserId,
          merchantId: dto.merchantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'El usuario no está autorizado como miembro de este comercio',
      );
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${dto.customerId} no encontrado`);
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(`Comercio con ID ${dto.merchantId} no encontrado`);
    }

    const { pass } = await this.findOrCreatePass(dto.customerId, dto.merchantId);

    const promotion = dto.promotionId
      ? await this.prisma.promotion.findFirst({
          where: { id: dto.promotionId, merchantId: dto.merchantId, isActive: true },
        })
      : await this.prisma.promotion.findFirst({
          where: { merchantId: dto.merchantId, isActive: true },
          orderBy: { createdAt: 'desc' },
        });

    if (!promotion) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    const now = new Date();
    const activeStamps = await this.prisma.stamp.count({
      where: {
        passId: pass.id,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    const nextExpiring = await this.prisma.stamp.findFirst({
      where: {
        passId: pass.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    });

    const customerLabel = customer.rut
      ? maskRut(customer.rut)
      : customer.phone
        ? maskPhone(customer.phone)
        : 'Cliente';

    const passData: PassData = {
      passId: pass.id,
      serialNumber: pass.id,
      passToken: pass.passToken,
      merchantId: merchant.id,
      merchantName: merchant.name,
      customerLabel,
      activeStamps,
      targetStamps: promotion.targetStamps,
      rewardName: promotion.rewardName,
      nextExpiryAt: nextExpiring?.expiresAt ?? null,
    };

    const appleWalletUrl = this.applePassService.getPassUrl(pass.passToken);
    const googleWalletUrl = this.googleWalletService.generateSaveUrl(passData);

    return {
      passId: pass.id,
      passToken: pass.passToken,
      appleWalletUrl,
      googleWalletUrl,
      activeStamps,
      targetStamps: promotion.targetStamps,
      rewardName: promotion.rewardName,
      nextExpiryAt: nextExpiring?.expiresAt ?? null,
    };
  }

  /**
   * Genera las URLs de billetera para un pase (utilizado por el alta anónima de clientes).
   */
  async getWalletUrlsForPass(
    passId: string,
  ): Promise<{ appleWalletUrl: string; googleWalletUrl: string } | null> {
    const pass = await this.prisma.pass.findUnique({
      where: { id: passId },
      include: { merchant: true, customer: true },
    });

    if (!pass) return null;

    const promotion = await this.prisma.promotion.findFirst({
      where: { merchantId: pass.merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!promotion) return null;

    const now = new Date();
    const activeStamps = await this.prisma.stamp.count({
      where: {
        passId: pass.id,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    const nextExpiring = await this.prisma.stamp.findFirst({
      where: {
        passId: pass.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    });

    const customerLabel = pass.customer?.rut
      ? maskRut(pass.customer.rut)
      : pass.customer?.phone
        ? maskPhone(pass.customer.phone)
        : 'Cliente';

    const passData: PassData = {
      passId: pass.id,
      serialNumber: pass.id,
      passToken: pass.passToken,
      merchantId: pass.merchant.id,
      merchantName: pass.merchant.name,
      customerLabel,
      activeStamps,
      targetStamps: promotion.targetStamps,
      rewardName: promotion.rewardName,
      nextExpiryAt: nextExpiring?.expiresAt ?? null,
    };

    return {
      appleWalletUrl: this.applePassService.getPassUrl(pass.passToken),
      googleWalletUrl: this.googleWalletService.generateSaveUrl(passData),
    };
  }

  async getApplePassBuffer(passToken: string): Promise<Buffer> {
    const pass = await this.prisma.pass.findUnique({
      where: { passToken },
      include: {
        merchant: true,
        customer: true,
      },
    });

    if (!pass) {
      throw new NotFoundException('Pase no encontrado');
    }

    const promotion = await this.prisma.promotion.findFirst({
      where: { merchantId: pass.merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!promotion) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    const now = new Date();
    const activeStamps = await this.prisma.stamp.count({
      where: {
        passId: pass.id,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    const nextExpiring = await this.prisma.stamp.findFirst({
      where: {
        passId: pass.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    });

    const customerLabel = pass.customer?.rut
      ? maskRut(pass.customer.rut)
      : pass.customer?.phone
        ? maskPhone(pass.customer.phone)
        : 'Cliente';

    const passData: PassData = {
      passId: pass.id,
      serialNumber: pass.id,
      passToken: pass.passToken,
      merchantId: pass.merchant.id,
      merchantName: pass.merchant.name,
      customerLabel,
      activeStamps,
      targetStamps: promotion.targetStamps,
      rewardName: promotion.rewardName,
      nextExpiryAt: nextExpiring?.expiresAt ?? null,
    };

    return this.applePassService.generatePassBuffer(passData);
  }

  async notifyPassUpdate(passId: string): Promise<void> {
    try {
      const now = new Date();
      const activeStamps = await this.prisma.stamp.count({
        where: {
          passId,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });

      this.logger.log(`Dispatching wallet update for pass ${passId} (activeStamps: ${activeStamps})`);
      await Promise.allSettled([
        this.googleWalletService.updateLoyaltyObject(passId, activeStamps),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to dispatch background wallet push for pass ${passId}: ${msg}`);
    }
  }
}
