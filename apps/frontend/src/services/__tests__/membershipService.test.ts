import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMemberships,
  invalidateMemberships,
  isBrandSuspended,
  isMembershipSuspended,
  MEMBERSHIP_INVALIDATED_EVENT,
} from '../membershipService';

const mockFrom = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('membershipService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives suspension from brandStatus as the single source of truth', () => {
    expect(isBrandSuspended('ACTIVE')).toBe(false);
    expect(isBrandSuspended('SUSPENDED')).toBe(true);
    expect(isBrandSuspended(null)).toBe(false);

    expect(isMembershipSuspended({ brandStatus: 'ACTIVE', isSuspended: true })).toBe(false);
    expect(isMembershipSuspended({ brandStatus: 'SUSPENDED', isSuspended: false })).toBe(true);
    expect(isMembershipSuspended({ isSuspended: true })).toBe(true);
    expect(isMembershipSuspended(null)).toBe(false);
  });

  it('resolves ACTIVE membership with mandatory brandStatus, merchantId and programId', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'BrandMember') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ brandId: 'brand-1', role: 'OWNER', merchantId: null }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'Brand') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { status: 'ACTIVE' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'Merchant') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'merchant-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'LoyaltyProgram') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'prog-1' }, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await fetchMemberships('user-1');

    expect(result).toEqual([
      {
        brandId: 'brand-1',
        merchantId: 'merchant-1',
        programId: 'prog-1',
        role: 'OWNER',
        brandStatus: 'ACTIVE',
      },
    ]);
    expect('isSuspended' in result[0]).toBe(false);
    expect(isMembershipSuspended(result[0])).toBe(false);
  });

  it('resolves SUSPENDED membership early without querying Merchant or LoyaltyProgram', async () => {
    const queriedTables: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      queriedTables.push(table);
      if (table === 'BrandMember') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ brandId: 'brand-2', role: 'OWNER', merchantId: null }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'Brand') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { status: 'SUSPENDED' }, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await fetchMemberships('user-2');

    expect(result).toEqual([
      {
        brandId: 'brand-2',
        merchantId: '',
        programId: null,
        role: 'OWNER',
        brandStatus: 'SUSPENDED',
      },
    ]);
    expect('isSuspended' in result[0]).toBe(false);
    expect(isMembershipSuspended(result[0])).toBe(true);
    expect(queriedTables).toEqual(['BrandMember', 'Brand']);
  });

  it('dispatches MEMBERSHIP_INVALIDATED_EVENT when invalidateMemberships is called', () => {
    const listener = vi.fn();
    window.addEventListener(MEMBERSHIP_INVALIDATED_EVENT, listener);
    invalidateMemberships();
    window.removeEventListener(MEMBERSHIP_INVALIDATED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
