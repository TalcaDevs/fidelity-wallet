import { act, renderHook } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  ACTIVITY_STORAGE_KEY,
  clearLastActivity,
  getLastActivity,
  isSessionInactive,
  LOGOUT_REASON_KEY,
  setLastActivity,
  useInactivityTimeout,
} from './useInactivityTimeout';

const mockSession: Session = {
  access_token: 'fake-token',
  refresh_token: 'fake-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01',
  },
};

describe('useInactivityTimeout and activity utilities', () => {
  let localStore: Record<string, string> = {};
  let sessionStore: Record<string, string> = {};

  beforeEach(() => {
    vi.useFakeTimers();
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
      clear: vi.fn(() => {
        localStore = {};
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
      clear: vi.fn(() => {
        sessionStore = {};
      }),
    });

    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('utilities manage storage correctly', () => {
    expect(getLastActivity()).toBeNull();
    expect(isSessionInactive(1000)).toBe(false);

    setLastActivity(100000);
    expect(getLastActivity()).toBe(100000);
    expect(isSessionInactive(1000, ACTIVITY_STORAGE_KEY, 100500)).toBe(false);
    expect(isSessionInactive(1000, ACTIVITY_STORAGE_KEY, 102000)).toBe(true);

    clearLastActivity();
    expect(getLastActivity()).toBeNull();
  });

  it('does not monitor activity or set storage if session is null', () => {
    setLastActivity(5000);
    renderHook(() => useInactivityTimeout(null));

    expect(getLastActivity()).toBeNull();
  });

  it('initializes last activity timestamp when session is present', () => {
    const now = 1000000;
    vi.setSystemTime(now);

    renderHook(() => useInactivityTimeout(mockSession));

    expect(getLastActivity()).toBe(now);
  });

  it('updates timestamp on user activity after throttle window', () => {
    const start = 1000000;
    vi.setSystemTime(start);

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        throttleMs: 1000,
        timeoutMs: 5000,
        checkIntervalMs: 500,
      }),
    );

    expect(getLastActivity()).toBe(start);

    vi.advanceTimersByTime(500);
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    expect(getLastActivity()).toBe(start);

    vi.advanceTimersByTime(600);
    act(() => {
      window.dispatchEvent(new Event('click'));
    });
    expect(getLastActivity()).toBe(start + 1100);
  });

  it('calls onActivity callback when user activity is detected', () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onActivity = vi.fn();

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        throttleMs: 1000,
        timeoutMs: 5000,
        checkIntervalMs: 500,
        onActivity,
      }),
    );

    vi.advanceTimersByTime(1100);
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('triggers onTimeout and sets reason in sessionStorage when idle exceeds timeout', async () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onTimeout = vi.fn();
    const signOutSpy = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        timeoutMs: 3000,
        checkIntervalMs: 1000,
        onTimeout,
      }),
    );

    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3500);

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(sessionStore[LOGOUT_REASON_KEY]).toBe('inactivity');
    expect(getLastActivity()).toBeNull();
    expect(signOutSpy).not.toHaveBeenCalled();
  });

  it('calls supabase.auth.signOut by default on inactivity timeout', async () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const signOutSpy = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        timeoutMs: 2000,
        checkIntervalMs: 500,
      }),
    );

    vi.advanceTimersByTime(2500);

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(sessionStore[LOGOUT_REASON_KEY]).toBe('inactivity');
  });

  it('synchronizes last activity timestamp from other tabs via storage event', () => {
    const start = 1000000;
    vi.setSystemTime(start);

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        timeoutMs: 5000,
        checkIntervalMs: 1000,
      }),
    );

    act(() => {
      localStore[ACTIVITY_STORAGE_KEY] = '1002000';
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: ACTIVITY_STORAGE_KEY,
          newValue: '1002000',
        }),
      );
    });

    vi.advanceTimersByTime(4000);
    expect(sessionStore[LOGOUT_REASON_KEY]).toBeUndefined();
  });

  it('checks for timeout immediately when tab becomes visible after long sleep', () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        timeoutMs: 5000,
        checkIntervalMs: 60000,
        onTimeout,
      }),
    );

    vi.setSystemTime(start + 10000);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
