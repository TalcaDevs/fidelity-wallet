import { renderHook, act } from "@testing-library/react";
import type { PointerEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCardTilt } from "./useCardTilt";
afterEach(() => vi.unstubAllGlobals());
describe("card tilt", () => {
  it("does not throw when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useCardTilt(true, true));
    expect(() =>
      act(() =>
        result.current.handlePointerMove({
          pointerType: "mouse",
        } as PointerEvent<HTMLDivElement>),
      ),
    ).not.toThrow();
    expect(result.current.rotateX.get()).toBe(0);
    expect(result.current.rotateY.get()).toBe(0);
  });
  it("ignores zero-size targets instead of generating invalid tilt values", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const target = document.createElement("div");
    const { result } = renderHook(() => useCardTilt(true, true));
    act(() =>
      result.current.handlePointerMove({
        pointerType: "mouse",
        currentTarget: target,
        clientX: 20,
        clientY: 20,
      } as PointerEvent<HTMLDivElement>),
    );
    expect(result.current.rotateX.get()).toBe(0);
    expect(result.current.rotateY.get()).toBe(0);
  });
});
