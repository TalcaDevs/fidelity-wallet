import type { ConfigService } from '@nestjs/config';
import { CATALOG_PLANS, getPlan, type PlanId } from '@fidelity/shared';
import { enabledCurrencies, type CardModalities } from '../../cards/card-balance.js';

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
  const currencies = enabledCurrencies(modalities);
  return rewards.filter((reward) => reward.isActive && currencies.includes(reward.currency)).length;
}

/** Las tiendas sobre el cupo conservan sus premios y pueden reducirlos, sin seguir creciendo. */
export function cardRewardLimits(config: Pick<ConfigService, 'get'>, planId: PlanId, usage: number) {
  const rewardPlanLimit = cardRewardPlanLimit(config, planId);
  return { rewardPlanLimit, rewardLimit: Math.max(rewardPlanLimit, usage), rewardUsage: usage };
}
