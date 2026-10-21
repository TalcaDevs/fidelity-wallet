import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthError, Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuth } from '../auth/SupabaseAuth';
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
  let localStore: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    authEventCallback = null;
    localStore = {};

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
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it('signs out automatically with local scope when restoring a session after 61 minutes of inactivity', async () => {
    const now = 10000000;
    vi.setSystemTime(now);
    const sixtyOneMinutesAgo = now - 61 * 60 * 1000;
    localStore[inactivityModule.ACTIVITY_STORAGE_KEY] = String(sixtyOneMinutesAgo);

    const signOutSpy = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.session).toBeNull();
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it('does not reset expired activity when SIGNED_IN is emitted without user interaction during restoration', async () => {
    const now = 10000000;
    vi.setSystemTime(now);
    const sixtyOneMinutesAgo = now - 61 * 60 * 1000;
    localStore[inactivityModule.ACTIVITY_STORAGE_KEY] = String(sixtyOneMinutesAgo);

    const signOutSpy = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    act(() => {
      authEventCallback?.('SIGNED_IN', mockSession);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.session).toBeNull();
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it('preserves existing activity timestamp when SIGNED_IN reconfirms an active session without interaction', async () => {
    const now = 10000000;
    vi.setSystemTime(now);
    const twentyMinutesAgo = now - 20 * 60 * 1000;
    localStore[inactivityModule.ACTIVITY_STORAGE_KEY] = String(twentyMinutesAgo);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      authEventCallback?.('SIGNED_IN', mockSession);
    });

    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBe(String(twentyMinutesAgo));
    expect(result.current.session).toEqual(mockSession);
  });

  it('preserves expired timestamp, blocks local session access, and retries when signOut returns an error', async () => {
    const now = 10000000;
    vi.setSystemTime(now);
    const sixtyOneMinutesAgo = now - 61 * 60 * 1000;
    localStore[inactivityModule.ACTIVITY_STORAGE_KEY] = String(sixtyOneMinutesAgo);

    const signOutSpy = vi
      .spyOn(supabase.auth, 'signOut')
      .mockResolvedValueOnce({ error: { message: 'SignOut failed' } as AuthError })
      .mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.session).toBeNull();
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBe(String(sixtyOneMinutesAgo));
    expect(inactivityModule.isSessionInactive()).toBe(true);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(signOutSpy).toHaveBeenCalledTimes(2);
    expect(signOutSpy).toHaveBeenLastCalledWith({ scope: 'local' });
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it('preserves expired timestamp, blocks local session access, and retries when signOut rejects', async () => {
    const now = 10000000;
    vi.setSystemTime(now);
    const sixtyOneMinutesAgo = now - 61 * 60 * 1000;
    localStore[inactivityModule.ACTIVITY_STORAGE_KEY] = String(sixtyOneMinutesAgo);

    const signOutSpy = vi
      .spyOn(supabase.auth, 'signOut')
      .mockRejectedValueOnce(new Error('Network offline'))
      .mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.current.session).toBeNull();
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBe(String(sixtyOneMinutesAgo));
    expect(inactivityModule.isSessionInactive()).toBe(true);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(signOutSpy).toHaveBeenCalledTimes(2);
    expect(signOutSpy).toHaveBeenLastCalledWith({ scope: 'local' });
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });

  it('preserves inactivity lock when login fails while signOut is still pending, preventing session recovery on reload', async () => {
    const now = 10000000;
    vi.setSystemTime(now);
    const sixtyOneMinutesAgo = now - 61 * 60 * 1000;
    localStore[inactivityModule.ACTIVITY_STORAGE_KEY] = String(sixtyOneMinutesAgo);

    // 1. Keep logout request pending while old session remains persisted in Supabase
    const signOutSpy = vi
      .spyOn(supabase.auth, 'signOut')
      .mockImplementation(() => new Promise(() => {}));

    const firstHook = renderHook(() => useAuth());

    await waitFor(() => {
      expect(firstHook.result.current.loading).toBe(false);
    });

    expect(firstHook.result.current.session).toBeNull();
    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBe(String(sixtyOneMinutesAgo));

    // 2. Attempt login with invalid credentials via SupabaseAuth while logout is pending
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' } as AuthError,
    });

    const { container, unmount: unmountAuthForm } = render(
      <MemoryRouter>
        <SupabaseAuth />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'owner@comercio.cl' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials');
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBe(String(sixtyOneMinutesAgo));

    // 3. Simulate page reload before logout finishes: old session is still returned by getSession()
    unmountAuthForm();
    firstHook.unmount();

    const reloadedHook = renderHook(() => useAuth());

    await waitFor(() => {
      expect(reloadedHook.result.current.loading).toBe(false);
    });

    expect(reloadedHook.result.current.session).toBeNull();
    expect(signOutSpy).toHaveBeenCalledTimes(2);
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBe(String(sixtyOneMinutesAgo));

    // 4. Subsequent valid login creates a new session and renews activity timestamp
    const newSession: Session = {
      ...mockSession,
      access_token: 'fresh-jwt-token',
    };
    vi.spyOn(supabase.auth, 'signInWithPassword').mockImplementationOnce(async () => {
      authEventCallback?.('SIGNED_IN', newSession);
      return {
        data: { user: newSession.user, session: newSession },
        error: null,
      };
    });

    const { container: validFormContainer } = render(
      <MemoryRouter>
        <SupabaseAuth />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'owner@comercio.cl' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'correct-password' },
    });
    await act(async () => {
      fireEvent.submit(validFormContainer.querySelector('form')!);
    });

    expect(reloadedHook.result.current.session).toEqual(newSession);
    expect(localStore[inactivityModule.ACTIVITY_STORAGE_KEY]).toBe(String(now));
  });

  it('signs out once with local scope and prevents session refresh on visibilitychange when activity is expired', async () => {
    const now = 10000000;
    vi.setSystemTime(now);

    const signOutSpy = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    const refreshSpy = vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValue({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.session).toEqual(mockSession);

    // Advance system clock past 60 minutes without running intervals
    vi.setSystemTime(now + 61 * 60 * 1000);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
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

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(signOutSpy).toHaveBeenCalledWith({ scope: 'local' });
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
