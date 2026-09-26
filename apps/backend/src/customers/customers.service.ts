import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Customer } from '@prisma/client';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';
import { DeleteCustomerResponseDto } from './dto/deletion.dto.js';
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Validar que el comercio exista
      const merchant = await tx.merchant.findUnique({
        where: { id: dto.merchantId },
      });

      if (!merchant) {
        throw new NotFoundException('El comercio especificado no existe');
      }

      const activePromotion = await tx.promotion.findFirst({
        where: { merchantId: dto.merchantId, isActive: true },
      });

      if (!activePromotion) {
        throw new BadRequestException('El comercio no tiene una promoción activa configurada');
      }

      // 2. Buscar si el cliente ya existe por RUT o teléfono evitando cruce de identidades
      const customerByRut = normalizedRut
        ? await tx.customer.findUnique({ where: { rut: normalizedRut } })
        : null;
      const customerByPhone = normalizedPhone
        ? await tx.customer.findUnique({ where: { phone: normalizedPhone } })
        : null;

      if (customerByRut && customerByPhone && customerByRut.id !== customerByPhone.id) {
        throw new BadRequestException(IDENTITY_MISMATCH_MESSAGE);
      }

      let customer = customerByRut ?? customerByPhone;
      let isNewCustomer = false;

      if (!customer) {
        try {
          customer = await tx.customer.create({
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
            customer = await tx.customer.findFirst({
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
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: termsAcceptance,
          });
        }
      }

      // 3. Buscar o crear el Pase (tarjeta) para este comercio específico mediante PassesService
      const { pass, isNew: isNewPass } = await this.passesService.findOrCreatePass(
        customer.id,
        dto.merchantId,
        tx,
      );

      // Solo se entregan las URLs de billetera cuando el pase se crea por primera vez en esta llamada.
      // Si el pase ya existía, no se devuelven credenciales para evitar suplantación de identidad por RUT.
      // Si la generación de URLs falla o es nula, abortamos la transacción para evitar que el cliente
      // quede registrado sin tarjeta y sin posibilidad de recuperarla.
      let walletUrls: { appleWalletUrl: string; googleWalletUrl: string } | null = null;
      if (isNewPass) {
        try {
          walletUrls = await this.passesService.getWalletUrlsForPass(pass.id, tx);
        } catch (err: unknown) {
          if (err instanceof HttpException) {
            throw err;
          }
          throw new InternalServerErrorException(
            'Error al generar las credenciales de la tarjeta digital',
            { cause: err },
          );
        }

        if (!walletUrls) {
          throw new InternalServerErrorException(
            'Error al generar las credenciales de la tarjeta digital',
          );
        }
      }

      return {
        customerId: customer.id,
        passId: pass.id,
        isNew: isNewCustomer || isNewPass,
        ...(walletUrls ?? {}),
      };
    });
  }



  /**
   * Elimina un cliente y su pase en el comercio especificado (Ley 19.628).
   * Solo el OWNER del comercio puede ejecutar esta acción.
   * Si el cliente no tiene más pases en otros comercios, el registro Customer
   * se elimina por completo de la base de datos.
   */
  async deleteCustomerByMerchant(
    merchantId: string,
    customerId: string,
    callerUserId: string,
  ): Promise<DeleteCustomerResponseDto> {
    if (!callerUserId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Verificar que el usuario que llama sea OWNER del comercio
    const membership = await this.prisma.merchantUser.findUnique({
      where: {
        userId_merchantId: {
          userId: callerUserId,
          merchantId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño del comercio puede eliminar clientes');
    }

    const pass = await this.prisma.pass.findUnique({
      where: {
        customerId_merchantId: {
          customerId,
          merchantId,
        },
      },
    });

    if (!pass) {
      throw new NotFoundException('Cliente o pase no encontrado en este comercio');
    }

    let customerCompletelyDeleted = false;

    await this.prisma.$transaction(async (tx) => {
      // Eliminar códigos OTP del cliente para este comercio
      await tx.customerVerificationCode.deleteMany({
        where: {
          customerId,
          merchantId,
        },
      });

      // Eliminar pase (la cascada en BD elimina Scans y Stamps)
      await tx.pass.delete({
        where: {
          id: pass.id,
        },
      });

      // Verificar si el cliente aún tiene pases en otros comercios
      const remainingPasses = await tx.pass.count({
        where: { customerId },
      });

      if (remainingPasses === 0) {
        await tx.customer.delete({
          where: { id: customerId },
        });
        customerCompletelyDeleted = true;
      }
    });

    try {
      await this.passesService.notifyPassUpdate(pass.id);
    } catch {
      // Ignorar fallo de notificación al eliminar
    }

    return {
      success: true,
      message: 'Datos y pase del cliente eliminados exitosamente de este comercio',
      customerCompletelyDeleted,
    };
  }

  /**
   * Elimina completamente a un cliente y todos sus pases, sellos e historial (Ley 19.628).
   * Uso administrativo / soporte legal ante solicitudes directas por correo (soporte@...).
   */
  async deleteCustomerGlobal(customerId: string): Promise<DeleteCustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { passes: true },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.delete({
        where: { id: customerId },
      });
    });

    for (const pass of customer.passes) {
      try {
        await this.passesService.notifyPassUpdate(pass.id);
      } catch {
        // Ignorar fallo de notificación
      }
    }

    return {
      success: true,
      message: 'Cliente y todos sus pases eliminados exitosamente',
      customerCompletelyDeleted: true,
    };
  }
}
