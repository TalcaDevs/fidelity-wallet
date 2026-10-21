import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCustomerDto } from './create-customer.dto.js';

describe('CreateCustomerDto', () => {
  const validMerchantId = 'a0000000-0000-4000-8000-000000000001';

  it('reports only "Ingresa tu teléfono o tu correo" on both phone and email when neither is provided', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      merchantId: validMerchantId,
      acceptedTerms: true,
    });
    const errors = await validate(dto as object);
    const properties = errors.map((e) => e.property);
    expect(properties).toEqual(expect.arrayContaining(['phone', 'email']));

    const messages = errors.flatMap((e) => Object.values(e.constraints || {}));
    expect(messages).toEqual(['Ingresa tu teléfono o tu correo', 'Ingresa tu teléfono o tu correo']);
    expect(messages).not.toContain('El correo es demasiado largo');
    expect(messages).not.toContain('El correo debe ser una cadena de texto');
  });

  it('validates successfully when only phone is provided', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      merchantId: validMerchantId,
      phone: '+56912345678',
      acceptedTerms: true,
    });
    const errors = await validate(dto as object);
    expect(errors).toHaveLength(0);
  });

  it('validates successfully when only email is provided', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      merchantId: validMerchantId,
      email: 'maria@example.com',
      acceptedTerms: true,
    });
    const errors = await validate(dto as object);
    expect(errors).toHaveLength(0);
  });

  it('rejects email exceeding max length', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      merchantId: validMerchantId,
      email: `${'a'.repeat(250)}@test.com`,
      acceptedTerms: true,
    });
    const errors = await validate(dto as object);
    const messages = errors.flatMap((e) => Object.values(e.constraints || {}));

    expect(messages).toContain('El correo es demasiado largo');
  });

  it('validates successfully when both phone and email are provided', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      merchantId: validMerchantId,
      phone: '+56912345678',
      email: 'maria@example.com',
      acceptedTerms: true,
    });
    const errors = await validate(dto as object);
    expect(errors).toHaveLength(0);
  });

  it('rejects email exceeding max length even when phone is also provided', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      merchantId: validMerchantId,
      phone: '+56912345678',
      email: `${'a'.repeat(250)}@test.com`,
      acceptedTerms: true,
    });
    const errors = await validate(dto as object);
    const messages = errors.flatMap((e) => Object.values(e.constraints || {}));

    expect(messages).toContain('El correo es demasiado largo');
  });

  it('requires acceptedTerms to be true', async () => {
    const dto = plainToInstance(CreateCustomerDto, {
      merchantId: validMerchantId,
      phone: '+56912345678',
      acceptedTerms: false,
    });
    const errors = await validate(dto as object);
    const messages = errors.flatMap((e) => Object.values(e.constraints || {}));

    expect(messages).toContain('Debes aceptar los términos y condiciones para obtener tu tarjeta');
  });
});
