import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import type { PassesService } from '../passes/passes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { TERMS_VERSION } from './terms.js';

// Alta válida: RUT opcional, teléfono o correo, y la aceptación de los términos.
const validDto = (overrides: Partial<CreateCustomerDto> = {}): CreateCustomerDto => ({
  merchantId: 'm-1',
  rut: '11.111.111-1',
  phone: '+56912345678',
  acceptedTerms: true,
  ...overrides,
});

const activeLocation = {
  id: 'm-1',
  brandId: 'm-1',
  name: 'Café Demo',
  isActive: true,
  brand: { name: 'Café Demo', status: 'ACTIVE' },
};
const stampsProgram = { id: 'prog-1', brandId: 'm-1', isActive: true, stampValidityDays: 30 };

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaMock: any;
  let passesServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      $transaction: vi.fn((callback: (tx: any) => Promise<any>) => callback(prismaMock)),
      $queryRaw: vi.fn().mockResolvedValue([]),
      merchant: {
        findUnique: vi.fn(),
      },
      brandMember: {
        findUnique: vi.fn(),
      },
      loyaltyProgram: {
        findFirst: vi.fn().mockResolvedValue(stampsProgram),
      },
      promotion: {
        findFirst: vi.fn().mockResolvedValue({ id: 'promo-1', isActive: true }),
      },
      customer: {
        findUnique: vi.fn(),
        // El servicio resuelve todos los identificadores en una consulta; el mock la responde con
        // findUnique por cada uno, así los casos siguen describiendo qué cliente tiene cada dato.
        findMany: vi.fn(async ({ where }: { where: { OR: object[] } }) => {
          const rows: { id: string }[] = [];
          for (const clause of where.OR) {
            const row = await prismaMock.customer.findUnique({ where: clause });
            if (row && !rows.some((r) => r.id === row.id)) rows.push(row);
          }
          return rows;
        }),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      pass: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
        count: vi.fn(),
      },
      brand: { findUnique: vi.fn().mockResolvedValue({ planId: 'BUSINESS' }) },
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
      notifyPassUpdate: vi.fn(),
    };

    service = new CustomersService(
      prismaMock as unknown as PrismaService,
      passesServiceMock as unknown as PassesService,
    );
  });

  it('requires a phone or an email (the RUT alone is not enough)', async () => {
    await expect(
      service.createOrFindCustomer(validDto({ phone: '' })),
    ).rejects.toThrow('Ingresa tu teléfono o tu correo para emitir la tarjeta');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  describe('locks de registro', () => {
    beforeEach(() => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.customer.findUnique.mockResolvedValue({
        id: 'c-1', rut: '11111111-1', phone: '+56912345678', email: null,
        name: null, birthDay: null, termsVersion: TERMS_VERSION,
      });
      passesServiceMock.findOrCreatePass.mockResolvedValue({ pass: { id: 'p-1' }, isNew: false });
    });

    const lockQueries = () => prismaMock.$queryRaw.mock.calls.map(([strings]: [TemplateStringsArray]) => strings.join('?'));

    it('un pase existente comparte la marca y no consulta el cupo de altas', async () => {
      prismaMock.pass.findFirst.mockResolvedValue({ id: 'p-1' });
      await service.createOrFindCustomer(validDto());
      expect(lockQueries().filter((sql: string) => sql.includes('"Brand"'))).toEqual([
        'SELECT id FROM "Brand" WHERE id = ?::uuid FOR SHARE',
      ]);
      expect(prismaMock.brand.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.pass.findFirst).toHaveBeenLastCalledWith({
        where: { programId: 'prog-1', customerId: 'c-1' }, select: { id: true },
      });
    });

    it('una tarjeta nueva toma lock exclusivo antes de comprobar capacidad', async () => {
      await service.createOrFindCustomer(validDto());
      expect(lockQueries().filter((sql: string) => sql.includes('"Brand"'))).toEqual([
        'SELECT id FROM "Brand" WHERE id = ?::uuid FOR UPDATE',
        'SELECT id FROM "Brand" WHERE id = ?::uuid FOR UPDATE',
      ]);
      expect(prismaMock.brand.findUnique).toHaveBeenCalled();
    });

    it('si desaparece el pase sondeado reinicia con UPDATE sin ascender el SHARE de la transacción', async () => {
      prismaMock.pass.findFirst.mockResolvedValueOnce({ id: 'p-1' });
      await service.createOrFindCustomer(validDto());
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
      expect(lockQueries().filter((sql: string) => sql.includes('"Brand"'))).toEqual([
        'SELECT id FROM "Brand" WHERE id = ?::uuid FOR SHARE',
        'SELECT id FROM "Brand" WHERE id = ?::uuid FOR UPDATE',
        'SELECT id FROM "Brand" WHERE id = ?::uuid FOR UPDATE',
      ]);
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });

    it('revalida identidad aunque el sondeo encuentre un pase por uno de los datos', async () => {
      prismaMock.pass.findFirst.mockResolvedValue({ id: 'p-1' });
      prismaMock.customer.findMany.mockResolvedValue([
        { id: 'c-1', rut: '11111111-1', phone: null, email: null },
        { id: 'c-2', rut: null, phone: '+56912345678', email: null },
      ]);
      await expect(service.createOrFindCustomer(validDto())).rejects.toThrow('Los datos proporcionados no coinciden');
      expect(passesServiceMock.findOrCreatePass).not.toHaveBeenCalled();
    });
  });

  describe('lo que pide la tarjeta', () => {
    beforeEach(() => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.customer.findUnique.mockResolvedValue(null);
      prismaMock.customer.create.mockResolvedValue({ id: 'c-1' });
      prismaMock.scan = { create: vi.fn().mockResolvedValue({ id: 'scan-welcome' }) };
      prismaMock.stamp = { createMany: vi.fn().mockResolvedValue({ count: 0 }) };
    });

    it('rejects a signup without a required field', async () => {
      prismaMock.loyaltyProgram.findFirst.mockResolvedValue({
        ...stampsProgram,
        registration: { name: 'REQUIRED', email: 'REQUIRED' },
      });
      await expect(service.createOrFindCustomer(validDto())).rejects.toThrow('Ingresa tu correo');
      await expect(service.createOrFindCustomer(validDto({ email: 'ana@gmail.com' }))).rejects.toThrow(
        'Ingresa tu nombre',
      );
      expect(prismaMock.customer.create).not.toHaveBeenCalled();
    });

    it('drops what the brand does not ask for', async () => {
      prismaMock.loyaltyProgram.findFirst.mockResolvedValue({
        ...stampsProgram,
        registration: { rut: 'HIDDEN', birthday: 'HIDDEN' },
      });
      await service.createOrFindCustomer(validDto({ birthDay: 3, birthMonth: 4 }));
      const { data } = prismaMock.customer.create.mock.calls[0][0];
      expect(data.rut).toBeUndefined();
      expect(data.birthDay).toBeUndefined();
      expect(data.phone).toBe('+56912345678');
    });

    it('gives the welcome balance only with a new card', async () => {
      prismaMock.loyaltyProgram.findFirst.mockResolvedValue({ ...stampsProgram, welcomeBalance: 2 });
      await service.createOrFindCustomer(validDto());

      expect(prismaMock.scan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ passId: 'p-1', method: 'WELCOME', stampCount: 2, type: 'STAMP_ADDED' }),
      });
      const [{ data: rows }] = prismaMock.stamp.createMany.mock.calls[0];
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ currency: 'STAMPS', amount: 2 });
      expect(rows[0]).toMatchObject({ sourceScanId: 'scan-welcome', expiresAt: expect.any(Date) });
      // El saldo se da antes de armar el pase, para que la tarjeta nazca con él.
      expect(prismaMock.stamp.createMany.mock.invocationCallOrder[0]).toBeLessThan(
        passesServiceMock.getWalletUrlsForPass.mock.invocationCallOrder[0],
      );

      passesServiceMock.findOrCreatePass.mockResolvedValue({ pass: { id: 'p-1' }, isNew: false });
      prismaMock.scan.create.mockClear();
      await service.createOrFindCustomer(validDto());
      expect(prismaMock.scan.create).not.toHaveBeenCalled();
    });

    it.each([
      { type: 'POINTS', stampsEnabled: false, pointsEnabled: true, expected: [{ currency: 'POINTS', amount: 50 }] },
      { type: 'STAMPS', stampsEnabled: true, pointsEnabled: true, expected: [{ currency: 'STAMPS', amount: 2 }, { currency: 'POINTS', amount: 50 }] },
      { type: 'STAMPS', stampsEnabled: true, pointsEnabled: false, expected: [{ currency: 'STAMPS', amount: 2 }] },
    ])('grants only enabled welcome currencies ($type, $pointsEnabled)', async ({ expected, ...modalities }) => {
      prismaMock.loyaltyProgram.findFirst.mockResolvedValue({ ...stampsProgram, ...modalities, welcomeStamps: 2, welcomePoints: 50 });
      await service.createOrFindCustomer(validDto());
      const [{ data: rows }] = prismaMock.stamp.createMany.mock.calls[0];
      expect(rows.map(({ currency, amount }: { currency: string; amount: number }) => ({ currency, amount }))).toEqual(expected);
      expect(prismaMock.scan.create).toHaveBeenCalledWith({ data: expect.objectContaining({ stampCount: modalities.stampsEnabled ? 2 : 0, pointsEarned: modalities.pointsEnabled ? 50 : 0 }) });
    });

    it('does not hand out new cards once a fixed-term card ended', async () => {
      prismaMock.loyaltyProgram.findFirst.mockResolvedValue({
        ...stampsProgram,
        cardValidity: 'FIXED_DATE',
        cardExpiresAt: new Date('2020-01-01T00:00:00Z'),
      });
      await expect(service.createOrFindCustomer(validDto())).rejects.toThrow('ya terminó');
    });
  });

  it('creates the customer with only an email, a name and a birthday without year', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({ id: 'c-1' });

    await service.createOrFindCustomer({
      merchantId: 'm-1',
      email: ' Maria@Gmail.com ',
      name: '  María   Pérez ',
      birthDay: 29,
      birthMonth: 2,
      acceptedTerms: true,
    });

    expect(prismaMock.customer.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.customer.findUnique).toHaveBeenCalledWith({ where: { email: 'maria@gmail.com' } });
    expect(prismaMock.customer.create).toHaveBeenCalledWith({
      data: {
        email: 'maria@gmail.com',
        name: 'María Pérez',
        birthDay: 29,
        birthMonth: 2,
        birthYear: undefined,
        termsAcceptedAt: expect.any(Date),
        termsVersion: TERMS_VERSION,
      },
    });
  });

  it('rejects an invalid email or birthday before opening the transaction', async () => {
    await expect(service.createOrFindCustomer(validDto({ email: 'maria@' }))).rejects.toThrow(
      'El correo ingresado no es válido',
    );
    await expect(
      service.createOrFindCustomer(validDto({ birthDay: 31, birthMonth: 4 })),
    ).rejects.toThrow('La fecha de cumpleaños no es válida');
    await expect(service.createOrFindCustomer(validDto({ birthYear: 1990 }))).rejects.toThrow(
      'Indica el día y el mes de tu cumpleaños',
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
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
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
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
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
    prismaMock.promotion.findFirst.mockResolvedValue(null);

    await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(
      'El comercio no tiene una promoción activa configurada',
    );
  });

  it('answers an inactive location or a suspended brand like a missing one', async () => {
    prismaMock.merchant.findUnique.mockResolvedValueOnce({ ...activeLocation, isActive: false });
    await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(NotFoundException);

    prismaMock.merchant.findUnique.mockResolvedValueOnce({
      ...activeLocation,
      brand: { name: 'Café Demo', status: 'SUSPENDED' },
    });
    await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(NotFoundException);
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
  });

  it('still deletes customer data while the brand is suspended (Ley 19.628)', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({
      ...activeLocation,
      brand: { name: 'Café Demo', status: 'SUSPENDED' },
    });
    prismaMock.brandMember.findUnique.mockResolvedValue({ role: 'OWNER', merchantId: null });
    prismaMock.pass.findUnique.mockResolvedValue({ id: 'p-1', customerId: 'c-1' });
    prismaMock.pass.count.mockResolvedValue(0);

    await expect(service.deleteCustomerByMerchant('m-1', 'c-1', 'user-owner')).resolves.toMatchObject({
      success: true,
    });
  });

  it('looks up the pass to delete by the brand program, not by location', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
    prismaMock.brandMember.findUnique.mockResolvedValue({ role: 'OWNER', merchantId: null });
    prismaMock.pass.findUnique.mockResolvedValue({ id: 'p-1', customerId: 'c-1' });
    prismaMock.pass.count.mockResolvedValue(0);

    await service.deleteCustomerByMerchant('m-1', 'c-1', 'user-owner');

    expect(prismaMock.pass.findUnique).toHaveBeenCalledWith({
      where: { customerId_programId: { customerId: 'c-1', programId: 'prog-1' } },
    });
  });

  it('should create the customer with RUT, phone and the terms acceptance, returning wallet URLs only when the pass is new', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
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
    expect(prismaMock.pass.findFirst).toHaveBeenCalledWith({
      where: {
        programId: 'prog-1',
        customer: { OR: [{ rut: '11111111-1' }, { phone: '+56912345678' }] },
      },
      select: { id: true },
    });
    expect(result.customerId).toBe('c-1');
    expect(result.passId).toBe('p-1');
    expect(result.isNew).toBe(true);
    expect(result.appleWalletUrl).toBe('/api/passes/p-1/apple');
    expect(result.googleWalletUrl).toBe('/api/passes/p-1/google');
    expect((result as any).passToken).toBeUndefined();
    expect(passesServiceMock.findOrCreatePass).toHaveBeenCalledWith(
      'c-1',
      { programId: 'prog-1', merchantId: 'm-1', brandId: 'm-1' },
      prismaMock,
    );
    expect(passesServiceMock.getWalletUrlsForPass).toHaveBeenCalledWith('p-1', prismaMock);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException and abort transaction if wallet URLs generation returns null for a new pass', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: '+56912345678' });
    passesServiceMock.findOrCreatePass.mockResolvedValue({
      pass: { id: 'p-1', customerId: 'c-1', merchantId: 'm-1' },
      isNew: true,
    });
    passesServiceMock.getWalletUrlsForPass.mockResolvedValue(null);

    await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException and abort transaction if wallet URLs generation throws an error for a new pass', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({ id: 'c-1', rut: '11111111-1', phone: '+56912345678' });
    passesServiceMock.findOrCreatePass.mockResolvedValue({
      pass: { id: 'p-1', customerId: 'c-1', merchantId: 'm-1' },
      isNew: true,
    });
    passesServiceMock.getWalletUrlsForPass.mockRejectedValue(new Error('Signing key failure'));

    await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('should return existing customer and pass without wallet URLs to prevent credential leakage/impersonation', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
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
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  describe('identity of an existing customer (anti-impersonation)', () => {
    const existing = (customer: object) =>
      prismaMock.customer.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where.rut ? { id: 'c-1', termsVersion: null, ...customer } : null),
      );

    beforeEach(() => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.customer.update.mockResolvedValue({ id: 'c-1' });
    });

    it('rejects a known RUT sent with a different phone (knowing a RUT is not enough)', async () => {
      existing({ rut: '11111111-1', phone: '+56911112222' });

      await expect(service.createOrFindCustomer(validDto({ phone: '+56933334444' }))).rejects.toThrow(
        'Los datos proporcionados no coinciden o no son válidos para emitir el pase.',
      );
      expect(prismaMock.customer.update).not.toHaveBeenCalled();
      expect(passesServiceMock.findOrCreatePass).not.toHaveBeenCalled();
    });

    it('does NOT attach the sent phone to a legacy customer that had none (no verification yet)', async () => {
      existing({ rut: '11111111-1', phone: null });

      await service.createOrFindCustomer(validDto());

      // Solo registra la aceptación; el teléfono no se escribe
      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { termsAcceptedAt: expect.any(Date), termsVersion: TERMS_VERSION },
      });
    });

    it('keeps the original consent date when the same terms version was already accepted', async () => {
      existing({ rut: '11111111-1', phone: '+56912345678', termsVersion: TERMS_VERSION });

      await service.createOrFindCustomer(validDto());

      expect(prismaMock.customer.update).not.toHaveBeenCalled();
    });

    it('rejects an email that belongs to another customer', async () => {
      prismaMock.customer.findUnique.mockImplementation(({ where }: any) => {
        if (where.rut) return Promise.resolve({ id: 'c-1', rut: '11111111-1', phone: '+56912345678', email: null });
        if (where.email) return Promise.resolve({ id: 'c-2', rut: null, phone: null, email: 'otra@gmail.com' });
        return Promise.resolve(null);
      });

      await expect(
        service.createOrFindCustomer(validDto({ email: 'otra@gmail.com' })),
      ).rejects.toThrow('Los datos proporcionados no coinciden o no son válidos para emitir el pase.');
    });

    it('does NOT attach the sent email to a customer that had none', async () => {
      existing({ rut: '11111111-1', phone: '+56912345678', email: null, termsVersion: TERMS_VERSION });

      await service.createOrFindCustomer(validDto({ email: 'nueva@gmail.com' }));

      expect(prismaMock.customer.update).not.toHaveBeenCalled();
    });

    it('fills an empty name and birthday but never overwrites them', async () => {
      existing({
        rut: '11111111-1',
        phone: '+56912345678',
        name: null,
        birthDay: null,
        termsVersion: TERMS_VERSION,
      });

      await service.createOrFindCustomer(
        validDto({ name: 'María', birthDay: 14, birthMonth: 2, birthYear: 1990 }),
      );
      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { name: 'María', birthDay: 14, birthMonth: 2, birthYear: 1990 },
      });

      prismaMock.customer.update.mockClear();
      existing({
        rut: '11111111-1',
        phone: '+56912345678',
        name: 'María',
        birthDay: 14,
        birthMonth: 2,
        termsVersion: TERMS_VERSION,
      });
      await service.createOrFindCustomer(validDto({ name: 'Otra Persona', birthDay: 1, birthMonth: 1 }));
      expect(prismaMock.customer.update).not.toHaveBeenCalled();
    });

    it('records a new acceptance when the customer accepted an older terms version', async () => {
      existing({ rut: '11111111-1', phone: '+56912345678', termsVersion: '2020-01-01' });

      await service.createOrFindCustomer(validDto());

      expect(prismaMock.customer.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { termsAcceptedAt: expect.any(Date), termsVersion: TERMS_VERSION },
      });
    });
  });

  describe('concurrency and P2002 retry handling', () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    it('retries the entire transaction when P2002 collision occurs on customer creation and resolves concurrently created customer', async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.promotion.findFirst.mockResolvedValue({ id: 'promo-1', isActive: true });

      let transactionCount = 0;
      prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        transactionCount++;
        return callback(prismaMock);
      });

      // On attempt 1, customer does not exist yet. On attempt 2, customer was created by concurrent request.
      prismaMock.customer.findUnique.mockImplementation(({ where }: any) => {
        if (transactionCount === 1) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: 'c-concurrent',
          rut: '11111111-1',
          phone: '+56912345678',
          termsVersion: TERMS_VERSION,
        });
      });

      prismaMock.customer.create.mockRejectedValueOnce(p2002Error);

      passesServiceMock.findOrCreatePass.mockResolvedValue({
        pass: { id: 'p-1', customerId: 'c-concurrent', merchantId: 'm-1' },
        isNew: false,
      });

      const result = await service.createOrFindCustomer(validDto());

      expect(transactionCount).toBe(2);
      expect(result.customerId).toBe('c-concurrent');
      expect(result.passId).toBe('p-1');
      expect(result.isNew).toBe(false);
    });

    it('rethrows P2002 when the error persists on the retried transaction', async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.promotion.findFirst.mockResolvedValue({ id: 'promo-1', isActive: true });

      let transactionCount = 0;
      prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        transactionCount++;
        return callback(prismaMock);
      });

      prismaMock.customer.findUnique.mockResolvedValue(null);
      prismaMock.customer.create.mockRejectedValue(p2002Error);

      await expect(service.createOrFindCustomer(validDto())).rejects.toThrow(p2002Error);
      expect(transactionCount).toBe(2);
    });
  });

  describe('deleteCustomerByMerchant (Ley 19.628)', () => {
    it('throws ForbiddenException if caller is not authenticated', async () => {
      await expect(
        service.deleteCustomerByMerchant('m-1', 'c-1', ''),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if caller is not an OWNER', async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.brandMember.findUnique.mockResolvedValue({ role: 'STAFF', merchantId: 'm-1' });
      await expect(
        service.deleteCustomerByMerchant('m-1', 'c-1', 'user-staff'),
      ).rejects.toThrow('Solo el dueño del comercio puede eliminar clientes');
    });

    it('throws NotFoundException if customer or pass does not exist in merchant', async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.brandMember.findUnique.mockResolvedValue({ role: 'OWNER', merchantId: null });
      prismaMock.pass.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteCustomerByMerchant('m-1', 'c-1', 'user-owner'),
      ).rejects.toThrow('Cliente o pase no encontrado en este comercio');
    });

    it('deletes pass without deleting customer when customer has other passes', async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.brandMember.findUnique.mockResolvedValue({ role: 'OWNER', merchantId: null });
      prismaMock.pass.findUnique.mockResolvedValue({ id: 'p-1', customerId: 'c-1', merchantId: 'm-1' });
      prismaMock.pass.count.mockResolvedValue(1); // 1 remaining pass in another merchant

      const result = await service.deleteCustomerByMerchant('m-1', 'c-1', 'user-owner');

      expect(prismaMock.pass.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
      expect(prismaMock.customer.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.customerCompletelyDeleted).toBe(false);
    });

    it('deletes pass and customer completely when customer has no other passes', async () => {
      prismaMock.merchant.findUnique.mockResolvedValue(activeLocation);
      prismaMock.brandMember.findUnique.mockResolvedValue({ role: 'OWNER', merchantId: null });
      prismaMock.pass.findUnique.mockResolvedValue({ id: 'p-1', customerId: 'c-1', merchantId: 'm-1' });
      prismaMock.pass.count.mockResolvedValue(0); // 0 remaining passes

      const result = await service.deleteCustomerByMerchant('m-1', 'c-1', 'user-owner');

      expect(prismaMock.pass.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
      expect(prismaMock.customer.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } });
      expect(result.success).toBe(true);
      expect(result.customerCompletelyDeleted).toBe(true);
    });
  });

  describe('deleteCustomerGlobal (Ley 19.628)', () => {
    it('throws NotFoundException if customer does not exist', async () => {
      prismaMock.customer.findUnique.mockResolvedValue(null);
      await expect(service.deleteCustomerGlobal('c-nonexistent')).rejects.toThrow('Cliente no encontrado');
    });

    it('deletes customer completely', async () => {
      prismaMock.customer.findUnique.mockResolvedValue({
        id: 'c-1',
      });

      const result = await service.deleteCustomerGlobal('c-1');

      expect(prismaMock.customer.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } });
      expect(result.success).toBe(true);
      expect(result.customerCompletelyDeleted).toBe(true);
    });
  });
});

