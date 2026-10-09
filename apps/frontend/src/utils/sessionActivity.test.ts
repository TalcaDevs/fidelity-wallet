import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLastActivity,
  consumeLogoutReason,
  getLastActivity,
  isSessionInactive,
  isTokenExpiringSoon,
  setLastActivity,
  setLogoutReason,
} from './sessionActivity';

describe('sessionActivity utilities', () => {
  let localStore: Record<string, string> = {};
  let sessionStore: Record<string, string> = {};

  beforeEach(() => {
    localStore = {};
    sessionStore = {};

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStore[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        localStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete localStore[key];
      }),
    });

    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => sessionStore[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        sessionStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStore[key];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('manages last activity timestamp in storage', () => {
    expect(getLastActivity()).toBeNull();

    setLastActivity(123456);
    expect(getLastActivity()).toBe(123456);

    clearLastActivity();
    expect(getLastActivity()).toBeNull();
  });

  it('evaluates session inactivity correctly', () => {
    expect(isSessionInactive(1000)).toBe(false);

    setLastActivity(1000);
    expect(isSessionInactive(500, undefined, 1400)).toBe(false);
    expect(isSessionInactive(500, undefined, 1500)).toBe(true);
    expect(isSessionInactive(500, undefined, 2000)).toBe(true);
  });

  it('manages and consumes logout reason', () => {
    expect(consumeLogoutReason()).toBeNull();

    setLogoutReason('inactivity');
    expect(consumeLogoutReason()).toBe('inactivity');
    expect(consumeLogoutReason()).toBeNull();
  });

  it('evaluates whether token is expiring soon', () => {
    const now = 1000000;
    expect(isTokenExpiringSoon(null, 60000, now)).toBe(false);

    const validSession = {
      expires_at: 1000 + 300,
    } as Session;
    expect(isTokenExpiringSoon(validSession, 60000, now)).toBe(false);

    const expiringSession = {
      expires_at: 1000 + 50,
    } as Session;
    expect(isTokenExpiringSoon(expiringSession, 60000, now)).toBe(true);

    const expiredSession = {
      expires_at: 999,
    } as Session;
    expect(isTokenExpiringSoon(expiredSession, 60000, now)).toBe(false);
  });
});
