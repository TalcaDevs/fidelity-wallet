import { randomBytes } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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

  async generatePass(dto: GeneratePassDto): Promise<PassEmissionResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${dto.merchantId} not found`);
    }

    let pass = await this.prisma.pass.findUnique({
      where: {
        customerId_merchantId: {
          customerId: dto.customerId,
          merchantId: dto.merchantId,
        },
      },
    });

    if (!pass) {
      const passToken = randomBytes(32).toString('hex');
      pass = await this.prisma.pass.create({
        data: {
          customerId: dto.customerId,
          merchantId: dto.merchantId,
          passToken,
        },
      });
    }

    const promotion = await this.prisma.promotion.findFirst({
      where: { merchantId: dto.merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!promotion) {
      throw new BadRequestException('Merchant has no active promotion configured');
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

  async getApplePassBuffer(passToken: string): Promise<Buffer> {
    const pass = await this.prisma.pass.findUnique({
      where: { passToken },
      include: {
        merchant: true,
        customer: true,
      },
    });

    if (!pass) {
      throw new NotFoundException('Pass not found');
    }

    const promotion = await this.prisma.promotion.findFirst({
      where: { merchantId: pass.merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

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

    const customerLabel = pass.customer.rut
      ? maskRut(pass.customer.rut)
      : pass.customer.phone
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
      targetStamps: promotion?.targetStamps ?? 10,
      rewardName: promotion?.rewardName ?? 'Premio Fidelidad',
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

      this.logger.log(`Dispatching asynchronous wallet push for pass ${passId} (stamps: ${activeStamps})`);
      await Promise.allSettled([
        this.applePassService.sendApnsPush(passId),
        this.googleWalletService.updateLoyaltyObject(passId, activeStamps),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to dispatch background wallet push for pass ${passId}: ${msg}`);
    }
  }
}
