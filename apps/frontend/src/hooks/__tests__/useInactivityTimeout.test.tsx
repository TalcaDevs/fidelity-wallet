import { act, renderHook } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVITY_STORAGE_KEY,
  clearLastActivity,
  getLastActivity,
  isSessionInactive,
  LOGOUT_REASON_KEY,
  setLastActivity,
  useInactivityTimeout,
} from '../useInactivityTimeout';

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

  it('does not wipe persisted activity when session is null', () => {
    const onTimeout = vi.fn();
    setLastActivity(5000);
    renderHook(() => useInactivityTimeout(null, { onTimeout }));

    expect(getLastActivity()).toBe(5000);
  });

  it('initializes last activity timestamp when session is present', () => {
    const onTimeout = vi.fn();
    const now = 1000000;
    vi.setSystemTime(now);

    renderHook(() => useInactivityTimeout(mockSession, { onTimeout }));

    expect(getLastActivity()).toBe(now);
  });

  it('updates timestamp on user activity after throttle window', () => {
    const onTimeout = vi.fn();
    const start = 1000000;
    vi.setSystemTime(start);

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        throttleMs: 1000,
        timeoutMs: 5000,
        checkIntervalMs: 500,
        onTimeout,
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
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        throttleMs: 1000,
        timeoutMs: 5000,
        checkIntervalMs: 500,
        onTimeout,
        onActivity,
      }),
    );

    vi.advanceTimersByTime(1100);
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('checks expiration before recording activity when clock advances past limit without interval', () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onActivity = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        throttleMs: 1000,
        timeoutMs: 5000,
        checkIntervalMs: 60000,
        onTimeout,
        onActivity,
      }),
    );

    // Advance system clock past timeoutMs without firing interval timers
    vi.setSystemTime(start + 6000);

    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onActivity).not.toHaveBeenCalled();
    expect(getLastActivity()).toBeNull();
  });

  it('triggers onTimeout and sets reason in sessionStorage when idle exceeds timeout', async () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onTimeout = vi.fn();

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
  });

  it('preserves expired timestamp and retries when onTimeout rejects', async () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onTimeout = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce(undefined);

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        timeoutMs: 3000,
        checkIntervalMs: 1000,
        onTimeout,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(getLastActivity()).toBe(start);
    expect(isSessionInactive(3000)).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onTimeout).toHaveBeenCalledTimes(2);
    expect(getLastActivity()).toBeNull();
  });

  it('resets termination flag on new session and triggers timeout after second idle period', () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onTimeout = vi.fn();

    const { rerender } = renderHook(
      ({ session }) =>
        useInactivityTimeout(session, {
          timeoutMs: 3000,
          checkIntervalMs: 1000,
          onTimeout,
        }),
      { initialProps: { session: mockSession as Session | null } },
    );

    vi.advanceTimersByTime(3500);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    rerender({ session: null });

    const newStart = 2000000;
    vi.setSystemTime(newStart);
    rerender({ session: { ...mockSession, user: { ...mockSession.user, id: 'user-2' } } });

    vi.advanceTimersByTime(3500);
    expect(onTimeout).toHaveBeenCalledTimes(2);
  });

  it('synchronizes last activity timestamp from other tabs via storage event', () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        timeoutMs: 5000,
        checkIntervalMs: 1000,
        onTimeout,
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

  it('handles storage removal without triggering false timeout', () => {
    const start = 1000000;
    vi.setSystemTime(start);
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimeout(mockSession, {
        timeoutMs: 5000,
        checkIntervalMs: 1000,
        onTimeout,
      }),
    );

    act(() => {
      delete localStore[ACTIVITY_STORAGE_KEY];
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: ACTIVITY_STORAGE_KEY,
          newValue: null,
        }),
      );
    });

    vi.advanceTimersByTime(6000);
    expect(onTimeout).not.toHaveBeenCalled();
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
