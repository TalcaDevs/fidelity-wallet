import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthParticles } from './AuthParticles';

describe('Login particle lifecycle', () => {
  const callbacks: FrameRequestCallback[] = [];
  const frame = vi.fn((callback: FrameRequestCallback) => { callbacks.push(callback); return 42; });
  const cancel = vi.fn();
  const disconnect = vi.fn();
  const fill = vi.fn();
  const arc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    callbacks.length = 0;
    vi.stubGlobal('requestAnimationFrame', frame);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); disconnect = disconnect; });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn(), setTransform: vi.fn(), beginPath: vi.fn(), arc, fill } as unknown as CanvasRenderingContext2D);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('draws a static backdrop without an animation loop for reduced motion', () => {
    const { unmount } = render(<AuthParticles dark reducedMotion />);
    expect(fill).toHaveBeenCalled();
    expect(frame).not.toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('keeps moving and drawing without any pointer interaction', () => {
    const { unmount } = render(<AuthParticles dark reducedMotion={false} />);
    const initial = arc.mock.calls[0].slice(0, 2);
    const count = arc.mock.calls.length;
    for (let time = 40; time <= 3200; time += 40) callbacks.shift()!(time);
    const latest = arc.mock.calls[arc.mock.calls.length - count].slice(0, 2);
    expect(Math.hypot(latest[0] - initial[0], latest[1] - initial[1])).toBeGreaterThan(5);
    expect(frame.mock.calls.length).toBeGreaterThan(1);
    unmount();
    expect(cancel).toHaveBeenCalledWith(42);
  });

  it('stops on hidden tabs, resumes on return and releases its frame on unmount', () => {
    const { unmount } = render(<AuthParticles dark reducedMotion={false} />);
    expect(frame).toHaveBeenCalledOnce();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cancel).toHaveBeenCalledWith(42);
    expect(frame).toHaveBeenCalledOnce();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frame).toHaveBeenCalledTimes(2);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frame).toHaveBeenCalledTimes(2);
  });
});
