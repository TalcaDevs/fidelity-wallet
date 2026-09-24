import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Customer } from '@prisma/client';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';
import { TERMS_VERSION } from './terms.js';

// Mismo mensaje para todo cruce de identidad: no revela cuál de los dos datos ya existe.
const IDENTITY_MISMATCH_MESSAGE =
  'Los datos proporcionados no coinciden o no son válidos para emitir el pase.';

/**
 * El cliente encontrado debe tener exactamente el RUT y el teléfono enviados.
 *
 * Un cliente antiguo (anterior al 2026-09-24) puede tener solo uno de los dos. El dato
 * faltante NO se completa con lo que llega: sin verificación (OTP), eso permitiría adjuntar el
 * teléfono de un tercero a la ficha de otra persona y luego resolver su pase en caja por ese
 * teléfono. Mientras no exista la verificación, basta con que coincida el dato que sí tiene.
 */
function assertSameIdentity(
  customer: Pick<Customer, 'rut' | 'phone'>,
  rut: string,
  phone: string,
): void {
  const rutMatches = customer.rut === null || customer.rut === rut;
  const phoneMatches = customer.phone === null || customer.phone === phone;
  if (!rutMatches || !phoneMatches) {
    throw new BadRequestException(IDENTITY_MISMATCH_MESSAGE);
  }
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passesService: PassesService,
  ) {}

  async createOrFindCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const rawRut = dto.rut?.trim();
    const rawPhone = dto.phone?.trim();

    // Desde 2026-09-24 el alta exige RUT **y** teléfono, más la aceptación de los términos.
    // El DTO ya lo valida; se repite acá porque este servicio también se llama sin pasar por HTTP.
    if (!rawRut || !rawPhone) {
      throw new BadRequestException(
        'Debe proporcionar el RUT y el teléfono para emitir la tarjeta',
      );
    }

    if (dto.acceptedTerms !== true) {
      throw new BadRequestException(
        'Debes aceptar los términos y condiciones para obtener tu tarjeta',
      );
    }

    if (!validateRut(rawRut)) {
      throw new BadRequestException('El RUT ingresado no es válido');
    }
    const normalizedRut = cleanRut(rawRut);

    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone) {
      throw new BadRequestException(
        `Formato de teléfono chileno inválido: "${rawPhone}". Se espera formato +569XXXXXXXX o 9XXXXXXXX.`,
      );
    }

    // Prueba del consentimiento: cuándo y qué versión de los términos aceptó (Ley 19.628).
    const termsAcceptance = { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION };

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
      throw new BadRequestException(IDENTITY_MISMATCH_MESSAGE);
    }

    let customer = customerByRut ?? customerByPhone;
    let isNewCustomer = false;

    if (!customer) {
      try {
        customer = await this.prisma.customer.create({
          data: {
            rut: normalizedRut,
            phone: normalizedPhone,
            ...termsAcceptance,
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
          assertSameIdentity(customer, normalizedRut, normalizedPhone);
        } else {
          throw err;
        }
      }
    } else {
      // Cliente existente: el RUT y el teléfono enviados deben coincidir con los guardados.
      // Conocer solo el RUT de alguien no alcanza para emitirle una tarjeta a su nombre.
      assertSameIdentity(customer, normalizedRut, normalizedPhone);

      // La aceptación se registra una vez por versión: re-enviar el formulario no pisa la fecha
      // en que el cliente aceptó por primera vez esta versión (es la prueba del consentimiento).
      if (customer.termsVersion !== TERMS_VERSION) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: termsAcceptance,
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
