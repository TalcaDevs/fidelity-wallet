import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedFetch = vi.fn();
vi.mock('../lib/api', () => ({ authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args) }));

import { processScan, validateScan } from './scanService';

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('scanService', () => {
  beforeEach(() => authenticatedFetch.mockReset());

  it('validates without stamping and keeps only the first name for the cashier', async () => {
    authenticatedFetch.mockResolvedValue(
      okJson({
        validationToken: 't',
        passId: 'p',
        method: 'MANUAL',
        customer: { firstName: 'María', phone: '+56 9 **** 5678' },
        activeStamps: 2,
        targetStamps: 5,
        rewardName: 'Café',
        rewardUnlocked: false,
        availablePromotions: [],
        nextStampAvailableAt: null,
        canStamp: true,
        maxStampsPerLoad: 1,
        reasonRequired: false,
      }),
    );

    const result = await validateScan({ merchantId: 'm-1', target: { customer: { email: 'maria@gmail.com' } } });

    expect(authenticatedFetch).toHaveBeenCalledWith('/api/scan/validate', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(authenticatedFetch.mock.calls[0][1].body as string)).toEqual({
      merchantId: 'm-1',
      customer: { email: 'maria@gmail.com' },
    });
    expect(result).toMatchObject({ ok: true, customerLabel: 'María', hasName: true, stampsCount: 2 });
  });

  it('sends JSON without a photo', async () => {
    authenticatedFetch.mockResolvedValue(okJson({ passId: 'p', activeStamps: 3, targetStamps: 5, rewardUnlocked: false, rewardName: 'Café', alreadyScanned: false }));

    await processScan({
      merchantId: 'm-1',
      action: 'STAMP',
      target: { validationToken: 't' },
      extras: { purchaseAmount: 0, note: 'Mesa 2' },
    });

    const init = authenticatedFetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      merchantId: 'm-1',
      action: 'STAMP',
      validationToken: 't',
      purchaseAmount: 0,
      note: 'Mesa 2',
    });
  });

  it('sends multipart with the receipt photo', async () => {
    authenticatedFetch.mockResolvedValue(okJson({ passId: 'p', activeStamps: 3, targetStamps: 5, rewardUnlocked: false, rewardName: 'Café', alreadyScanned: false }));
    const photo = new File(['jpeg'], 'boleta.jpg', { type: 'image/jpeg' });

    await processScan({
      merchantId: 'm-1',
      action: 'STAMP',
      target: { validationToken: 't' },
      extras: { purchaseAmount: 12500, receipt: photo, stampCount: 2, reason: 'Compensación' },
    });

    const init = authenticatedFetch.mock.calls[0][1] as RequestInit;
    const form = init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(init.headers).toBeUndefined();
    expect(form.get('validationToken')).toBe('t');
    expect(form.get('purchaseAmount')).toBe('12500');
    expect(form.get('stampCount')).toBe('2');
    expect(form.get('reason')).toBe('Compensación');
    expect((form.get('receipt') as File).name).toBe('boleta.jpg');
  });
});
