import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { Prisma, type Customer } from '@prisma/client';
import { maskPhone } from '../common/utils/mask.util.js';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';
import {
  DeleteCustomerResponseDto,
  RequestDeletionDto,
  RequestDeletionResponseDto,
  VerifyDeletionDto,
} from './dto/deletion.dto.js';
import {
  RequestRecoveryDto,
  RequestRecoveryResponseDto,
  VerifyRecoveryDto,
  VerifyRecoveryResponseDto,
} from './dto/recovery.dto.js';
import { SmsService } from './services/sms.service.js';
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
    private readonly smsService: SmsService,
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
   * Solicita un código OTP de 6 dígitos para recuperar un pase perdido.
   * Valida la identidad del cliente (RUT + teléfono) y que posea un pase en el comercio indicado.
   * Aplica rate-limiting estricto: mínimo 60 s entre solicitudes, máximo 5 en 15 min.
   */
  async requestRecoveryCode(dto: RequestRecoveryDto): Promise<RequestRecoveryResponseDto> {
    const rawRut = dto.rut?.trim();
    const rawPhone = dto.phone?.trim();

    if (!rawRut || !rawPhone) {
      throw new BadRequestException('Debe proporcionar el RUT y el teléfono para recuperar su tarjeta');
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

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
      select: { id: true, name: true },
    });
    if (!merchant) {
      throw new NotFoundException('El comercio especificado no existe');
    }

    // Buscar al cliente por RUT o teléfono evitando cruce de identidades
    const customerByRut = normalizedRut
      ? await this.prisma.customer.findUnique({ where: { rut: normalizedRut } })
      : null;
    const customerByPhone = normalizedPhone
      ? await this.prisma.customer.findUnique({ where: { phone: normalizedPhone } })
      : null;

    if (customerByRut && customerByPhone && customerByRut.id !== customerByPhone.id) {
      throw new BadRequestException(IDENTITY_MISMATCH_MESSAGE);
    }

    const customer = customerByRut ?? customerByPhone;
    if (!customer) {
      throw new NotFoundException('No se encontró un cliente registrado con los datos proporcionados');
    }

    // Validar coincidencia de identidad
    assertSameIdentity(customer, normalizedRut, normalizedPhone);

    // Validar que el cliente tenga un pase en este comercio específico
    const pass = await this.prisma.pass.findUnique({
      where: {
        customerId_merchantId: {
          customerId: customer.id,
          merchantId: dto.merchantId,
        },
      },
    });

    if (!pass) {
      throw new NotFoundException('No tienes una tarjeta registrada en este comercio');
    }

    // Rate-limiting: verificar última solicitud en los últimos 60 segundos
    const now = new Date();
    const lastMinuteCode = await this.prisma.customerVerificationCode.findFirst({
      where: {
        customerId: customer.id,
        merchantId: dto.merchantId,
        createdAt: { gt: new Date(now.getTime() - 60 * 1000) },
      },
    });

    if (lastMinuteCode) {
      throw new BadRequestException('Debes esperar al menos un minuto antes de solicitar otro código');
    }

    // Rate-limiting: máximo 5 solicitudes en los últimos 15 minutos
    const recentCodesCount = await this.prisma.customerVerificationCode.count({
      where: {
        customerId: customer.id,
        merchantId: dto.merchantId,
        createdAt: { gt: new Date(now.getTime() - 15 * 60 * 1000) },
      },
    });

    if (recentCodesCount >= 5) {
      throw new HttpException(
        'Demasiadas solicitudes de código. Por favor intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generar código numérico de 6 dígitos
    const code = randomInt(100000, 1000000).toString();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos

    await this.prisma.customerVerificationCode.create({
      data: {
        customerId: customer.id,
        merchantId: dto.merchantId,
        codeHash,
        expiresAt,
      },
    });

    const destinationPhone = customer.phone ?? normalizedPhone;
    await this.smsService.sendRecoveryCode(destinationPhone, code, merchant.name);

    return {
      success: true,
      message: 'Se ha enviado un código de verificación por SMS a tu teléfono',
      phoneMasked: maskPhone(destinationPhone),
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  /**
   * Verifica el código OTP recibido por SMS. Si es correcto, devuelve las credenciales de
   * billetera (URLs de Apple y Google Wallet) y, si es un cliente antiguo, actualiza de forma
   * segura el dato faltante verificado.
   */
  async verifyRecoveryCode(dto: VerifyRecoveryDto): Promise<VerifyRecoveryResponseDto> {
    const rawRut = dto.rut?.trim();
    const rawPhone = dto.phone?.trim();
    const rawCode = dto.code?.trim();

    if (!rawRut || !rawPhone || !rawCode) {
      throw new BadRequestException('Faltan datos requeridos para la verificación');
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

    const customerByRut = normalizedRut
      ? await this.prisma.customer.findUnique({ where: { rut: normalizedRut } })
      : null;
    const customerByPhone = normalizedPhone
      ? await this.prisma.customer.findUnique({ where: { phone: normalizedPhone } })
      : null;

    if (customerByRut && customerByPhone && customerByRut.id !== customerByPhone.id) {
      throw new BadRequestException(IDENTITY_MISMATCH_MESSAGE);
    }

    const customer = customerByRut ?? customerByPhone;
    if (!customer) {
      throw new NotFoundException('No se encontró un cliente registrado con los datos proporcionados');
    }

    assertSameIdentity(customer, normalizedRut, normalizedPhone);

    const pass = await this.prisma.pass.findUnique({
      where: {
        customerId_merchantId: {
          customerId: customer.id,
          merchantId: dto.merchantId,
        },
      },
    });

    if (!pass) {
      throw new NotFoundException('No tienes una tarjeta registrada en este comercio');
    }

    const now = new Date();
    const activeVerification = await this.prisma.customerVerificationCode.findFirst({
      where: {
        customerId: customer.id,
        merchantId: dto.merchantId,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeVerification) {
      throw new BadRequestException('No hay un código de verificación activo. Por favor solicita uno nuevo.');
    }

    if (activeVerification.attempts >= 3) {
      throw new BadRequestException(
        'Has superado el número máximo de intentos para este código. Por favor solicita uno nuevo.',
      );
    }

    const inputHash = createHash('sha256').update(rawCode).digest('hex');
    if (inputHash !== activeVerification.codeHash) {
      const nextAttempts = activeVerification.attempts + 1;
      await this.prisma.customerVerificationCode.update({
        where: { id: activeVerification.id },
        data: { attempts: nextAttempts },
      });

      const remaining = Math.max(0, 3 - nextAttempts);
      throw new BadRequestException(
        `Código de verificación incorrecto. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'}.`,
      );
    }

    // Código válido: marcar como consumido
    await this.prisma.customerVerificationCode.update({
      where: { id: activeVerification.id },
      data: { consumedAt: now },
    });

    // Si era un cliente antiguo con dato faltante, completar el dato ya verificado por OTP (§3.2 línea 225)
    if (!customer.phone || !customer.rut) {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: customer.phone ?? normalizedPhone,
          rut: customer.rut ?? normalizedRut,
        },
      });
    }

    // Generar credenciales seguras de billetera
    const walletUrls = await this.passesService.getWalletUrlsForPass(pass.id);

    return {
      success: true,
      customerId: customer.id,
      passId: pass.id,
      appleWalletUrl: walletUrls?.appleWalletUrl,
      googleWalletUrl: walletUrls?.googleWalletUrl,
      message: '¡Tarjeta recuperada exitosamente!',
    };
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

  /**
   * Solicita un código OTP por SMS para confirmar la eliminación de datos personales (Ley 19.628).
   * Valida la existencia del cliente y su pase en el comercio antes de emitir el código.
   */
  async requestDeletionCode(dto: RequestDeletionDto): Promise<RequestDeletionResponseDto> {
    const rawRut = dto.rut?.trim();
    const rawPhone = dto.phone?.trim();

    if (!rawRut && !rawPhone) {
      throw new BadRequestException('Debes proporcionar el RUT o el teléfono registrado');
    }

    let normalizedRut: string | undefined;
    if (rawRut) {
      const cleaned = cleanRut(rawRut);
      if (!validateRut(cleaned)) {
        throw new BadRequestException('El RUT ingresado no es válido');
      }
      normalizedRut = cleaned;
    }

    let normalizedPhone: string | undefined;
    if (rawPhone) {
      const cleanedPhone = normalizePhone(rawPhone);
      if (!cleanedPhone) {
        throw new BadRequestException('El teléfono ingresado no es válido');
      }
      normalizedPhone = cleanedPhone;
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
      select: { id: true, name: true },
    });
    if (!merchant) {
      throw new NotFoundException('Comercio no encontrado');
    }

    const where: Prisma.CustomerWhereInput = {};
    if (normalizedRut) where.rut = normalizedRut;
    if (normalizedPhone) where.phone = normalizedPhone;

    const customer = await this.prisma.customer.findFirst({
      where,
      include: {
        passes: {
          where: { merchantId: dto.merchantId },
        },
      },
    });

    if (!customer || customer.passes.length === 0) {
      throw new NotFoundException(
        'No encontramos un pase asociado a los datos ingresados en este comercio.',
      );
    }

    if (normalizedRut && normalizedPhone) {
      assertSameIdentity(customer, normalizedRut, normalizedPhone);
    }

    const targetPhone = customer.phone ?? normalizedPhone;
    if (!targetPhone) {
      throw new BadRequestException(
        'El cliente no tiene un teléfono celular registrado para recibir el código de verificación.',
      );
    }

    // Rate limiting: 60s cooldown y max 5 en 15m
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const recentCodes = await this.prisma.customerVerificationCode.findMany({
      where: {
        customerId: customer.id,
        merchantId: dto.merchantId,
        createdAt: { gte: fifteenMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentCodes.length > 0) {
      const lastCode = recentCodes[0];
      const secondsSinceLast = (now.getTime() - lastCode.createdAt.getTime()) / 1000;
      if (secondsSinceLast < 60) {
        throw new HttpException(
          `Debes esperar ${Math.ceil(60 - secondsSinceLast)} segundos antes de solicitar otro código`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    if (recentCodes.length >= 5) {
      throw new HttpException(
        'Has excedido el límite de solicitudes de verificación. Intenta nuevamente en 15 minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(100000, 999999).toString();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    await this.prisma.customerVerificationCode.create({
      data: {
        customerId: customer.id,
        merchantId: dto.merchantId,
        codeHash,
        expiresAt,
      },
    });

    await this.smsService.sendDeletionCode(targetPhone, code, merchant.name);

    return {
      success: true,
      phoneMasked: maskPhone(targetPhone),
      message: 'Código de confirmación de eliminación enviado por SMS',
    };
  }

  /**
   * Verifica el código OTP y ejecuta la eliminación definitiva de datos (Ley 19.628).
   */
  async verifyDeletionCode(dto: VerifyDeletionDto): Promise<DeleteCustomerResponseDto> {
    const rawRut = dto.rut?.trim();
    const rawPhone = dto.phone?.trim();

    let normalizedRut: string | undefined;
    if (rawRut) {
      const cleaned = cleanRut(rawRut);
      if (!validateRut(cleaned)) {
        throw new BadRequestException('El RUT ingresado no es válido');
      }
      normalizedRut = cleaned;
    }

    let normalizedPhone: string | undefined;
    if (rawPhone) {
      const cleanedPhone = normalizePhone(rawPhone);
      if (!cleanedPhone) {
        throw new BadRequestException('El teléfono ingresado no es válido');
      }
      normalizedPhone = cleanedPhone;
    }

    const where: Prisma.CustomerWhereInput = {};
    if (normalizedRut) where.rut = normalizedRut;
    if (normalizedPhone) where.phone = normalizedPhone;

    const customer = await this.prisma.customer.findFirst({
      where,
      include: {
        passes: {
          where: { merchantId: dto.merchantId },
        },
      },
    });

    if (!customer || customer.passes.length === 0) {
      throw new NotFoundException(
        'No encontramos un pase asociado a los datos ingresados en este comercio.',
      );
    }

    const pass = customer.passes[0];

    const latestCode = await this.prisma.customerVerificationCode.findFirst({
      where: {
        customerId: customer.id,
        merchantId: dto.merchantId,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestCode) {
      throw new BadRequestException(
        'No hay un código de verificación activo. Por favor solicita uno nuevo.',
      );
    }

    if (new Date() > latestCode.expiresAt) {
      throw new BadRequestException('El código de verificación ha expirado.');
    }

    if (latestCode.attempts >= 3) {
      throw new BadRequestException(
        'Has superado el límite de intentos para este código. Por favor solicita uno nuevo.',
      );
    }

    const submittedHash = createHash('sha256').update(dto.code.trim()).digest('hex');
    if (submittedHash !== latestCode.codeHash) {
      await this.prisma.customerVerificationCode.update({
        where: { id: latestCode.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('El código de verificación ingresado es incorrecto.');
    }

    // Código válido -> marcar consumido y ejecutar eliminación
    await this.prisma.customerVerificationCode.update({
      where: { id: latestCode.id },
      data: { consumedAt: new Date() },
    });

    let customerCompletelyDeleted = false;

    await this.prisma.$transaction(async (tx) => {
      // Eliminar códigos
      await tx.customerVerificationCode.deleteMany({
        where: {
          customerId: customer.id,
          merchantId: dto.merchantId,
        },
      });

      // Eliminar pase
      await tx.pass.delete({
        where: { id: pass.id },
      });

      // Verificar pases restantes
      const remainingPasses = await tx.pass.count({
        where: { customerId: customer.id },
      });

      if (remainingPasses === 0) {
        await tx.customer.delete({
          where: { id: customer.id },
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
      message: 'Tus datos personales y tu tarjeta han sido eliminados de acuerdo con la Ley 19.628.',
      customerCompletelyDeleted,
    };
  }
}
