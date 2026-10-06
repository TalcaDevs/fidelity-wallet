import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoyaltyCardStage } from "./LoyaltyCardStage";

const animation = vi.hoisted(() => ({
  reducedMotion: false,
  fail: null as "throw" | "reject" | null,
  pending: [] as Array<() => void>,
  stop: vi.fn(),
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  const { useRef } = await import("react");
  // Keep the real DOM interactions; control only the rendered entrance timeline.
  const animate = () => {
    if (animation.fail === "throw") throw new Error("Animation unavailable");
    const complete =
      animation.fail === "reject"
        ? Promise.reject(new Error("Animation interrupted"))
        : new Promise<void>((resolve) => animation.pending.push(resolve));
    return Object.assign(complete, { stop: animation.stop });
  };
  return {
    ...actual,
    useAnimate: () => [useRef<HTMLDivElement>(null), animate],
    useReducedMotion: () => animation.reducedMotion,
  };
});

let intersectionCallback: IntersectionObserverCallback;
let observer: IntersectionObserver;
let hidden = false;
const disconnect = vi.fn();

function setOnscreen(visible: boolean) {
  act(() =>
    intersectionCallback(
      [
        {
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      observer,
    ),
  );
}

function setDocumentVisible(visible: boolean) {
  hidden = !visible;
  fireEvent(document, new Event("visibilitychange"));
}

async function finishEntrance() {
  await act(async () => {
    animation.pending.splice(0).forEach((resolve) => resolve());
  });
}

async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

function expectStamps(count: number) {
  expect(
    screen.getByRole("group", {
      name: `Tarjeta de ejemplo de Café Esquina: ${count} de 10 sellos`,
    }),
  ).toBeInTheDocument();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  animation.reducedMotion = false;
  animation.fail = null;
  animation.pending.length = 0;
  animation.stop.mockClear();
  disconnect.mockClear();
  hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
        observer = this as unknown as IntersectionObserver;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LoyaltyCardStage", () => {
  it("waits for the entrance, then tells the story one stamp at a time and stops at the reward", async () => {
    const onReady = vi.fn();
    render(<LoyaltyCardStage onReady={onReady} replayKey={0} />);
    setOnscreen(true);
    expectStamps(2);
    expect(screen.getByRole("button", { name: "Probar yo" })).toBeDisabled();
    await advance(1000);
    expectStamps(2);
    await finishEntrance();
    expect(onReady).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Demostración automática en curso.",
    );
    await advance(699);
    expectStamps(2);
    await advance(1);
    expectStamps(3);
    for (let count = 4; count <= 10; count += 1) {
      await advance(700);
      expectStamps(count);
    }
    expect(screen.getByText("¡Café desbloqueado!")).toBeInTheDocument();
    expect(screen.getByText("Ya está invitado.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "10 de 10 sellos. ¡Recompensa desbloqueada!",
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    await advance(10000);
    expectStamps(10);
  });

  it("lets a visitor take over from two stamps, collect a reward, and repeat manually", async () => {
    render(<LoyaltyCardStage onReady={vi.fn()} replayKey={0} />);
    setOnscreen(true);
    await finishEntrance();
    await advance(700);
    expectStamps(3);
    fireEvent.click(screen.getByRole("button", { name: "Probar yo" }));
    expectStamps(2);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Demostración manual.",
    );
    await advance(5000);
    expectStamps(2);
    for (let count = 3; count <= 10; count += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Sumar un sello" }));
      expectStamps(count);
    }
    fireEvent.click(screen.getByRole("button", { name: "Volver a probar" }));
    expectStamps(2);
    fireEvent.click(screen.getByRole("button", { name: "Sumar un sello" }));
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
    expectStamps(2);
    expect(
      screen.getByRole("button", { name: "Sumar un sello" }),
    ).toBeEnabled();
  });

  it("pauses without losing progress or the remaining time until the next stamp", async () => {
    const onReady = vi.fn();
    const { rerender } = render(
      <LoyaltyCardStage onReady={onReady} replayKey={0} />,
    );
    setOnscreen(true);
    await finishEntrance();
    await advance(300);
    rerender(<LoyaltyCardStage onReady={onReady} replayKey={0} motionPaused />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Demostración automática en pausa.",
    );
    await advance(5000);
    expectStamps(2);
    rerender(
      <LoyaltyCardStage onReady={onReady} replayKey={0} motionPaused={false} />,
    );
    await advance(399);
    expectStamps(2);
    await advance(1);
    expectStamps(3);
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("reveals the card immediately when paused during the entrance and keeps manual controls usable", async () => {
    const onReady = vi.fn();
    const { rerender } = render(
      <LoyaltyCardStage onReady={onReady} replayKey={0} />,
    );
    setOnscreen(true);
    rerender(<LoyaltyCardStage onReady={onReady} replayKey={0} motionPaused />);
    expect(screen.getByRole("button", { name: "Probar yo" })).toBeEnabled();
    expect(onReady).toHaveBeenCalledOnce();
    expect(animation.stop).toHaveBeenCalled();
    await finishEntrance();
    await advance(5000);
    expectStamps(2);
    expect(onReady).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Probar yo" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar un sello" }));
    expectStamps(3);
  });

  it("suspends offscreen and hidden-tab playback, then resumes without catch-up jumps", async () => {
    render(<LoyaltyCardStage onReady={vi.fn()} replayKey={0} />);
    setOnscreen(true);
    await finishEntrance();
    await advance(200);
    setOnscreen(false);
    await advance(5000);
    expectStamps(2);
    setOnscreen(true);
    await advance(499);
    expectStamps(2);
    await advance(1);
    expectStamps(3);
    await advance(100);
    setDocumentVisible(false);
    await advance(5000);
    expectStamps(3);
    setDocumentVisible(true);
    await advance(599);
    expectStamps(3);
    await advance(1);
    expectStamps(4);
  });

  it("skips entrance and autoplay for reduced motion while preserving manual rewards", async () => {
    animation.reducedMotion = true;
    const onReady = vi.fn();
    render(<LoyaltyCardStage onReady={onReady} replayKey={0} />);
    setOnscreen(true);
    expect(
      screen.getByRole("button", { name: "Sumar un sello" }),
    ).toBeEnabled();
    expect(onReady).toHaveBeenCalledOnce();
    expect(animation.pending).toHaveLength(0);
    await advance(10000);
    expectStamps(2);
    for (let count = 3; count <= 10; count += 1)
      fireEvent.click(screen.getByRole("button", { name: "Sumar un sello" }));
    expectStamps(10);
    expect(screen.getByText("¡Café desbloqueado!")).toBeInTheDocument();
  });

  it("resets the entire story on replay and waits for the new entrance before restarting autoplay", async () => {
    const onReady = vi.fn();
    const { rerender } = render(
      <LoyaltyCardStage onReady={onReady} replayKey={0} />,
    );
    setOnscreen(true);
    await finishEntrance();
    await advance(700);
    await advance(700);
    expectStamps(4);
    rerender(<LoyaltyCardStage onReady={onReady} replayKey={1} />);
    expectStamps(2);
    expect(screen.getByRole("button", { name: "Probar yo" })).toBeDisabled();
    await advance(1000);
    expectStamps(2);
    await finishEntrance();
    await advance(699);
    expectStamps(2);
    await advance(1);
    expectStamps(3);
    expect(onReady).toHaveBeenCalledTimes(2);
  });

  it("cleans up a StrictMode entrance without late readiness announcements", async () => {
    const onReady = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <LoyaltyCardStage onReady={onReady} replayKey={0} />
      </StrictMode>,
    );
    unmount();
    await finishEntrance();
    await advance(10000);
    expect(onReady).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(animation.stop).toHaveBeenCalledTimes(2);
  });

  it("runs a single autoplay in StrictMode and removes pending timers on unmount", async () => {
    const onReady = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <LoyaltyCardStage onReady={onReady} replayKey={0} />
      </StrictMode>,
    );
    setOnscreen(true);
    await finishEntrance();
    expect(onReady).toHaveBeenCalledOnce();
    await advance(700);
    expectStamps(3);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await advance(10000);
    expect(onReady).toHaveBeenCalledOnce();
  });

  it("recovers from an entrance timeline that never completes", async () => {
    const onReady = vi.fn();
    render(<LoyaltyCardStage onReady={onReady} replayKey={0} />);
    setOnscreen(true);
    await advance(3000);
    expect(screen.getByRole("button", { name: "Probar yo" })).toBeEnabled();
    expectStamps(2);
    expect(onReady).toHaveBeenCalledOnce();
    await finishEntrance();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it.each(["throw", "reject"] as const)(
    "unlocks the demo if its entrance fails with a %s",
    async (failure) => {
      animation.fail = failure;
      const onReady = vi.fn();
      render(<LoyaltyCardStage onReady={onReady} replayKey={0} />);
      setOnscreen(true);
      await act(async () => {});
      expect(onReady).toHaveBeenCalledOnce();
      expect(screen.getByRole("button", { name: "Probar yo" })).toBeEnabled();
    },
  );
});
