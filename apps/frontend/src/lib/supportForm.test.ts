import { describe, expect, it } from 'vitest';
import { attachmentError, descriptionError, isValidE164, toE164 } from './supportForm';

describe('supportForm', () => {
  it('builds E.164 from the country prefix and the local digits', () => {
    expect(toE164('+56', '9 1234 5678')).toBe('+56912345678');
    expect(toE164('+56', '   ')).toBeNull();
    expect(isValidE164('+56912345678')).toBe(true);
    expect(isValidE164('+56123')).toBe(false);
  });

  it('requires a description between 20 and 5000 characters', () => {
    expect(descriptionError('corta')).toMatch(/al menos 20/);
    expect(descriptionError('a'.repeat(20))).toBeNull();
    expect(descriptionError('a'.repeat(5001))).toMatch(/máximo/);
  });

  it('only accepts PNG or JPG up to 10 MB', () => {
    expect(attachmentError({ type: 'image/png', size: 1024 })).toBeNull();
    expect(attachmentError({ type: 'image/gif', size: 1024 })).toMatch(/PNG o JPG/);
    expect(attachmentError({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/);
  });
});
