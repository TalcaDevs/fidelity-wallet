import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Customer, Merchant, Pass, Prisma } from '@prisma/client';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeneratePassDto, PassEmissionResponseDto } from './dto/generate-pass.dto.js';
import { PassData } from './interfaces/pass-data.interface.js';
import { ApplePassService } from './services/apple-pass.service.js';
import { GoogleWalletService } from './services/google-wallet.service.js';

export type PassWithMerchantAndCustomer = Pass & {
  merchant: Merchant;
  customer: Customer | null;
};

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

    const fullPass: PassWithMerchantAndCustomer = {
      ...pass,
      merchant,
      customer,
    };

    const passData = await this.buildPassData(fullPass, dto.promotionId);
    if (!passData) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    const appleWalletUrl = this.applePassService.getPassUrl(pass.passToken);
    const googleWalletUrl = this.googleWalletService.generateSaveUrl(passData);

    return {
      passId: pass.id,
      passToken: pass.passToken,
      appleWalletUrl,
      googleWalletUrl,
      activeStamps: passData.activeStamps,
      targetStamps: passData.targetStamps,
      rewardName: passData.rewardName,
      nextExpiryAt: passData.nextExpiryAt,
    };
  }

  /**
   * Genera las URLs de billetera para un pase (utilizado por el alta anónima de clientes).
   * Acepta el ID del pase o el pase completo pre-cargado para evitar queries redundantes.
   */
  async getWalletUrlsForPass(
    passOrId: string | PassWithMerchantAndCustomer,
  ): Promise<{ appleWalletUrl: string; googleWalletUrl: string } | null> {
    const pass =
      typeof passOrId === 'string'
        ? await this.prisma.pass.findUnique({
            where: { id: passOrId },
            include: { merchant: true, customer: true },
          })
        : passOrId;

    if (!pass) return null;

    const passData = await this.buildPassData(pass);
    if (!passData) return null;

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

    const passData = await this.buildPassData(pass);
    if (!passData) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    return this.applePassService.generatePassBuffer(passData);
  }

  async notifyPassUpdate(passId: string): Promise<void> {
    try {
      const pass = await this.prisma.pass.findUnique({
        where: { id: passId },
        include: { merchant: true, customer: true },
      });

      if (!pass) return;

      const passData = await this.buildPassData(pass);
      if (!passData) return;

      this.logger.log(
        `Dispatching wallet update for pass ${passId} (activeStamps: ${passData.activeStamps})`,
      );
      await Promise.allSettled([
        this.googleWalletService.updateLoyaltyObject(passId, passData.activeStamps),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to dispatch background wallet push for pass ${passId}: ${msg}`);
    }
  }

  /**
   * Helper privado para armar el contrato PassData.
   * Unifica el conteo de sellos activos y próximo vencimiento filtrando por la promoción activa.
   */
  private async buildPassData(
    pass: PassWithMerchantAndCustomer,
    explicitPromotionId?: string,
  ): Promise<PassData | null> {
    const promotion = explicitPromotionId
      ? await this.prisma.promotion.findFirst({
          where: { id: explicitPromotionId, merchantId: pass.merchantId, isActive: true },
        })
      : await this.prisma.promotion.findFirst({
          where: { merchantId: pass.merchantId, isActive: true },
          orderBy: { createdAt: 'desc' },
        });

    if (!promotion) return null;

    const now = new Date();
    const promotionFilter = {
      OR: [{ promotionId: promotion.id }, { promotionId: null }],
    };

    const activeStamps = await this.prisma.stamp.count({
      where: {
        passId: pass.id,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [promotionFilter],
      },
    });

    const nextExpiring = await this.prisma.stamp.findFirst({
      where: {
        passId: pass.id,
        consumedAt: null,
        expiresAt: { gt: now },
        AND: [promotionFilter],
      },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    });

    const customerLabel = pass.customer?.rut
      ? maskRut(pass.customer.rut)
      : pass.customer?.phone
        ? maskPhone(pass.customer.phone)
        : 'Cliente';

    return {
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
  }
}
