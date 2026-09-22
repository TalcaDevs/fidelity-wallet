import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaMock: any;

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
      pass: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new CustomersService(prismaMock as unknown as PrismaService);
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

  it('should throw BadRequestException if RUT and phone belong to different customers (identity cross)', async () => {
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
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if merchant does not exist', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(null);

    await expect(
      service.createOrFindCustomer({ merchantId: 'm-not-found', rut: '11.111.111-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create customer and pass if both are new without returning raw passToken', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: null });
    prismaMock.pass.findUnique.mockResolvedValue(null);
    prismaMock.pass.create.mockResolvedValue({ id: 'p-1', passToken: 'tok-123' });

    const result = await service.createOrFindCustomer({
      merchantId: 'm-1',
      rut: '11.111.111-1',
    });

    expect(result.customerId).toBe('c-1');
    expect(result.passId).toBe('p-1');
    expect(result.isNew).toBe(true);
    expect((result as any).passToken).toBeUndefined();
    expect(prismaMock.customer.create).toHaveBeenCalled();
    expect(prismaMock.pass.create).toHaveBeenCalled();
  });

  it('should return existing pass idempotently if customer already has a pass in merchant', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: null });
    prismaMock.pass.findUnique.mockResolvedValue({ id: 'p-1', passToken: 'tok-existing' });

    const result = await service.createOrFindCustomer({
      merchantId: 'm-1',
      rut: '11.111.111-1',
    });

    expect(result.customerId).toBe('c-1');
    expect(result.passId).toBe('p-1');
    expect(result.isNew).toBe(false);
    expect((result as any).passToken).toBeUndefined();
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
    expect(prismaMock.pass.create).not.toHaveBeenCalled();
  });
});
