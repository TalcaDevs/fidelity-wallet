import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CATALOG_PLANS } from "@fidelity/shared";
import { describe, expect, it } from "vitest";
import { PricingSection } from "./PricingSection";

const paidPlans = CATALOG_PLANS.filter((plan) => plan.id !== "TRIAL");
const trial = CATALOG_PLANS.find((plan) => plan.id === "TRIAL")!;

describe("PricingSection", () => {
  it("shows the canonical monthly prices and capacity without presenting the trial as a permanent plan", () => {
    render(<PricingSection />);
    for (const plan of paidPlans) {
      const card = within(screen.getByRole("article", { name: plan.name }));
      expect(
        card.getByLabelText(`$ ${plan.priceClpMonthly.toLocaleString('es-CL')} por mes`),
      ).toBeInTheDocument();
      expect(
        card.getByText(`Hasta ${plan.limits.locations} locales`),
      ).toBeInTheDocument();
      expect(
        card.getByText(`Hasta ${plan.limits.teamUsers} colaboradores`),
      ).toBeInTheDocument();
      expect(card.getByText("Clientes ilimitados")).toBeInTheDocument();
      expect(
        card.getByRole("link", { name: `Consultar por el plan ${plan.name}` }),
      ).toHaveAttribute("href", "#contacto");
    }
    const free = within(
      screen.getByRole("article", { name: new RegExp(trial.name) }),
    );
    expect(free.getByText(`$ ${trial.priceClpMonthly.toLocaleString('es-CL')}`)).toBeInTheDocument();
    expect(free.getByRole("heading")).toHaveTextContent(
      `${trial.trialDays} días`,
    );
    expect(
      free.getByText(new RegExp(`Hasta ${trial.limits.customers} clientes`)),
    ).toBeInTheDocument();
    expect(free.getByText("durante la prueba")).toBeInTheDocument();
    expect(
      screen.getByText(/Precios referenciales en CLP/),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(paidPlans[0].name);
    expect(screen.getByRole("status")).not.toHaveTextContent(trial.name);
  });

  it("shows exact annual rates and full-year totals while keeping the limited trial unchanged", async () => {
    const user = userEvent.setup();
    render(<PricingSection />);
    await user.click(screen.getByRole("button", { name: "Anual" }));
    expect(screen.getByRole("button", { name: "Anual" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const plan of paidPlans) {
      const card = within(screen.getByRole("article", { name: plan.name }));
      const annualRate = plan.priceClpMonthlyAnnual!;
      expect(
        card.getByLabelText(`$ ${annualRate.toLocaleString('es-CL')} por mes`),
      ).toBeInTheDocument();
      expect(
        card.getByText(`$ ${(annualRate * 12).toLocaleString('es-CL')} por año · pago anual`),
      ).toBeInTheDocument();
    }
    expect(
      within(
        screen.getByRole("article", { name: new RegExp(trial.name) }),
      ).getByText(`$ ${trial.priceClpMonthly.toLocaleString('es-CL')}`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mensual" }));
    expect(screen.getByRole("button", { name: "Anual" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByText(/por año · pago anual/)).not.toBeInTheDocument();
  });

  it("recommends enough capacity for both locales and collaborators and avoids underselling an oversized operation", async () => {
    const user = userEvent.setup();
    render(<PricingSection />);
    const pro = CATALOG_PLANS.find((plan) => plan.id === "PRO")!;
    const business = CATALOG_PLANS.find((plan) => plan.id === "BUSINESS")!;
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Locales" }),
      String(pro.limits.locations),
    );
    expect(screen.getByRole("status")).toHaveTextContent(pro.name);
    expect(
      within(screen.getByRole("article", { name: pro.name })).getByText(
        "PARA TU NEGOCIO",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Colaboradores" }),
      String(business.limits.teamUsers),
    );
    expect(screen.getByRole("status")).toHaveTextContent(business.name);
    expect(
      within(screen.getByRole("article", { name: business.name })).getByText(
        "PARA TU NEGOCIO",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Locales" }),
      String(business.limits.locations + 1),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Hablemos de tu operación",
    );
    expect(screen.queryByText("PARA TU NEGOCIO")).not.toBeInTheDocument();
  });

  it("routes every plan inquiry to the contact section and allows expanding the explanation", async () => {
    const user = userEvent.setup();
    render(<PricingSection motionPaused />);
    for (const link of screen.getAllByRole("link"))
      expect(link).toHaveAttribute("href", "#contacto");
    expect(
      screen.getByRole("heading", { name: "Detalles que afinamos contigo" }),
    ).not.toBeVisible();
    await user.click(screen.getByText("Qué incluye cada etapa"));
    expect(
      screen.getByRole("heading", { name: "Detalles que afinamos contigo" }),
    ).toBeVisible();
  });
});
