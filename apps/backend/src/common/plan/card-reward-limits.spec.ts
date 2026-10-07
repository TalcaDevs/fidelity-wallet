import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { activeRewardCount, cardRewardLimits, cardRewardPlanLimit, validateCardRewardLimits } from './card-reward-limits.js';

const config = (values: Record<string, unknown> = {}) => Object.assign(new ConfigService(values), { skipProcessEnv: true });

describe('límites de recompensas por plan y entorno', () => {
  it.each([
    ['TRIAL', 3], ['STARTER', 3], ['PRO', 5], ['BUSINESS', 10],
  ] as const)('usa el valor de catálogo %s=%i sin override', (planId, expected) => {
    expect(cardRewardPlanLimit(config(), planId)).toBe(expected);
  });

  it.each([1, 20, ' 5 '])('acepta el override entero %j dentro del rango', (value) => {
    const settings = config({ CARD_REWARDS_LIMIT_PRO: value });
    expect(cardRewardPlanLimit(settings, 'PRO')).toBe(Number(value));
    expect(cardRewardPlanLimit(settings, 'TRIAL')).toBe(3);
  });

  it.each(['', '   '])('una variable vacía %j mantiene el límite del catálogo', (value) => {
    expect(cardRewardPlanLimit(config({ CARD_REWARDS_LIMIT_PRO: value }), 'PRO')).toBe(5);
  });

  it.each([0, -1, 21, 3.5, Infinity, NaN, '3.0', '1e1', 'abc', null, false, {}])('rechaza explícitamente el override inválido %j', (value) => {
    expect(() => cardRewardPlanLimit(config({ CARD_REWARDS_LIMIT_PRO: value }), 'PRO'))
      .toThrow('CARD_REWARDS_LIMIT_PRO debe ser un entero entre 1 y 20');
  });

  it('valida todas las variables al iniciar, incluidos los planes sin uso', () => {
    expect(() => validateCardRewardLimits(config({ CARD_REWARDS_LIMIT_BUSINESS: 'invalid' })))
      .toThrow('CARD_REWARDS_LIMIT_BUSINESS');
  });

  it('conserva el cupo actual tras bajar de plan y lo reduce cuando baja el uso', () => {
    expect(cardRewardLimits(config(), 'TRIAL', 5)).toEqual({ rewardPlanLimit: 3, rewardLimit: 5, rewardUsage: 5 });
    expect(cardRewardLimits(config(), 'TRIAL', 4).rewardLimit).toBe(4);
    expect(cardRewardLimits(config(), 'TRIAL', 2).rewardLimit).toBe(3);
  });

  it('cuenta ambas monedas habilitadas y excluye modalidades ocultas e inactivos', () => {
    const rewards = [
      { currency: 'STAMPS' as const, isActive: true },
      { currency: 'POINTS' as const, isActive: true },
      { currency: 'POINTS' as const, isActive: false },
    ];
    expect(activeRewardCount(rewards, { stampsEnabled: true, pointsEnabled: true })).toBe(2);
    expect(activeRewardCount(rewards, { stampsEnabled: true, pointsEnabled: false })).toBe(1);
    expect(activeRewardCount(rewards, { stampsEnabled: false, pointsEnabled: true })).toBe(1);
  });
});
