import { describe, expect, it } from "vitest";
import { PAID_PLANS } from "../constants/pricing.constants.ts";
import {
  capacityOptions,
  getPlanBenefits,
  recommendPlan,
} from "./pricingModel";

describe("pricing recommendations", () => {
  it("chooses the lowest priced plan that accommodates both limits regardless of catalog order", () => {
    const shuffled = [...PAID_PLANS].reverse();
    expect(recommendPlan(shuffled, 1, 3)?.id).toBe("STARTER");
    expect(recommendPlan(shuffled, 1, 4)?.id).toBe("PRO");
    expect(recommendPlan(shuffled, 6, 3)?.id).toBe("BUSINESS");
    expect(shuffled.map((plan) => plan.id)).toEqual(
      [...PAID_PLANS].reverse().map((plan) => plan.id),
    );
  });

  it("returns no recommendation when either requested capacity exceeds the catalog", () => {
    expect(recommendPlan(PAID_PLANS, 16, 1)).toBeUndefined();
    expect(recommendPlan(PAID_PLANS, 1, 26)).toBeUndefined();
    expect(recommendPlan([], 1, 1)).toBeUndefined();
  });

  it("builds contiguous, ordered capacity ranges without duplicate limits", () => {
    expect(
      capacityOptions(
        [...PAID_PLANS].reverse().concat(PAID_PLANS),
        "locations",
      ),
    ).toEqual([
      { value: 1, label: "1" },
      { value: 5, label: "2 a 5" },
      { value: 15, label: "6 a 15" },
    ]);
  });

  it("only advertises optional features enabled for a plan", () => {
    const plan = {
      ...PAID_PLANS[0],
      features: {
        ...PAID_PLANS[0].features,
        advancedMetrics: false,
        excelExport: false,
      },
    };
    expect(getPlanBenefits(plan)).toEqual([
      "Hasta 1 local",
      "Hasta 3 colaboradores",
      "Hasta 200 clientes",
      "Hasta 3 recompensas activas",
      "Tarjetas digitales en Wallet",
      "Notificaciones push y por ubicación",
    ]);
  });
});
