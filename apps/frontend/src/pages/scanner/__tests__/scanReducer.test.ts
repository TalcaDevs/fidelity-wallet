import { describe, it, expect } from 'vitest';
import {
  scanReducer,
  initialScanState,
  rewardFromValidation,
  type ScanState,
} from '../scanReducer';
import type { ScanResult, ScanValidation } from '../../../services/scanService';

const mockValidation: ScanValidation = {
  validationToken: 'val-token-1',
  passId: 'pass-123',
  method: 'QR',
  customerLabel: 'Cliente Demo',
  hasName: true,
  stampsCount: 4,
  pointsCount: 120,
  rewardCurrency: 'STAMPS',
  stampsEnabled: true,
  pointsEnabled: false,
  targetStamps: 10,
  rewardUnlocked: true,
  rewardName: 'Café Gratis',
  availablePromotions: [],
  nextStampAvailableAt: null,
  canStamp: true,
  maxStampsPerLoad: 5,
  reasonRequired: false,
  nextPointsAvailableAt: null,
  canAddPoints: false,
  pointsReasonRequired: false,
  cardType: 'STAMPS',
  pesosPerPoint: 100,
  amountRequired: false,
  receiptRequired: false,
  nextExpiryAt: null,
};

const mockResult: ScanResult = {
  ok: true,
  passId: 'pass-123',
  customerLabel: 'Cliente Demo',
  stampsCount: 5,
  targetStamps: 10,
};

describe('scanReducer', () => {
  it('handles START_CAMERA', () => {
    const next = scanReducer(initialScanState, { type: 'START_CAMERA' });
    expect(next.isStarted).toBe(true);
    expect(next.status).toBe('camera');
  });

  it('handles SWITCH_TO_MANUAL', () => {
    const next = scanReducer(initialScanState, { type: 'SWITCH_TO_MANUAL' });
    expect(next.status).toBe('manual');
  });

  it('handles RESET_SCANNER', () => {
    const dirty: ScanState = {
      ...initialScanState,
      status: 'error',
      result: { ok: false, error: 'Fallo' },
      validation: mockValidation,
    };
    const next = scanReducer(dirty, { type: 'RESET_SCANNER' });
    expect(next.status).toBe('camera');
    expect(next.result).toBeNull();
    expect(next.validation).toBeNull();
  });

  it('handles START_LOOKUP and LOOKUP_SUCCESS', () => {
    const loading = scanReducer(initialScanState, { type: 'START_LOOKUP' });
    expect(loading.status).toBe('loading');
    expect(loading.result).toBeNull();

    const validated = scanReducer(loading, {
      type: 'LOOKUP_SUCCESS',
      validation: mockValidation,
    });
    expect(validated.status).toBe('validation');
    expect(validated.validation).toEqual(mockValidation);
  });

  it('handles START_ACTION, ACTION_SUCCESS, ACTION_ALREADY_SCANNED, and ACTION_REDEEM_SUCCESS', () => {
    const loading = scanReducer(initialScanState, { type: 'START_ACTION' });
    expect(loading.status).toBe('loading');

    const success = scanReducer(loading, { type: 'ACTION_SUCCESS', result: mockResult });
    expect(success.status).toBe('success');
    expect(success.result).toEqual(mockResult);

    const already = scanReducer(loading, {
      type: 'ACTION_ALREADY_SCANNED',
      result: mockResult,
    });
    expect(already.status).toBe('alreadyScanned');
    expect(already.result).toEqual(mockResult);

    const redeemed = scanReducer(loading, {
      type: 'ACTION_REDEEM_SUCCESS',
      result: mockResult,
    });
    expect(redeemed.status).toBe('redeemSuccess');
    expect(redeemed.result).toEqual(mockResult);
  });

  it('handles OPEN_REWARD and LEAVE_REWARD from validation and stamped states', () => {
    const withValidation: ScanState = {
      ...initialScanState,
      status: 'validation',
      validation: mockValidation,
    };

    const openedFromValidation = scanReducer(withValidation, {
      type: 'OPEN_REWARD',
      from: 'validation',
    });
    expect(openedFromValidation.status).toBe('reward');
    expect(openedFromValidation.rewardFrom).toBe('validation');
    expect(openedFromValidation.result).toEqual(rewardFromValidation(mockValidation));

    const leftToValidation = scanReducer(openedFromValidation, { type: 'LEAVE_REWARD' });
    expect(leftToValidation.status).toBe('validation');

    const openedFromStamped = scanReducer(
      { ...initialScanState, status: 'success', result: mockResult },
      { type: 'OPEN_REWARD', from: 'stamped' }
    );
    expect(openedFromStamped.status).toBe('reward');
    expect(openedFromStamped.result).toEqual(mockResult);

    const leftToCamera = scanReducer(openedFromStamped, { type: 'LEAVE_REWARD' });
    expect(leftToCamera.status).toBe('camera');
    expect(leftToCamera.result).toBeNull();
  });

  it('handles FAILURE for regular errors and session expiration', () => {
    const errorResult: ScanResult = { ok: false, error: 'QR inválido' };
    const failed = scanReducer(initialScanState, {
      type: 'FAILURE',
      result: errorResult,
    });
    expect(failed.status).toBe('error');
    expect(failed.result).toEqual(errorResult);
    expect(failed.isSessionExpired).toBe(false);

    const expiredResult: ScanResult = { ok: false, error: 'Unauthorized', errorCode: 'SESSION_EXPIRED' };
    const expired = scanReducer(initialScanState, {
      type: 'FAILURE',
      result: expiredResult,
      isSessionExpired: true,
    });
    expect(expired.isSessionExpired).toBe(true);
    expect(expired.result).toEqual(expiredResult);
  });

  it('returns current state for unknown action type', () => {
    // @ts-expect-error testing default branch
    const next = scanReducer(initialScanState, { type: 'UNKNOWN' });
    expect(next).toBe(initialScanState);
  });
});

