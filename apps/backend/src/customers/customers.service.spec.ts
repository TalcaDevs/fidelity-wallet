import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PassesService } from '../passes/passes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CustomersService } from './customers.service.js';

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaMock: any;
  let passesServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      merchant: {
        findUnique: vi.fn(),
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

  it('should throw BadRequestException if neither RUT nor phone is provided', async () => {
    await expect(
      service.createOrFindCustomer({ merchantId: 'm-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if RUT fails Modulo 11', async () => {
    await expect(
      service.createOrFindCustomer({ merchantId: 'm-1', rut: '11.111.111-2' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if phone format is invalid', async () => {
    await expect(
      service.createOrFindCustomer({ merchantId: 'm-1', phone: '1234' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException with sanitized message if RUT and phone belong to different customers (user enumeration prevention)', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockImplementation(({ where }: any) => {
      if (where.rut) return Promise.resolve({ id: 'cust-1', rut: '11111111-1' });
      if (where.phone) return Promise.resolve({ id: 'cust-2', phone: '+56912345678' });
      return Promise.resolve(null);
    });

    await expect(
      service.createOrFindCustomer({
        merchantId: 'm-1',
        rut: '11.111.111-1',
        phone: '+56912345678',
      }),
    ).rejects.toThrow('Los datos proporcionados no coinciden o no son válidos para emitir el pase.');
  });

  it('should throw NotFoundException if merchant does not exist', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(null);

    await expect(
      service.createOrFindCustomer({ merchantId: 'm-not-found', rut: '11.111.111-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create customer and pass via PassesService, returning wallet URLs without raw passToken', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: null });
    passesServiceMock.findOrCreatePass.mockResolvedValue({
      pass: { id: 'p-1', customerId: 'c-1', merchantId: 'm-1' },
      isNew: true,
    });

    const result = await service.createOrFindCustomer({
      merchantId: 'm-1',
      rut: '11.111.111-1',
    });

    expect(result.customerId).toBe('c-1');
    expect(result.passId).toBe('p-1');
    expect(result.isNew).toBe(true);
    expect(result.appleWalletUrl).toBe('/api/passes/p-1/apple');
    expect(result.googleWalletUrl).toBe('/api/passes/p-1/google');
    expect((result as any).passToken).toBeUndefined();
    expect(prismaMock.customer.create).toHaveBeenCalled();
    expect(passesServiceMock.findOrCreatePass).toHaveBeenCalledWith('c-1', 'm-1');
    expect(passesServiceMock.getWalletUrlsForPass).toHaveBeenCalledWith('p-1');
  });

  it('should return existing customer and pass idempotently if already registered', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: null });
    passesServiceMock.findOrCreatePass.mockResolvedValue({
      pass: { id: 'p-1', customerId: 'c-1', merchantId: 'm-1' },
      isNew: false,
    });

    const result = await service.createOrFindCustomer({
      merchantId: 'm-1',
      rut: '11.111.111-1',
    });

    expect(result.customerId).toBe('c-1');
    expect(result.passId).toBe('p-1');
    expect(result.isNew).toBe(false);
    expect(result.appleWalletUrl).toBe('/api/passes/p-1/apple');
    expect(result.googleWalletUrl).toBe('/api/passes/p-1/google');
    expect((result as any).passToken).toBeUndefined();
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
    expect(passesServiceMock.findOrCreatePass).toHaveBeenCalledWith('c-1', 'm-1');
  });
});
