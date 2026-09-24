import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { PassesService } from '../passes/passes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { TERMS_VERSION } from './terms.js';

// Alta válida: desde 2026-09-24 exige RUT + teléfono + aceptación de términos.
const validDto = (overrides: Partial<CreateCustomerDto> = {}): CreateCustomerDto => ({
  merchantId: 'm-1',
  rut: '11.111.111-1',
  phone: '+56912345678',
  acceptedTerms: true,
  ...overrides,
});

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaMock: any;
  let passesServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      merchant: {
        findUnique: vi.fn(),
      },
      promotion: {
        findFirst: vi.fn().mockResolvedValue({ id: 'promo-1', isActive: true }),
      },
      customer: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    passesServiceMock = {
      findOrCreatePass: vi.fn().mockResolvedValue({
        pass: { id: 'p-1', customerId: 'c-1', merchantId: 'm-1' },
        isNew: true,
      }),
      getWalletUrlsForPass: vi.fn().mockReturnValue({
        appleWalletUrl: '/api/passes/p-1/apple',
        googleWalletUrl: '/api/passes/p-1/google',
      }),
    };

    service = new CustomersService(
      prismaMock as unknown as PrismaService,
      passesServiceMock as unknown as PassesService,
    );
  });

  it('should throw BadRequestException if the phone is missing (RUT alone is not enough)', async () => {
    await expect(
      service.createOrFindCustomer(validDto({ phone: '' })),
    ).rejects.toThrow('Debe proporcionar el RUT y el teléfono para emitir la tarjeta');
  });

  it('should throw BadRequestException if the RUT is missing (phone alone is not enough)', async () => {
    await expect(
      service.createOrFindCustomer(validDto({ rut: '' })),
    ).rejects.toThrow('Debe proporcionar el RUT y el teléfono para emitir la tarjeta');
  });

  it('should throw BadRequestException if the terms were not accepted', async () => {
    await expect(
      service.createOrFindCustomer(validDto({ acceptedTerms: false })),
    ).rejects.toThrow('Debes aceptar los términos y condiciones para obtener tu tarjeta');
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if RUT fails Modulo 11', async () => {
    await expect(
      service.createOrFindCustomer(validDto({ rut: '11.111.111-2' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if phone format is invalid', async () => {
    await expect(
      service.createOrFindCustomer(validDto({ phone: '1234' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException with sanitized message if RUT and phone belong to different customers (user enumeration prevention)', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockImplementation(({ where }: any) => {
      if (where.rut) return Promise.resolve({ id: 'cust-1', rut: '11111111-1' });
      if (where.phone) return Promise.resolve({ id: 'cust-2', phone: '+56912345678' });
      return Promise.resolve(null);
    });

    await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(
      'Los datos proporcionados no coinciden o no son válidos para emitir el pase.',
    );
  });

  it('should throw NotFoundException if merchant does not exist', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(null);

    await expect(
      service.createOrFindCustomer(validDto({ merchantId: 'm-not-found' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if merchant has no active promotion', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.promotion.findFirst.mockResolvedValue(null);

    await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(
      'El comercio no tiene una promoción activa configurada',
    );
  });

  it('should create the customer with RUT, phone and the terms acceptance, returning wallet URLs only when the pass is new', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: '+56912345678' });
    passesServiceMock.findOrCreatePass.mockResolvedValue({
      pass: { id: 'p-1', customerId: 'c-1', merchantId: 'm-1' },
      isNew: true,
    });

    const result = await service.createOrFindCustomer(validDto({ phone: '9 1234 5678' }));

    expect(prismaMock.customer.create).toHaveBeenCalledWith({
      data: {
        rut: '11111111-1',
        phone: '+56912345678',
        termsAcceptedAt: expect.any(Date),
        termsVersion: TERMS_VERSION,
      },
    });
    expect(result.customerId).toBe('c-1');
    expect(result.passId).toBe('p-1');
    expect(result.isNew).toBe(true);
    expect(result.appleWalletUrl).toBe('/api/passes/p-1/apple');
    expect(result.googleWalletUrl).toBe('/api/passes/p-1/google');
    expect((result as any).passToken).toBeUndefined();
    expect(passesServiceMock.findOrCreatePass).toHaveBeenCalledWith('c-1', 'm-1');
    expect(passesServiceMock.getWalletUrlsForPass).toHaveBeenCalledWith('p-1');
  });

  it('should return existing customer and pass without wallet URLs to prevent credential leakage/impersonation', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.rut ? { id: 'c-1', rut: '11111111-1', phone: '+56912345678' } : null),
    );
    prismaMock.customer.update.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: '+56912345678' });
    passesServiceMock.findOrCreatePass.mockResolvedValue({
      pass: { id: 'p-1', customerId: 'c-1', merchantId: 'm-1' },
      isNew: false,
    });

    const result = await service.createOrFindCustomer(validDto());

    expect(result.customerId).toBe('c-1');
    expect(result.isNew).toBe(false);
    expect(result.appleWalletUrl).toBeUndefined();
    expect(result.googleWalletUrl).toBeUndefined();
    expect((result as any).passToken).toBeUndefined();
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
    expect(passesServiceMock.getWalletUrlsForPass).not.toHaveBeenCalled();
  });

  it('should complete the missing phone of a legacy customer and record the new terms acceptance', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.rut ? { id: 'c-old', rut: '11111111-1', phone: null } : null),
    );
    prismaMock.customer.update.mockResolvedValue({ id: 'c-old' });

    await service.createOrFindCustomer(validDto());

    expect(prismaMock.customer.update).toHaveBeenCalledWith({
      where: { id: 'c-old' },
      data: {
        rut: '11111111-1',
        phone: '+56912345678',
        termsAcceptedAt: expect.any(Date),
        termsVersion: TERMS_VERSION,
      },
    });
  });

  it('should never overwrite a phone the customer already had', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.rut ? { id: 'c-1', rut: '11111111-1', phone: '+56911112222' } : null),
    );
    prismaMock.customer.update.mockResolvedValue({ id: 'c-1' });

    await service.createOrFindCustomer(validDto({ phone: '+56933334444' }));

    expect(prismaMock.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: '+56911112222' }),
      }),
    );
  });
});

describe('CreateCustomerDto validation', () => {
  const merchantId = 'd3b07384-d113-4011-8e8e-d9006fa70bc6';
  const errorsOf = async (body: object) =>
    (await validate(plainToInstance(CreateCustomerDto, body))).map((e) => e.property);

  it('accepts RUT + phone + acceptedTerms true', async () => {
    expect(await errorsOf(validDto({ merchantId }))).toEqual([]);
  });

  it('requires both RUT and phone', async () => {
    expect(await errorsOf({ merchantId, rut: '11.111.111-1', acceptedTerms: true })).toContain('phone');
    expect(await errorsOf({ merchantId, phone: '+56912345678', acceptedTerms: true })).toContain('rut');
  });

  it('rejects acceptedTerms false or missing', async () => {
    expect(await errorsOf(validDto({ merchantId, acceptedTerms: false }))).toContain('acceptedTerms');
    const { acceptedTerms: _omit, ...withoutTerms } = validDto({ merchantId });
    expect(await errorsOf(withoutTerms)).toContain('acceptedTerms');
  });
});
