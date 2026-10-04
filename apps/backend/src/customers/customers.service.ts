import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CUSTOMER_NAME_MAX, isValidBirthday } from '@fidelity/shared';
import { Prisma, type Customer } from '@prisma/client';
import {
  findStampsProgram,
  isLocationOperational,
  locationWithBrandSelect,
  resolveLocationAccess,
} from '../common/access/brand-access.js';
import { assertPlanAllows } from '../common/plan/plan-limits.js';
import { normalizeEmail } from '../common/utils/email.util.js';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, CustomerResponseDto } from './dto/create-customer.dto.js';
import { DeleteCustomerResponseDto } from './dto/deletion.dto.js';
import { TERMS_VERSION } from './terms.js';

// Mismo mensaje para todo cruce de identidad: no revela cuál de los datos ya existe.
const IDENTITY_MISMATCH_MESSAGE =
  'Los datos proporcionados no coinciden o no son válidos para emitir el pase.';

type IdentityField = 'rut' | 'phone' | 'email';

/** Identificadores normalizados del alta: RUT opcional y al menos teléfono o correo. */
type Identity = Partial<Record<IdentityField, string>>;

interface Profile {
  name?: string;
  birthDay?: number;
  birthMonth?: number;
  birthYear?: number;
}

const IDENTITY_FIELDS: IdentityField[] = ['rut', 'phone', 'email'];

/**
 * El cliente encontrado debe tener exactamente los identificadores enviados.
 *
 * Un dato que el cliente no tenía (un cliente antiguo sin teléfono, o uno que se registró solo
 * con correo) NO se completa con lo que llega: sin verificación (OTP), eso permitiría adjuntar
 * el teléfono o el correo de un tercero a la ficha de otra persona y luego resolver su pase en
 * caja con ese dato. Mientras no exista la verificación, basta con que coincida lo que sí tiene.
 */
function assertSameIdentity(customer: Pick<Customer, IdentityField>, identity: Identity): void {
  for (const field of IDENTITY_FIELDS) {
    const sent = identity[field];
    if (sent !== undefined && customer[field] !== null && customer[field] !== sent) {
      throw new BadRequestException(IDENTITY_MISMATCH_MESSAGE);
    }
  }
}

/** Nombre y cumpleaños solo se completan si estaban vacíos: nunca se pisan desde un alta pública. */
function missingProfile(customer: Customer, profile: Profile): Profile {
  const fill: Profile = {};
  if (!customer.name && profile.name) fill.name = profile.name;
  if (customer.birthDay === null && profile.birthDay !== undefined) {
    fill.birthDay = profile.birthDay;
    fill.birthMonth = profile.birthMonth;
    fill.birthYear = profile.birthYear;
  }
  return fill;
}

function uniqueWhere(field: IdentityField, value: string): Prisma.CustomerWhereUniqueInput {
  switch (field) {
    case 'rut':
      return { rut: value };
    case 'phone':
      return { phone: value };
    case 'email':
      return { email: value };
  }
}

