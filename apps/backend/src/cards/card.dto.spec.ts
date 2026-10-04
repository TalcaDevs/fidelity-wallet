import 'reflect-metadata';
import {
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_DETAILS,
  DEFAULT_REGISTRATION,
  cardConfigProblems,
  type CardConfig,
} from '@fidelity/shared';
import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CardRewardDto, CardValidityDto, SaveCardDto } from './card.dto.js';

const body = () => ({
  type: 'STAMPS',
  name: 'Tarjeta Café',
  rewards: [{ name: 'Café gratis', target: 10 }],
  welcomeBalance: 0,
  dailyStampLimit: true,
  stampValidityDays: null,
  validity: { type: 'UNLIMITED', expiresAt: null, days: null },
  registration: DEFAULT_REGISTRATION,
  design: DEFAULT_CARD_DESIGN,
  details: DEFAULT_CARD_DETAILS,
});

function errorPaths(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    return [
      ...(error.constraints ? [path] : []),
      ...errorPaths(error.children ?? [], path),
    ];
  });
}

describe('card DTO numeric limits', () => {
  it.each([0, -1, 1.5])('rejects a reward cost of %s', (target) => {
    const reward = plainToInstance(CardRewardDto, {
      name: 'Café gratis',
      target,
    });
    expect(errorPaths(validateSync(reward))).toEqual(['target']);
  });

  it.each([1, 10])('accepts a positive integer reward cost of %s', (target) => {
    expect(
      validateSync(
        plainToInstance(CardRewardDto, { name: 'Café gratis', target }),
      ),
    ).toEqual([]);
  });

  it.each([0, -1, 1.5])('rejects a validity duration of %s', (days) => {
    const validity = plainToInstance(CardValidityDto, {
      type: 'AFTER_JOIN',
      expiresAt: null,
      days,
    });
    expect(errorPaths(validateSync(validity))).toEqual(['days']);
  });

  it('accepts a positive integer validity duration', () => {
    const validity = plainToInstance(CardValidityDto, {
      type: 'AFTER_JOIN',
      expiresAt: null,
      days: 1,
    });
    expect(validateSync(validity)).toEqual([]);
  });

  it.each([null, undefined])(
    'keeps unlimited validity days optional (%s)',
    (days) => {
      const validity = plainToInstance(CardValidityDto, {
        type: 'UNLIMITED',
        expiresAt: null,
        days,
      });
      expect(validateSync(validity)).toEqual([]);
    },
  );

  it('validates nested rewards and validity in the save request', () => {
    const dto = plainToInstance(SaveCardDto, {
      ...body(),
      rewards: [{ name: 'Café gratis', target: 0 }],
      welcomeBalance: -1,
      stampValidityDays: 0,
      validity: { type: 'AFTER_JOIN', expiresAt: null, days: -1 },
    });
    expect(dto.rewards[0]).toBeInstanceOf(CardRewardDto);
    expect(dto.validity).toBeInstanceOf(CardValidityDto);
    expect(errorPaths(validateSync(dto))).toEqual([
      'rewards.0.target',
      'welcomeBalance',
      'stampValidityDays',
      'validity.days',
    ]);
  });

  it.each([null, undefined, 1])(
    'accepts zero welcome balance and stamp validity %s',
    (stampValidityDays) => {
      const dto = plainToInstance(SaveCardDto, {
        ...body(),
        stampValidityDays,
      });
      expect(validateSync(dto)).toEqual([]);
    },
  );

  it('rejects fractional welcome balances and stamp validity durations', () => {
    const dto = plainToInstance(SaveCardDto, {
      ...body(),
      welcomeBalance: 0.5,
      stampValidityDays: 1.5,
    });
    expect(errorPaths(validateSync(dto))).toEqual([
      'welcomeBalance',
      'stampValidityDays',
    ]);
  });

  it('keeps missing AFTER_JOIN days invalid at the business-rule layer', () => {
    const dto = plainToInstance(SaveCardDto, {
      ...body(),
      validity: { type: 'AFTER_JOIN', expiresAt: null, days: null },
    });
    expect(validateSync(dto)).toEqual([]);
    expect(
      cardConfigProblems(dto as unknown as CardConfig, {
        pointsEnabled: false,
      }),
    ).toEqual(['Indica cuántos días dura la tarjeta después de obtenerla']);
  });
});
