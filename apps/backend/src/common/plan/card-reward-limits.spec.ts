import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { CardModalities, CardReward } from '@fidelity/shared';
import { activeRewardCount, cardRewardLimits, cardRewardPlanLimit, cardRewardPolicy, validateCardRewardLimits, type StoredCardReward } from './card-reward-limits.js';

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

describe('política de conservación y capacidad de recompensas', () => {
  const stamps = { stampsEnabled: true, pointsEnabled: false };
  const points = { stampsEnabled: false, pointsEnabled: true };
  const existing: StoredCardReward[] = [
    { id: 'stamps', currency: 'STAMPS', isActive: true },
    { id: 'points', currency: 'POINTS', isActive: true },
    { id: 'inactive', currency: 'STAMPS', isActive: false },
  ];
  const decide = (requested: CardReward[], requestedModalities: CardModalities = stamps, stored = existing, planLimit = 3) =>
    cardRewardPolicy({ existing: stored, requested, currentModalities: stamps, requestedModalities, planLimit });

  it('conserva la moneda existente sin inferirla de la nueva modalidad, y asigna default solo a nuevos', () => {
    const result = decide([
      { id: 'stamps', name: 'Café', target: 10 },
      { name: 'Postre', target: 500 },
    ], points);
    expect(result.problems).toEqual([]);
    expect(result.rewards.map((reward) => reward.currency)).toEqual(['STAMPS', 'POINTS']);
    expect(result.requestedUsage).toBe(1);
    expect(result.removedRewards).toEqual([existing[1]]);
  });

  it('rechaza ids ajenos y cambios explícitos de moneda, incluso de premios ocultos', () => {
    expect(decide([{ id: 'foreign', name: 'Ajeno', target: 3 }]).problems).toEqual(['Una de las recompensas no pertenece a tu tarjeta']);
    expect(decide([{ id: 'points', name: 'Postre', target: 10, currency: 'STAMPS' }]).problems[0]).toMatch(/moneda/);
  });

  it('rechaza un mismo id repetido para no actualizar ni contar dos veces un premio', () => {
    expect(decide([
      { id: 'stamps', name: 'Café', target: 3 },
      { id: 'stamps', name: 'Otro nombre', target: 5 },
    ]).problems).toEqual(['Una de las recompensas está repetida']);
  });

  it('preserva los omitidos ocultos y solo retira los activos de la modalidad habilitada', () => {
    expect(decide([{ name: 'Nuevo', target: 3 }]).removedRewards).toEqual([existing[0]]);
    expect(decide([{ name: 'Nuevo', target: 500 }], points).removedRewards).toEqual([existing[1]]);
  });

  it('el cupo previo no cuenta ocultos ni inactivos y activar ambas modalidades suma premios', () => {
    const result = decide([
      { id: 'stamps', name: 'Café', target: 3 },
      { id: 'points', name: 'Postre', target: 500 },
    ], { stampsEnabled: true, pointsEnabled: true });
    expect(result).toMatchObject({ rewardUsage: 1, rewardPlanLimit: 3, rewardLimit: 3, requestedUsage: 2 });
  });

  it('mantiene el cupo heredado y lo reduce según el uso actual sin permitir aumentos', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ id: `old-${i}`, isActive: true, currency: 'STAMPS' as const }));
    expect(decide([], stamps, five).rewardLimit).toBe(5);
    expect(decide([], stamps, five.slice(0, 4)).rewardLimit).toBe(4);
    expect(decide([], stamps, five.slice(0, 2)).rewardLimit).toBe(3);
  });

  it('incluye premios ocultos conservados al validar el límite físico', () => {
    const hidden = Array.from({ length: 40 }, (_, i) => ({ id: `hidden-${i}`, isActive: true, currency: 'POINTS' as const }));
    expect(decide([{ name: 'Nuevo', target: 3 }], stamps, hidden).problems)
      .toEqual(['Puedes conservar hasta 40 recompensas entre ambas modalidades']);
    expect(decide([{ id: 'hidden-0', name: 'Puntos', target: 500 }], stamps, hidden).problems).toEqual([]);
  });
});
