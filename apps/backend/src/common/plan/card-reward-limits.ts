import type { ConfigService } from '@nestjs/config';
import {
  CARD_REWARDS_STORAGE_MAX,
  CATALOG_PLANS,
  getPlan,
  isRewardEnabled,
  type CardModalities,
  type CardReward,
  type CardType,
  type PlanId,
} from '@fidelity/shared';

/** Los límites de configuración son independientes del transporte de recompensas ocultas. */
export function cardRewardPlanLimit(config: Pick<ConfigService, 'get'>, planId: PlanId): number {
  const key = `CARD_REWARDS_LIMIT_${planId}`;
  const raw = config.get<unknown>(key);
  if (raw === undefined || (typeof raw === 'string' && raw.trim() === '')) return getPlan(planId).limits.rewards;
  const limit = typeof raw === 'number'
    ? raw
    : typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error(`${key} debe ser un entero entre 1 y 20`);
  }
  return limit;
}

/** Falla al iniciar si alguna variable está mal definida, aunque ese plan aún no tenga marcas. */
export function validateCardRewardLimits(config: Pick<ConfigService, 'get'>): void {
  for (const plan of CATALOG_PLANS) cardRewardPlanLimit(config, plan.id);
}

export function activeRewardCount(
  rewards: readonly { isActive: boolean; currency: 'STAMPS' | 'POINTS' }[],
  modalities: CardModalities,
): number {
  return rewards.filter((reward) => reward.isActive && isRewardEnabled(reward, modalities)).length;
}

export interface StoredCardReward {
  id: string;
  isActive: boolean;
  currency: CardType;
}

/** Política pura: conservar moneda y premios ocultos, y calcular el cupo del guardado. */
export function cardRewardPolicy({
  existing,
  requested,
  currentModalities,
  requestedModalities,
  planLimit,
}: {
  existing: readonly StoredCardReward[];
  requested: readonly CardReward[];
  currentModalities: CardModalities;
  requestedModalities: CardModalities;
  planLimit: number;
}) {
  const problems: string[] = [];
  const byId = new Map(existing.map((reward) => [reward.id, reward]));
  const suppliedIds = new Set<string>();
  const rewards = requested.map((reward) => {
    if (reward.id) {
      if (suppliedIds.has(reward.id)) problems.push('Una de las recompensas está repetida');
      suppliedIds.add(reward.id);
    }
    const stored = reward.id ? byId.get(reward.id) : undefined;
    if (reward.id && !stored) problems.push('Una de las recompensas no pertenece a tu tarjeta');
    if (stored && reward.currency !== undefined && reward.currency !== stored.currency) {
      problems.push(`La moneda de "${reward.name}" no se puede cambiar: crea una recompensa nueva`);
    }
    // Solo las recompensas nuevas reciben la moneda por defecto de la modalidad elegida.
    const defaultCurrency = requestedModalities.pointsEnabled && !requestedModalities.stampsEnabled
      ? 'POINTS' : 'STAMPS';
    return { ...reward, currency: stored?.currency ?? (reward.currency === undefined ? defaultCurrency : reward.currency) };
  });
  const rewardUsage = activeRewardCount(existing, currentModalities);
  const rewardLimit = Math.max(planLimit, rewardUsage);
  const requestedUsage = rewards.filter((reward) => isRewardEnabled(reward, requestedModalities)).length;
  const omitted = existing.filter((reward) => reward.isActive && !suppliedIds.has(reward.id));
  const removedRewards = omitted.filter((reward) => isRewardEnabled(reward, requestedModalities));
  const hiddenRewards = omitted.filter((reward) => !isRewardEnabled(reward, requestedModalities));
  if (rewards.length + hiddenRewards.length > CARD_REWARDS_STORAGE_MAX) {
    problems.push(`Puedes conservar hasta ${CARD_REWARDS_STORAGE_MAX} recompensas entre ambas modalidades`);
  }
  return { rewards, removedRewards, problems, rewardUsage, rewardLimit, rewardPlanLimit: planLimit, requestedUsage };
}

/** Las tiendas sobre el cupo conservan sus premios y pueden reducirlos, sin seguir creciendo. */
export function cardRewardLimits(config: Pick<ConfigService, 'get'>, planId: PlanId, usage: number) {
  const rewardPlanLimit = cardRewardPlanLimit(config, planId);
  return { rewardPlanLimit, rewardLimit: Math.max(rewardPlanLimit, usage), rewardUsage: usage };
}
