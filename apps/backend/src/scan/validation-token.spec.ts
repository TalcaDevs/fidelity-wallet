import type { ConfigService } from '@nestjs/config';
import { ScanMethod } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ScanValidationTokens } from './validation-token.js';

const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('ScanValidationTokens', () => {
  it('requires SCAN_VALIDATION_SECRET in production', () => {
    expect(() => new ScanValidationTokens(config({ NODE_ENV: 'production' }))).toThrow('SCAN_VALIDATION_SECRET');
    expect(() => new ScanValidationTokens(config({ NODE_ENV: 'production', SCAN_VALIDATION_SECRET: 's' }))).not.toThrow();
  });

  it('generates a key in development, so a token from another instance is rejected', () => {
    const claims = { passId: 'p', method: ScanMethod.QR, userId: 'u', merchantId: 'm' };
    const { token } = new ScanValidationTokens(config({})).sign(claims);
    expect(() => new ScanValidationTokens(config({})).verify(token, claims)).toThrow();
  });
});
