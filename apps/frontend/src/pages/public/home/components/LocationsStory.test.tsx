import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocationsStory } from "./LocationsStory";

const preference = vi.hoisted(() => ({ reducedMotion: false, inView: true }));
beforeEach(() => {
  preference.reducedMotion = false;
  preference.inView = true;
});

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useInView: () => preference.inView,
    useReducedMotion: () => preference.reducedMotion,
  };
});

describe("LocationsStory", () => {
  it("runs onscreen motion and pauses it for OS preference, offscreen state and explicit pause", () => {
    const { rerender } = render(<LocationsStory />);
    const map = screen.getByRole("group", {
      name: "Mapa interactivo de sucursales",
    });
    expect(map).toHaveAttribute("data-motion", "running");
    preference.reducedMotion = true;
    rerender(<LocationsStory />);
    expect(map).toHaveAttribute("data-motion", "paused");
    preference.reducedMotion = false;
    preference.inView = false;
    rerender(<LocationsStory />);
    expect(map).toHaveAttribute("data-motion", "paused");
    preference.inView = true;
    rerender(<LocationsStory motionPaused />);
    expect(map).toHaveAttribute("data-motion", "paused");
    rerender(<LocationsStory />);
    expect(map).toHaveAttribute("data-motion", "running");
  });
  it("lets visitors select an illustrative branch from both the map and the selector", async () => {
    const user = userEvent.setup();
    render(<LocationsStory />);
    const selector = screen.getByRole("group", {
      name: "Explora las sucursales de ejemplo",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Café Esquina · Centro",
    );
    expect(
      screen.getByRole("button", { name: "Ver sucursal Centro en el mapa" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      screen.getByRole("button", { name: "Ver sucursal Parque en el mapa" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Av. del Parque 450 · Dirección de ejemplo",
    );
    expect(
      within(selector).getByRole("button", { name: "02 Parque" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Ver sucursal Centro en el mapa" }),
    ).toHaveAttribute("aria-pressed", "false");

    const ribera = within(selector).getByRole("button", { name: "03 Ribera" });
    ribera.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Café Esquina · Ribera",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Costanera 280");
    expect(
      screen.getByRole("button", { name: "Ver sucursal Ribera en el mapa" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the contact path and branch interactions available when motion is paused", async () => {
    const user = userEvent.setup();
    render(<LocationsStory motionPaused />);
    expect(
      screen.getByRole("link", { name: "Conectemos tus sucursales" }),
    ).toHaveAttribute("href", "#contacto");
    expect(screen.getByText("Mapa de ejemplo")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Mapa interactivo de sucursales" }),
    ).toHaveAttribute("data-motion", "paused");
    await user.click(
      screen.getByRole("button", { name: "Ver sucursal Ribera en el mapa" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Café Esquina · Ribera",
    );
  });
});