describe('CreateCustomerDto validation', () => {
  const merchantId = 'd3b07384-d113-4011-8e8e-d9006fa70bc6';
  const errorsOf = async (body: object) =>
    (await validate(plainToInstance(CreateCustomerDto, body))).map((e) => e.property);

  it('accepts RUT + phone + acceptedTerms true', async () => {
    expect(await errorsOf(validDto({ merchantId }))).toEqual([]);
  });

  it('requires a phone or an email, with the RUT optional', async () => {
    expect(await errorsOf({ merchantId, rut: '11.111.111-1', acceptedTerms: true })).toEqual(
      expect.arrayContaining(['phone', 'email']),
    );
    expect(await errorsOf({ merchantId, phone: '+56912345678', acceptedTerms: true })).toEqual([]);
    expect(await errorsOf({ merchantId, email: 'maria@gmail.com', acceptedTerms: true })).toEqual([]);
    expect(await errorsOf({ merchantId, phone: '  ', email: '', acceptedTerms: true })).toEqual(
      expect.arrayContaining(['phone', 'email']),
    );
  });

  it('validates the birthday parts and the name length', async () => {
    expect(await errorsOf(validDto({ merchantId, birthDay: 32, birthMonth: 1 }))).toContain('birthDay');
    expect(await errorsOf(validDto({ merchantId, birthDay: 1, birthMonth: 13 }))).toContain('birthMonth');
    expect(await errorsOf(validDto({ merchantId, name: 'x'.repeat(81) }))).toContain('name');
  });

  it('rejects acceptedTerms false or missing', async () => {
    expect(await errorsOf(validDto({ merchantId, acceptedTerms: false }))).toContain('acceptedTerms');
    const { acceptedTerms: _omit, ...withoutTerms } = validDto({ merchantId });
    expect(await errorsOf(withoutTerms)).toContain('acceptedTerms');
  });
});