function identityFilter(identity: Identity): Prisma.CustomerWhereInput[] {
  return IDENTITY_FIELDS.flatMap((f) => {
    const value = identity[f];
    return value === undefined ? [] : [uniqueWhere(f, value)];
  });
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passesService: PassesService,
  ) {}

  async createOrFindCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    // El DTO ya valida la forma; se repite acá porque este servicio también se llama sin HTTP.
    if (dto.acceptedTerms !== true) {
      throw new BadRequestException(
        'Debes aceptar los términos y condiciones para obtener tu tarjeta',
      );
    }

    const identity = this.normalizeIdentity(dto);
    const profile = this.normalizeProfile(dto);

    // Prueba del consentimiento: cuándo y qué versión de los términos aceptó (Ley 19.628).
    const termsAcceptance = { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION };

    const executeTransaction = () =>
      this.prisma.$transaction(async (tx) => {
        // 1. Validar que el local exista y esté operando
        const merchant = await tx.merchant.findUnique({
          where: { id: dto.merchantId },
          select: locationWithBrandSelect,
        });

        if (!merchant || !isLocationOperational(merchant)) {
          throw new NotFoundException('El comercio especificado no existe');
        }

        const program = await findStampsProgram(tx, merchant.brandId);
        const activePromotion = program?.isActive
          ? await tx.promotion.findFirst({ where: { programId: program.id, isActive: true } })
          : null;

        if (!program || !activePromotion) {
          throw new BadRequestException('El comercio no tiene una promoción activa configurada');
        }

        // Un cliente que ya tiene la tarjeta siempre puede volver a entrar; solo las altas nuevas
        // cuentan contra el límite de clientes del plan.
        const existingPass = await tx.pass.findFirst({
          where: { programId: program.id, customer: { OR: identityFilter(identity) } },
          select: { id: true },
        });
        if (!existingPass) {
          await assertPlanAllows(tx, merchant.brandId, 'customers', {
            publicMessage: 'Este local no puede registrar nuevos clientes por ahora. Consulta en caja.',
          });
        }

        // 2. Buscar o crear cliente (resolución de identidad y términos)
        const { customer, isNew: isNewCustomer } = await this.resolveCustomer(
          tx,
          identity,
          profile,
          termsAcceptance,
        );

        // 3. Buscar o crear el Pase (tarjeta) del programa de la marca
        const { pass, isNew: isNewPass } = await this.passesService.findOrCreatePass(
          customer.id,
          { programId: program.id, merchantId: merchant.id, brandId: merchant.brandId },
          tx,
        );

        // 4. Emitir credenciales de billetera solo cuando el pase se crea por primera vez en esta llamada.
        // Si el pase ya existía, no se devuelven credenciales para evitar suplantación de identidad por RUT.
        let walletUrls: { appleWalletUrl: string; googleWalletUrl: string } | null = null;
        if (isNewPass) {
          walletUrls = await this.issueWalletUrls(tx, pass.id);
        }

        return {
          customerId: customer.id,
          passId: pass.id,
          isNew: isNewCustomer || isNewPass,
          ...(walletUrls ?? {}),
        };
      });

    try {
      return await executeTransaction();
    } catch (err: unknown) {
      // En caso de condición de carrera concurrente (P2002: unique constraint violation),
      // en PostgreSQL la transacción interactiva queda abortada. Reintentamos la transacción
      // completa una vez: en el reintento, findUnique encontrará el registro ya creado por la
      // otra llamada concurrente.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return await executeTransaction();
      }
      throw err;
    }
  }



  /**
   * Elimina un cliente y su pase en la marca del local indicado (Ley 19.628).
   * Solo el OWNER de la marca puede ejecutar esta acción.
   * Si el cliente no tiene más pases en otras marcas, el registro Customer
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

    const { merchant } = await resolveLocationAccess(this.prisma, callerUserId, merchantId, {
      ownerOnly: true,
      // Derecho de cancelación (Ley 19.628): se ejerce aunque la marca esté suspendida.
      requireOperational: false,
      forbiddenMessage: 'Solo el dueño del comercio puede eliminar clientes',
      ownerMessage: 'Solo el dueño del comercio puede eliminar clientes',
    });

    const program = await findStampsProgram(this.prisma, merchant.brandId);
    const pass = program
      ? await this.prisma.pass.findUnique({
          where: {
            customerId_programId: {
              customerId,
              programId: program.id,
            },
          },
        })
      : null;

    if (!pass) {
      throw new NotFoundException('Cliente o pase no encontrado en este comercio');
    }

    let customerCompletelyDeleted = false;

    await this.prisma.$transaction(async (tx) => {
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

    return {
      success: true,
      message: 'Datos y pase del cliente eliminados exitosamente de este comercio',
      customerCompletelyDeleted,
    };
  }

  /**
   * Elimina completamente a un cliente y todos sus pases, sellos e historial (Ley 19.628).
   * Uso administrativo / soporte legal ante solicitudes directas por correo (soporte@...).
   * No está expuesto en la API pública: reservado para scripts o comandos internos con service_role.
   */
  async deleteCustomerGlobal(customerId: string): Promise<DeleteCustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    await this.prisma.customer.delete({
      where: { id: customerId },
    });

    return {
      success: true,
      message: 'Cliente y todos sus pases eliminados exitosamente',
      customerCompletelyDeleted: true,
    };
  }

  /** RUT opcional y al menos teléfono o correo, ya normalizados. */
  private normalizeIdentity(dto: CreateCustomerDto): Identity {
    const rawRut = dto.rut?.trim();
    const rawPhone = dto.phone?.trim();
    const rawEmail = dto.email?.trim();

    if (!rawPhone && !rawEmail) {
      throw new BadRequestException('Ingresa tu teléfono o tu correo para emitir la tarjeta');
    }

    const identity: Identity = {};

    if (rawRut) {
      if (!validateRut(rawRut)) {
        throw new BadRequestException('El RUT ingresado no es válido');
      }
      identity.rut = cleanRut(rawRut);
    }

    if (rawPhone) {
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        throw new BadRequestException(
          `Formato de teléfono chileno inválido: "${rawPhone}". Se espera formato +569XXXXXXXX o 9XXXXXXXX.`,
        );
      }
      identity.phone = phone;
    }

    if (rawEmail) {
      const email = normalizeEmail(rawEmail);
      if (!email) {
        throw new BadRequestException('El correo ingresado no es válido');
      }
      identity.email = email;
    }

    return identity;
  }

  private normalizeProfile(dto: CreateCustomerDto): Profile {
    const profile: Profile = {};

    const name = dto.name?.trim().replace(/\s+/g, ' ');
    if (name) {
      if (name.length > CUSTOMER_NAME_MAX) {
        throw new BadRequestException(
          `El nombre no puede superar los ${CUSTOMER_NAME_MAX} caracteres`,
        );
      }
      profile.name = name;
    }

    const hasDay = dto.birthDay !== undefined && dto.birthDay !== null;
    const hasMonth = dto.birthMonth !== undefined && dto.birthMonth !== null;
    const hasYear = dto.birthYear !== undefined && dto.birthYear !== null;
    if (hasDay || hasMonth || hasYear) {
      if (!hasDay || !hasMonth) {
        throw new BadRequestException('Indica el día y el mes de tu cumpleaños');
      }
      const birthday = { day: dto.birthDay!, month: dto.birthMonth!, year: dto.birthYear };
      if (!isValidBirthday(birthday)) {
        throw new BadRequestException('La fecha de cumpleaños no es válida');
      }
      profile.birthDay = birthday.day;
      profile.birthMonth = birthday.month;
      if (hasYear) profile.birthYear = dto.birthYear;
    }

    return profile;
  }

  /**
   * Resuelve de forma segura y atómica la entidad Customer dentro de la transacción: todos los
   * identificadores enviados deben apuntar al mismo cliente.
   */
  private async resolveCustomer(
    tx: Prisma.TransactionClient,
    identity: Identity,
    profile: Profile,
    termsAcceptance: { termsAcceptedAt: Date; termsVersion: string },
  ): Promise<{ customer: Customer; isNew: boolean }> {
    // Una sola consulta por todos los identificadores: si apuntan a clientes distintos, no se mezclan.
    const found = await tx.customer.findMany({ where: { OR: identityFilter(identity) } });

    if (new Set(found.map((c) => c.id)).size > 1) {
      throw new BadRequestException(IDENTITY_MISMATCH_MESSAGE);
    }

    const existing = found[0];
    if (!existing) {
      const customer = await tx.customer.create({
        data: { ...identity, ...profile, ...termsAcceptance },
      });
      return { customer, isNew: true };
    }

    assertSameIdentity(existing, identity);

    const changes = {
      ...missingProfile(existing, profile),
      ...(existing.termsVersion !== TERMS_VERSION ? termsAcceptance : {}),
    };
    if (Object.keys(changes).length === 0) {
      return { customer: existing, isNew: false };
    }

    const customer = await tx.customer.update({
      where: { id: existing.id },
      data: changes,
    });
    return { customer, isNew: false };
  }

  /**
   * Genera las URLs criptográficas para Apple Wallet y Google Wallet.
   * Si la generación falla o resulta nula, aborta la transacción con una excepción controlada.
   */
  private async issueWalletUrls(
    tx: Prisma.TransactionClient,
    passId: string,
  ): Promise<{ appleWalletUrl: string; googleWalletUrl: string }> {
    try {
      const walletUrls = await this.passesService.getWalletUrlsForPass(passId, tx);
      if (!walletUrls) {
        throw new InternalServerErrorException(
          'Error al generar las credenciales de la tarjeta digital',
        );
      }
      return walletUrls;
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Error al generar las credenciales de la tarjeta digital',
        { cause: err },
      );
    }
  }
}