describe('rewardFromValidation', () => {
  it('maps all redemption and balance fields from ScanValidation to an independent ScanResult object', () => {
    const mockPromo = {
      id: 'promo-101',
      name: 'Café de Especialidad',
      rewardName: 'Café Gratis',
      targetStamps: 10,
      canRedeem: true,
      currency: 'STAMPS' as const,
    };

    const inputValidation: ScanValidation = {
      validationToken: 'token-xyz-123',
      passId: 'pass-uuid-999',
      method: 'QR',
      customerLabel: 'Ana Silva',
      hasName: true,
      stampsCount: 7,
      pointsCount: 420,
      rewardCurrency: 'STAMPS',
      stampsEnabled: true,
      pointsEnabled: false,
      targetStamps: 10,
      rewardUnlocked: true,
      rewardName: 'Café Gratis',
      availablePromotions: [mockPromo],
      nextStampAvailableAt: '2026-10-22T08:00:00Z',
      canStamp: true,
      maxStampsPerLoad: 3,
      reasonRequired: false,
      nextPointsAvailableAt: null,
      canAddPoints: false,
      pointsReasonRequired: false,
      cardType: 'STAMPS',
      pesosPerPoint: 100,
      amountRequired: false,
      receiptRequired: false,
      nextExpiryAt: '2026-12-31T23:59:59Z',
    };

    const expectedResult: ScanResult = {
      ok: true,
      passId: 'pass-uuid-999',
      customerLabel: 'Ana Silva',
      stampsCount: 7,
      pointsCount: 420,
      rewardCurrency: 'STAMPS',
      stampsEnabled: true,
      pointsEnabled: false,
      targetStamps: 10,
      rewardUnlocked: true,
      rewardName: 'Café Gratis',
      availablePromotions: [mockPromo],
      nextExpiryAt: '2026-12-31T23:59:59Z',
    };

    const result = rewardFromValidation(inputValidation);

    // Verify independent expected literal mapping
    expect(result).toEqual(expectedResult);
    expect(result.passId).toBe('pass-uuid-999');
    expect(result.pointsCount).toBe(420);
    expect(result.stampsCount).toBe(7);
    expect(result.availablePromotions).toEqual([mockPromo]);
    expect(result.nextExpiryAt).toBe('2026-12-31T23:59:59Z');
    expect(result.rewardCurrency).toBe('STAMPS');
  });
});
