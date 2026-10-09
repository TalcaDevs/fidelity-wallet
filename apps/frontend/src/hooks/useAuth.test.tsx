import { act, renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import * as inactivityModule from './useInactivityTimeout';

type AuthStateCallback = Parameters<typeof supabase.auth.onAuthStateChange>[0];

const mockSession: Session = {
  access_token: 'fake-jwt',
  refresh_token: 'fake-refresh',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: 'user-auth-123',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01',
  },
};

describe('useAuth hook', () => {
  let authEventCallback: AuthStateCallback | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    authEventCallback = null;

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation((cb) => {
      authEventCallback = cb;
      return {
        data: {
          subscription: {
            id: 'sub-1',
            callback: cb,
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads initial session and sets loading to false', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.isRecoveringPassword).toBe(false);
  });

  it('updates session when onAuthStateChange fires', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const updatedSession = { ...mockSession, access_token: 'new-token' };
    act(() => {
      authEventCallback?.('TOKEN_REFRESHED', updatedSession);
    });

    expect(result.current.session?.access_token).toBe('new-token');
  });

  it('sets isRecoveringPassword on PASSWORD_RECOVERY event and finishes on callback', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      authEventCallback?.('PASSWORD_RECOVERY', mockSession);
    });

    expect(result.current.isRecoveringPassword).toBe(true);

    act(() => {
      result.current.finishPasswordRecovery();
    });

    expect(result.current.isRecoveringPassword).toBe(false);
  });

  it('signs out and prevents session refresh on tab visibility change if session is inactive', async () => {
    const signOutSpy = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    const refreshSpy = vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValue({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });

    vi.spyOn(inactivityModule, 'isSessionInactive').mockReturnValue(true);

    renderHook(() => useAuth());

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(signOutSpy).toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('refreshes session on tab visibility change if token expires within 5 minutes and not inactive', async () => {
    const expiringSession: Session = {
      ...mockSession,
      expires_at: Math.floor(Date.now() / 1000) + 120,
    };

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: expiringSession },
      error: null,
    });
    const refreshSpy = vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValue({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });
    vi.spyOn(inactivityModule, 'isSessionInactive').mockReturnValue(false);

    renderHook(() => useAuth());

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(refreshSpy).toHaveBeenCalled();
  });
});
