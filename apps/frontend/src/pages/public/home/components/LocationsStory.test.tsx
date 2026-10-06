import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocationsStory } from "./LocationsStory";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useInView: () => true, useReducedMotion: () => true };
});

describe("LocationsStory", () => {
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
    const { container } = render(<LocationsStory motionPaused />);
    expect(
      screen.getByRole("link", { name: "Conectemos tus sucursales" }),
    ).toHaveAttribute("href", "#contacto");
    expect(screen.getByText("Mapa de ejemplo")).toBeInTheDocument();
    expect(container.querySelector(".fw-locations-sticky")).toHaveAttribute(
      "data-motion",
      "paused",
    );
    await user.click(
      screen.getByRole("button", { name: "Ver sucursal Ribera en el mapa" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Café Esquina · Ribera",
    );
  });
});
