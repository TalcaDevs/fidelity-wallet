import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passesService: PassesService,
  ) {}

  async createOrFindCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const rawRut = dto.rut?.trim();
    const rawPhone = dto.phone?.trim();

    if (!rawRut && !rawPhone) {
      throw new BadRequestException(
        'Debe proporcionar al menos un RUT o un teléfono para emitir la tarjeta',
      );
    }

    let normalizedRut: string | null = null;
    if (rawRut) {
      if (!validateRut(rawRut)) {
        throw new BadRequestException('El RUT ingresado no es válido');
      }
      normalizedRut = cleanRut(rawRut);
    }

    let normalizedPhone: string | null = null;
    if (rawPhone) {
      normalizedPhone = normalizePhone(rawPhone);
      if (!normalizedPhone) {
        throw new BadRequestException(
          `Formato de teléfono chileno inválido: "${rawPhone}". Se espera formato +569XXXXXXXX o 9XXXXXXXX.`,
        );
      }
    }

    // 1. Validar que el comercio exista
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('El comercio especificado no existe');
    }

    const activePromotion = await this.prisma.promotion.findFirst({
      where: { merchantId: dto.merchantId, isActive: true },
    });

    if (!activePromotion) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    // 2. Buscar si el cliente ya existe por RUT o teléfono evitando cruce de identidades
    const customerByRut = normalizedRut
      ? await this.prisma.customer.findUnique({ where: { rut: normalizedRut } })
      : null;
    const customerByPhone = normalizedPhone
      ? await this.prisma.customer.findUnique({ where: { phone: normalizedPhone } })
      : null;

    if (customerByRut && customerByPhone && customerByRut.id !== customerByPhone.id) {
      throw new BadRequestException(
        'Los datos proporcionados no coinciden o no son válidos para emitir el pase.',
      );
    }

    let customer = customerByRut ?? customerByPhone;
    let isNewCustomer = false;

    if (!customer) {
      try {
        customer = await this.prisma.customer.create({
          data: {
            rut: normalizedRut,
            phone: normalizedPhone,
          },
        });
        isNewCustomer = true;
      } catch (err: unknown) {
        // En caso de condición de carrera concurrente (P2002: unique constraint violation), reintentar búsqueda
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          customer = await this.prisma.customer.findFirst({
            where: {
              OR: [
                ...(normalizedRut ? [{ rut: normalizedRut }] : []),
                ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
              ],
            },
          });
          if (!customer) throw err;
        } else {
          throw err;
        }
      }
    } else {
      // Actualizar datos si viene un dato nuevo que no tenía
      const needsUpdate =
        (normalizedRut && !customer.rut) || (normalizedPhone && !customer.phone);

      if (needsUpdate) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: {
            rut: normalizedRut ?? customer.rut,
            phone: normalizedPhone ?? customer.phone,
          },
        });
      }
    }

    // 3. Buscar o crear el Pase (tarjeta) para este comercio específico mediante PassesService
    const { pass, isNew: isNewPass } = await this.passesService.findOrCreatePass(
      customer.id,
      dto.merchantId,
    );

    // Solo se entregan las URLs de billetera cuando el pase se crea por primera vez en esta llamada.
    // Si el pase ya existía, no se devuelven credenciales para evitar suplantación de identidad por RUT.
    const walletUrls = isNewPass ? await this.passesService.getWalletUrlsForPass(pass.id) : null;

    return {
      customerId: customer.id,
      passId: pass.id,
      isNew: isNewCustomer || isNewPass,
      ...walletUrls,
    };
  }
}
