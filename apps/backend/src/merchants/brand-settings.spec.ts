import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  BrandSettingsService,
  UpdateBrandSettingsDto,
} from './brand-settings.js';

function setup({ role = 'OWNER', status = 'ACTIVE' } = {}) {
  const prisma = {
    brandMember: { findUnique: vi.fn().mockResolvedValue({ role }) },
    brand: {
      findUnique: vi.fn().mockResolvedValue({ status }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        name: 'Café Demo',
        programs: [{ stampValidityDays: 90 }],
      }),
      update: vi.fn().mockReturnValue('brand.update'),
    },
    loyaltyProgram: {
      updateMany: vi.fn().mockReturnValue('program.updateMany'),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return {
    prisma,
    service: new BrandSettingsService(prisma as unknown as PrismaService),
  };
}

describe('BrandSettingsService', () => {
  it('returns the brand name and the stamps program validity', async () => {
    const { service } = setup();
    await expect(service.get('b-1', 'u-1')).resolves.toEqual({
      name: 'Café Demo',
      stampValidityDays: 90,
    });
  });

  it('saves name and validity in a single transaction', async () => {
    const { service, prisma } = setup();
    await service.update('b-1', 'u-1', {
      name: 'Café Nuevo',
      stampValidityDays: null,
    });

    expect(prisma.$transaction).toHaveBeenCalledWith([
      'brand.update',
      'program.updateMany',
    ]);
    expect(prisma.brand.update).toHaveBeenCalledWith({
      where: { id: 'b-1' },
      data: { name: 'Café Nuevo' },
    });
    expect(prisma.loyaltyProgram.updateMany).toHaveBeenCalledWith({
      where: { brandId: 'b-1', type: 'STAMPS' },
      data: { stampValidityDays: null },
    });
  });

  it('only touches what was sent', async () => {
    const { service, prisma } = setup();
    await service.update('b-1', 'u-1', { stampValidityDays: 30 });
    expect(prisma.brand.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(['program.updateMany']);
  });

  it.each([
    ['STAFF', 'ACTIVE'],
    ['OWNER', 'SUSPENDED'],
  ])('rejects %s of a %s brand', async (role, status) => {
    const { service, prisma } = setup({ role, status });
    await expect(
      service.update('b-1', 'u-1', { name: 'Otro' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.get('b-1', 'u-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('UpdateBrandSettingsDto', () => {
  const errors = async (body: object) =>
    (await validate(plainToInstance(UpdateBrandSettingsDto, body))).map(
      (e) => e.property,
    );

  it('accepts a trimmed name and a null validity', async () => {
    expect(await errors({ name: '  Café  ', stampValidityDays: null })).toEqual(
      [],
    );
  });

  it.each([
    [{ name: 'A' }, 'name'],
    [{ name: 'x'.repeat(81) }, 'name'],
    [{ stampValidityDays: 0 }, 'stampValidityDays'],
    [{ stampValidityDays: 1.5 }, 'stampValidityDays'],
    [{ stampValidityDays: 4000 }, 'stampValidityDays'],
  ])('rejects %o', async (body, property) => {
    expect(await errors(body)).toContain(property);
  });
});
