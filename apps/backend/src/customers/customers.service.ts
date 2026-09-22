import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { normalizePhone } from '../common/utils/phone.util.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

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
    }

    // 1. Validar que el comercio exista
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('El comercio especificado no existe');
    }

    // 2. Buscar si el cliente ya existe por RUT o teléfono
    let customer = await this.prisma.customer.findFirst({
      where: {
        OR: [
          ...(normalizedRut ? [{ rut: normalizedRut }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    let isNewCustomer = false;

    if (!customer) {
      // Crear nuevo cliente
      customer = await this.prisma.customer.create({
        data: {
          rut: normalizedRut,
          phone: normalizedPhone,
        },
      });
      isNewCustomer = true;
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

    // 3. Buscar o crear el Pase (tarjeta) para este comercio específico
    let pass = await this.prisma.pass.findUnique({
      where: {
        customerId_merchantId: {
          customerId: customer.id,
          merchantId: dto.merchantId,
        },
      },
    });

    let isNewPass = false;

    if (!pass) {
      // Generar token criptográfico único con alta entropía
      const passToken = randomBytes(24).toString('hex');

      pass = await this.prisma.pass.create({
        data: {
          customerId: customer.id,
          merchantId: dto.merchantId,
          passToken,
        },
      });
      isNewPass = true;
    }

    return {
      customerId: customer.id,
      passId: pass.id,
      passToken: pass.passToken,
      isNew: isNewCustomer || isNewPass,
    };
  }
}
