import { CATALOG_PLANS } from "@fidelity/shared";
import { capacityOptions } from "../models/pricingModel";
import type { PlanStory } from "../types/pricing.types.ts";
export const PAID_PLANS = CATALOG_PLANS.filter((plan) => plan.id !== "TRIAL");

export const TRIAL_PLAN = CATALOG_PLANS.find((plan) => plan.id === "TRIAL");

export const PLAN_STORIES: Record<string, PlanStory> = {
  STARTER: {
    title: "Tu primera comunidad.",
    description:
      "Empieza a reconocer a quienes vuelven y convierte las visitas en una relación.",
  },
  PRO: {
    title: "Más equipo. Más conexión.",
    description:
      "Dale espacio a tu operación para crecer, con más locales y personas conectadas.",
  },
  BUSINESS: {
    title: "Una marca que crece contigo.",
    description:
      "Coordina una red de locales y mantén a todo tu equipo en la misma página.",
  },
};

export const LOCATION_OPTIONS = capacityOptions(PAID_PLANS, "locations");

export const TEAM_OPTIONS = capacityOptions(PAID_PLANS, "teamUsers");

export const MAX_LOCATIONS = Math.max(
  ...PAID_PLANS.map((plan) => plan.limits.locations),
);

export const MAX_TEAM = Math.max(
  ...PAID_PLANS.map((plan) => plan.limits.teamUsers),
);
