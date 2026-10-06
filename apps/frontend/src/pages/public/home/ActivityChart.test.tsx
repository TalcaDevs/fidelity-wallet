import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityChart } from "./ActivityChart";

const preference = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => preference.reducedMotion };
});

let observerCallback: IntersectionObserverCallback;
let observer: IntersectionObserver;
let hidden = false;
const disconnect = vi.fn();

function setOnscreen(isIntersecting: boolean) {
  act(() =>
    observerCallback(
      [{ isIntersecting } as IntersectionObserverEntry],
      observer,
    ),
  );
}

function setPageVisible(visible: boolean) {
  hidden = !visible;
  fireEvent(document, new Event("visibilitychange"));
}

function advance(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  preference.reducedMotion = false;
  hidden = false;
  disconnect.mockClear();
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
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

describe("ActivityChart", () => {
  it("switches between clearly labeled example metrics and resets each metric to its starting data", async () => {
    const user = userEvent.setup();
    render(<ActivityChart />);
    setOnscreen(true);
    const selector = within(
      screen.getByRole("group", { name: "Métrica del gráfico de ejemplo" }),
    );
    expect(screen.getByText("DATOS DE EJEMPLO")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Visitas de ejemplo de lunes a domingo",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("347")).toBeInTheDocument();

    await user.click(selector.getByRole("button", { name: "Canjes" }));
    expect(
      screen.getByRole("img", { name: "Canjes de ejemplo de lunes a domingo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("recompensas entregadas")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(selector.getByRole("button", { name: "Canjes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(selector.getByRole("button", { name: "Visitas" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    advance(3400);
    expect(screen.getByText("42")).toBeInTheDocument();

    await user.click(selector.getByRole("button", { name: "Visitas" }));
    expect(screen.getByText("347")).toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("freezes the current data while paused and resumes updates afterward", () => {
    const { rerender } = render(<ActivityChart />);
    setOnscreen(true);
    advance(3400);
    expect(screen.getByText("364")).toBeInTheDocument();

    rerender(<ActivityChart motionPaused />);
    advance(10_200);
    expect(screen.getByText("364")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);

    rerender(<ActivityChart motionPaused={false} />);
    advance(3400);
    expect(screen.getByText("347")).toBeInTheDocument();
  });

  it("runs updates only while the chart is onscreen and the browser page is visible", () => {
    render(<ActivityChart />);
    advance(3400);
    expect(screen.getByText("347")).toBeInTheDocument();

    setOnscreen(true);
    advance(3400);
    expect(screen.getByText("364")).toBeInTheDocument();

    setPageVisible(false);
    advance(3400);
    expect(screen.getByText("364")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);

    setPageVisible(true);
    advance(3400);
    expect(screen.getByText("347")).toBeInTheDocument();

    setOnscreen(false);
    advance(3400);
    expect(screen.getByText("347")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps metric controls usable without autoplay when reduced motion is preferred", async () => {
    preference.reducedMotion = true;
    const user = userEvent.setup();
    render(<ActivityChart />);
    setOnscreen(true);
    advance(3400);
    expect(screen.getByText("347")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    await user.click(screen.getByRole("button", { name: "Canjes" }));
    expect(screen.getByText("38")).toBeInTheDocument();
  });

  it("cleans up its active update timer and observer when removed", () => {
    const { unmount } = render(<ActivityChart />);
    setOnscreen(true);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(disconnect).toHaveBeenCalledOnce();
    setPageVisible(false);
    advance(3400);
    expect(vi.getTimerCount()).toBe(0);
  });
});
