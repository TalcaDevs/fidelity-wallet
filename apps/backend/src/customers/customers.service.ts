import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CUSTOMER_NAME_MAX, isValidBirthday, type RegistrationConfig } from '@fidelity/shared';
import { Prisma, ScanMethod, ScanType, type Customer } from '@prisma/client';
import { toCardView, type CardView } from '../cards/card-program.js';
import { enabledCurrencies } from '../cards/card-balance.js';
import {
  findBrandProgram,
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

/** Reintenta con lock exclusivo sin ascender un FOR SHARE dentro de la misma transacción. */
class NewPassRequiresExclusiveLock extends Error {}

const REQUIRED_MESSAGES = {
  phone: 'Ingresa tu teléfono para obtener la tarjeta',
  email: 'Ingresa tu correo para obtener la tarjeta',
  rut: 'Ingresa tu RUT para obtener la tarjeta',
  name: 'Ingresa tu nombre para obtener la tarjeta',
  birthday: 'Ingresa tu cumpleaños para obtener la tarjeta',
} as const;

/**
 * Aplica los datos que la marca pide en el registro: lo que no pide se descarta (aunque llegue)
 * y lo obligatorio tiene que venir. Siempre queda al menos el teléfono o el correo.
 */
export function applyRegistration(
  config: RegistrationConfig,
  identity: Identity,
  profile: Profile,
): { identity: Identity; profile: Profile } {
  const kept: Identity = {};
  for (const field of IDENTITY_FIELDS) {
    if (config[field] !== 'HIDDEN' && identity[field] !== undefined) kept[field] = identity[field];
  }
  const keptProfile: Profile = {};
  if (config.name !== 'HIDDEN' && profile.name) keptProfile.name = profile.name;
  if (config.birthday !== 'HIDDEN' && profile.birthDay !== undefined) {
    keptProfile.birthDay = profile.birthDay;
    keptProfile.birthMonth = profile.birthMonth;
    if (profile.birthYear !== undefined) keptProfile.birthYear = profile.birthYear;
  }

  for (const field of IDENTITY_FIELDS) {
    if (config[field] === 'REQUIRED' && kept[field] === undefined) {
      throw new BadRequestException(REQUIRED_MESSAGES[field]);
    }
  }
  if (config.name === 'REQUIRED' && !keptProfile.name) throw new BadRequestException(REQUIRED_MESSAGES.name);
  if (config.birthday === 'REQUIRED' && keptProfile.birthDay === undefined) {
    throw new BadRequestException(REQUIRED_MESSAGES.birthday);
  }
  if (kept.phone === undefined && kept.email === undefined) {
    throw new BadRequestException('Ingresa tu teléfono o tu correo para emitir la tarjeta');
  }
  return { identity: kept, profile: keptProfile };
}

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

    const sentIdentity = this.normalizeIdentity(dto);
    const sentProfile = this.normalizeProfile(dto);

    // Prueba del consentimiento: cuándo y qué versión de los términos aceptó (Ley 19.628).
    const termsAcceptance = { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION };

    const executeTransaction = (exclusive = false) =>
      this.prisma.$transaction(async (tx) => {
        // 1. Validar que el local exista y esté operando
        const merchant = await tx.merchant.findUnique({
          where: { id: dto.merchantId },
          select: locationWithBrandSelect,
        });

        if (!merchant || !isLocationOperational(merchant)) {
          throw new NotFoundException('El comercio especificado no existe');
        }

        // El sondeo solo elige el lock: la identidad y el pase se resuelven de nuevo bajo lock.
        // Las visitas de clientes existentes no consumen cupo ni serializan toda la marca.
        const candidateProgram = await findBrandProgram(tx, merchant.brandId);
        const candidatePass = candidateProgram && !exclusive
          ? await tx.pass.findFirst({
              where: { programId: candidateProgram.id, customer: { OR: identityFilter(sentIdentity) } },
              select: { id: true },
            })
          : null;
        const requiresExclusive = exclusive || !candidatePass;
        if (requiresExclusive) {
          await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${merchant.brandId}::uuid FOR UPDATE`;
        } else {
          await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${merchant.brandId}::uuid FOR SHARE`;
        }
        const currentMerchant = await tx.merchant.findUnique({
          where: { id: dto.merchantId }, select: locationWithBrandSelect,
        });
        if (!currentMerchant || !isLocationOperational(currentMerchant)) {
          throw new NotFoundException('El comercio especificado no existe');
        }
        const lockedProgram = await findBrandProgram(tx, merchant.brandId);
        if (lockedProgram) {
          await tx.$queryRaw`SELECT id FROM "LoyaltyProgram" WHERE id = ${lockedProgram.id}::uuid FOR SHARE`;
        }
        // Un editor puede haber cambiado el programa mientras se esperaba su FOR SHARE.
        const program = await findBrandProgram(tx, merchant.brandId);
        const activePromotion = program?.isActive
          ? await tx.promotion.findFirst({ where: { programId: program.id, isActive: true, currency: { in: enabledCurrencies(toCardView(program)) } } })
          : null;

        if (!program || !activePromotion) {
          throw new BadRequestException('El comercio no tiene una promoción activa configurada');
        }

        const card = toCardView(program);
        const { identity, profile } = applyRegistration(card.registration, sentIdentity, sentProfile);

        const { customer, isNew: isNewCustomer } = await this.resolveCustomer(
          tx, identity, profile, termsAcceptance,
        );

        // Un cliente que ya tiene la tarjeta siempre puede volver a entrar; solo las altas nuevas
        // cuentan contra el límite de clientes del plan.
        const existingPass = await tx.pass.findFirst({
          where: { programId: program.id, customerId: customer.id },
          select: { id: true },
        });
        if (!existingPass) {
          if (!requiresExclusive) throw new NewPassRequiresExclusiveLock();
          if (card.validity.type === 'FIXED_DATE' && card.validity.expiresAt && new Date(card.validity.expiresAt) <= new Date()) {
            throw new BadRequestException('Este programa de fidelidad ya terminó: no se entregan tarjetas nuevas');
          }
          await assertPlanAllows(tx, merchant.brandId, 'customers', {
            publicMessage: 'Este local no puede registrar nuevos clientes por ahora. Consulta en caja.',
          });
        }

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
          await this.grantWelcomeBalance(tx, card, pass.id, merchant.id, merchant.brandId);
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
      if (err instanceof NewPassRequiresExclusiveLock) return await executeTransaction(true);
      // En caso de condición de carrera concurrente (P2002: unique constraint violation),
      // en PostgreSQL la transacción interactiva queda abortada. Reintentamos la transacción
      // completa una vez: en el reintento, findUnique encontrará el registro ya creado por la
      // otra llamada concurrente.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return await executeTransaction(true);
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

    const program = await findBrandProgram(this.prisma, merchant.brandId);
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

    const passId = pass.id;
    let customerCompletelyDeleted = false;

    await this.prisma.$transaction(async (tx) => {
      // Eliminar pase (la cascada en BD elimina Scans y Stamps)
      await tx.pass.delete({
        where: {
          id: passId,
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

    // Inactivar el pase en Google Wallet (state: INACTIVE)
    await this.passesService.deactivatePass(passId);

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
      include: {
        passes: { select: { id: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const passIds = customer.passes.map((p) => p.id);

    await this.prisma.customer.delete({
      where: { id: customerId },
    });

    // Inactivar todos los pases del cliente en Google Wallet
    await Promise.allSettled(
      passIds.map((passId) => this.passesService.deactivatePass(passId)),
    );

    return {
      success: true,
      message: 'Cliente y todos sus pases eliminados exitosamente',
      customerCompletelyDeleted: true,
    };
  }

  /**
   * Sellos o puntos de regalo al obtener la tarjeta. Queda como un movimiento WELCOME del
   * historial, sin usuario: no lo registró nadie del local.
   */
  private async grantWelcomeBalance(
    tx: Prisma.TransactionClient,
    card: CardView,
    passId: string,
    merchantId: string,
    brandId: string,
  ): Promise<void> {
    const stamps = card.stampsEnabled ? card.welcomeStamps : 0;
    const points = card.pointsEnabled ? card.welcomePoints : 0;
    if (stamps <= 0 && points <= 0) return;
    const now = new Date();
    const expiresAt = card.stampValidityDays
      ? new Date(now.getTime() + card.stampValidityDays * 24 * 60 * 60 * 1000)
      : null;
    const scan = await tx.scan.create({
      data: {
        passId,
        merchantId,
        brandId,
        programId: card.programId,
        type: ScanType.STAMP_ADDED,
        method: ScanMethod.WELCOME,
        stampCount: stamps,
        pointsEarned: points,
      },
    });
    await tx.stamp.createMany({
      data: [
        ...(stamps > 0 ? [{ currency: 'STAMPS' as const, amount: stamps }] : []),
        ...(points > 0 ? [{ currency: 'POINTS' as const, amount: points }] : []),
      ].map((balance) => ({
        ...balance,
        passId,
        merchantId,
        brandId,
        programId: card.programId,
        sourceScanId: scan.id,
        earnedAt: now,
        expiresAt,
      })),
    });
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
