import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVITY_EVENTS, useActivityListeners } from '../useActivityListeners';

describe('useActivityListeners', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('attaches listeners and calls onActivity when enabled and throttles events', () => {
    const onActivity = vi.fn();
    const now = 1000000;
    vi.setSystemTime(now);

    renderHook(() =>
      useActivityListeners({
        enabled: true,
        throttleMs: 1000,
        onActivity,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    expect(onActivity).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1100);
    act(() => {
      window.dispatchEvent(new Event('click'));
    });
    expect(onActivity).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    act(() => {
      window.dispatchEvent(new Event('keydown'));
    });
    expect(onActivity).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(600);
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    expect(onActivity).toHaveBeenCalledTimes(2);
  });

  it('does not listen for events when enabled is false', () => {
    const onActivity = vi.fn();

    renderHook(() =>
      useActivityListeners({
        enabled: false,
        throttleMs: 1000,
        onActivity,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event('click'));
    });
    expect(onActivity).not.toHaveBeenCalled();
  });

  it('removes event listeners on unmount', () => {
    const onActivity = vi.fn();
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useActivityListeners({
        enabled: true,
        throttleMs: 1000,
        onActivity,
      }),
    );

    unmount();

    ACTIVITY_EVENTS.forEach((event) => {
      expect(removeSpy).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });
});
