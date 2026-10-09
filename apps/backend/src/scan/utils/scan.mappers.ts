import { DEFAULT_OWNER_MAX_STAMPS, firstName } from '@fidelity/shared';
import type { Customer, Prisma, Promotion, Stamp } from '@prisma/client';
import { maskEmail, maskPhone, maskRut } from '../../common/utils/mask.util.js';
import type { MaskedCustomerDto, PromotionOptionDto } from '../dto/scan-action.dto.js';
import { DEFAULT_STAMP_COOLDOWN_MINUTES } from '../scan.constants.js';

/**
 * Convierte STAMP_COOLDOWN_MINUTES a milisegundos. Función pura: sin valor por defecto
 * tomado del entorno, para que el resultado dependa solo del argumento (y los tests no
 * cambien según el .env de quien los corre). Vacío, inválido o negativo → 30 min; 0 lo desactiva.
 */
export function resolveStampCooldownMs(raw: string | undefined): number {
  const minutes = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  const safeMinutes =
    Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_STAMP_COOLDOWN_MINUTES;
  return safeMinutes * 60 * 1000;
}

/** OWNER_MAX_STAMPS_PER_LOAD: entero positivo; vacío o inválido → 10. */
export function resolveOwnerMaxStamps(raw: string | undefined): number {
  const value = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : DEFAULT_OWNER_MAX_STAMPS;
}

/** Sellos que cuentan en el saldo: no consumidos y no vencidos, de cualquier promoción. */
export const activeStampsWhere = (passId: string, now: Date) => ({
  passId,
  consumedAt: null,
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

/** Promociones activas del comercio con la indicación de si el saldo alcanza para cada una. */
export const toPromotionOptions = (
  promotions: Promotion[],
  activeStamps: number,
  activePoints: number,
): PromotionOptionDto[] =>
  promotions.map((p) => ({
    id: p.id,
    name: p.name,
    rewardName: p.rewardName,
    targetStamps: p.targetStamps,
    currency: p.currency,
    canRedeem: p.currency === 'POINTS' ? activePoints >= p.targetStamps : activeStamps >= p.targetStamps,
  }));

/** Lo que ve la caja: el primer nombre y los identificadores enmascarados, nunca el id interno. */
export function toCashierCustomer(customer: Customer | null): MaskedCustomerDto | undefined {
  if (!customer) return undefined;
  return {
    firstName: firstName(customer.name),
    rut: customer.rut ? maskRut(customer.rut) : null,
    phone: customer.phone ? maskPhone(customer.phone) : null,
    email: customer.email ? maskEmail(customer.email) : null,
  };
}

export function calculateFifoConsumption(
  activeStampsList: Stamp[],
  targetStamps: number,
): {
  stampsToUpdate: string[];
  newStampsToCreate: Prisma.StampCreateManyInput[];
  partialConsumption?: { id: string; amount: number };
} {
  let remainingToConsume = targetStamps;
  let partialConsumption: { id: string; amount: number } | undefined;
  const stampsToUpdate: string[] = [];
  const newStampsToCreate: Prisma.StampCreateManyInput[] = [];

  for (const stamp of activeStampsList) {
    if (remainingToConsume <= 0) break;

    if (stamp.amount <= remainingToConsume) {
      stampsToUpdate.push(stamp.id);
      remainingToConsume -= stamp.amount;
    } else {
      stampsToUpdate.push(stamp.id);
      const remainingAmount = stamp.amount - remainingToConsume;
      partialConsumption = { id: stamp.id, amount: remainingToConsume };
      newStampsToCreate.push({
        passId: stamp.passId,
        merchantId: stamp.merchantId,
        brandId: stamp.brandId,
        programId: stamp.programId,
        sourceScanId: stamp.sourceScanId,
        createdByUserId: stamp.createdByUserId,
        earnedAt: stamp.earnedAt,
        expiresAt: stamp.expiresAt,
        currency: stamp.currency,
        amount: remainingAmount,
      });
      remainingToConsume = 0;
    }
  }

  return { stampsToUpdate, newStampsToCreate, partialConsumption };
}
