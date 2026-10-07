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
    expect(recommendPlan(shuffled, 2, 3)?.id).toBe("STARTER");
    expect(recommendPlan(shuffled, 2, 4)?.id).toBe("PRO");
    expect(recommendPlan(shuffled, 9, 3)?.id).toBe("BUSINESS");
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
      { value: 2, label: "1 a 2" },
      { value: 8, label: "3 a 8" },
      { value: 15, label: "9 a 15" },
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
      "Hasta 2 locales",
      "Hasta 3 colaboradores",
      "Clientes ilimitados",
      "Hasta 3 recompensas activas",
      "Tarjetas digitales en Wallet",
    ]);
  });
});
