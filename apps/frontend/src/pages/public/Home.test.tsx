import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Home } from "./Home";

// The animated card's interaction and lifecycle are covered in its own tests.
vi.mock("./home/components/LoyaltyCardStage", () => ({
  LoyaltyCardStage: () => null,
}));

beforeEach(() => {
  // Layout visibility is a browser concern; keep observers available to the
  // integrated motion sections without inventing viewport geometry in jsdom.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  preference.reducedMotion = false;
  cleanup();
  vi.unstubAllGlobals();
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

const preference = vi.hoisted(() => ({ reducedMotion: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => preference.reducedMotion };
});

describe("Home", () => {
  it("shows the paused control for reduced motion and allows an explicit opt-in", async () => {
    preference.reducedMotion = true;
    const user = userEvent.setup();
    renderHome();
    const button = screen.getByRole("button", { name: "Reanudar animaciones" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("region", { name: /Empieza peque\u00f1o/ }),
    ).toHaveAttribute("data-motion-paused", "true");
    await user.click(button);
    expect(
      screen.getByRole("button", { name: "Pausar animaciones" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("region", { name: /Empieza peque\u00f1o/ }),
    ).toHaveAttribute("data-motion-paused", "false");
  });
  it("pauses motion throughout the page and lets visitors resume without disabling the page controls", async () => {
    const user = userEvent.setup();
    renderHome();
    const plans = screen.getByRole("region", { name: /Empieza pequeño/ });
    expect(plans).toHaveAttribute("data-motion-paused", "false");

    await user.click(
      screen.getByRole("button", { name: "Pausar animaciones" }),
    );
    expect(plans).toHaveAttribute("data-motion-paused", "true");
    expect(
      screen.getByRole("button", { name: "Reanudar animaciones" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Anual" }));
    expect(screen.getByRole("button", { name: "Anual" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(
      screen.getByRole("button", { name: "Reanudar animaciones" }),
    );
    expect(plans).toHaveAttribute("data-motion-paused", "false");
    expect(
      screen.getByRole("button", { name: "Pausar animaciones" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("explains the product without asking for a session", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cómo funciona" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Para quién es" }),
    ).toBeInTheDocument();
  });

  it("offers the panel entry point pointing at the admin login", () => {
    renderHome();
    const links = screen.getAllByRole("link", { name: /Entrar al panel/ });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/admin/login");
    }
  });

  it("connects both contact actions directly to the business contact channels", () => {
    renderHome();
    const whatsapp = screen.getByRole("link", {
      name: "Hablemos por WhatsApp",
    });
    const whatsappUrl = new URL(whatsapp.getAttribute("href")!);
    expect(whatsappUrl.origin).toBe("https://wa.me");
    expect(whatsappUrl.pathname).toBe("/56940453861");
    expect(whatsappUrl.searchParams.get("text")).toContain("Fidelity Wallet");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");

    const email = new URL(
      screen
        .getByRole("link", { name: "Escríbenos por correo" })
        .getAttribute("href")!,
    );
    expect(email.protocol).toBe("mailto:");
    expect(email.pathname).toBe("mezasuarez03@gmail.com");
    expect(email.searchParams.get("subject")).toContain("Fidelity Wallet");
    expect(
      screen.getByRole("link", { name: "Quiero mi tarjeta" }),
    ).toHaveAttribute("href", "#contacto");
  });

  it("lets visitors change the business example and see its matching reward and contact action", async () => {
    const user = userEvent.setup();
    renderHome();
    const examples = screen.getByRole("group", {
      name: "Explora un ejemplo para tu negocio",
    });
    expect(
      within(examples).getByRole("button", { name: "Cafeterías" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      within(examples).getByRole("button", { name: "Restaurantes" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Que el próximo encuentro sea en tu mesa.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("8 visitas = un postre de la casa"),
    ).toBeInTheDocument();
    expect(
      within(examples).getByRole("button", { name: "Cafeterías" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(examples).getByRole("button", { name: "Restaurantes" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("link", {
        name: "Consultar por Fidelity Wallet para restaurantes",
      }),
    ).toHaveAttribute("href", "#contacto");

    await user.click(within(examples).getByRole("button", { name: "Tiendas" }));
    expect(
      screen.getByText("5 sellos = una sorpresa de tu tienda"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("8 visitas = un postre de la casa"),
    ).not.toBeInTheDocument();
  });

  it("updates the example card color and the accessible selected color together", async () => {
    const user = userEvent.setup();
    renderHome();
    const colors = screen.getByRole("group", {
      name: "Color de la tarjeta de ejemplo",
    });
    const preview = screen.getByLabelText("Vista previa del diseño de tarjeta");
    expect(
      within(colors).getByRole("button", { name: "Color azul" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      within(colors).getByRole("button", { name: "Color pizarra" }),
    );
    expect(
      within(colors).getByRole("button", { name: "Color pizarra" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(colors).getByRole("button", { name: "Color azul" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(preview).toHaveStyle({ "--demo-color": "#2F4557" });

    await user.click(
      within(colors).getByRole("button", { name: "Color dorado" }),
    );
    expect(preview).toHaveStyle({ "--demo-color": "#D69E09" });
    expect(
      within(colors).getAllByRole("button", { pressed: true }),
    ).toHaveLength(1);
  });

  it("opens the compact navigation, closes on Escape, and closes after following a section link", async () => {
    const user = userEvent.setup();
    renderHome();
    const menu = screen.getByRole("button", { name: "Abrir menú" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await user.click(menu);
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    const navigation = screen.getByRole("navigation", {
      name: "Navegación principal",
    });
    await user.click(
      within(navigation).getByRole("link", { name: "La experiencia" }),
    );
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
