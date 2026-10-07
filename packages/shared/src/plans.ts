// Catálogo de planes (HANDOFF §6.5): única fuente para el gating (Dev 1), /admin/billing (Dev 2)
// y /internal (Dev 3). Precios de referencia, no cerrados (§8.11).

export type PlanId = 'TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  highlighted?: boolean;
  priceUsdMonthly: number;
  /** Precio mensual cuando se paga el año completo. */
  priceUsdMonthlyAnnual: number | null;
  trialDays?: number;
  /** customers: null = ilimitado. teamUsers cuenta solo STAFF: el OWNER no ocupa cupo. */
  limits: { programs: number; locations: number; teamUsers: number; customers: number | null; rewards: number };
  features: {
    walletPasses: true;
    pushNotifications: boolean;
    geoNotifications: boolean;
    advancedMetrics: boolean;
    excelExport: boolean;
  };
}

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';

export interface PlanUsage {
  programs: number;
  locations: number;
  teamUsers: number;
  customers: number;
}

/** Suscripción simulada: el plan es mock, el uso es real (lo lee el backend). */
export interface SubscriptionMock {
  planId: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
  usage: PlanUsage;
}

export const TRIAL_DAYS = 30;

const PAID_FEATURES: Plan['features'] = {
  walletPasses: true,
  pushNotifications: true,
  geoNotifications: true,
  advancedMetrics: true,
  excelExport: true,
};

export const CATALOG_PLANS: readonly Plan[] = [
  {
    id: 'TRIAL',
    name: 'Prueba gratis',
    tagline: '30 días, sin tarjeta',
    priceUsdMonthly: 0,
    priceUsdMonthlyAnnual: null,
    trialDays: TRIAL_DAYS,
    limits: { programs: 1, locations: 1, teamUsers: 1, customers: 100, rewards: 3 },
    features: {
      walletPasses: true,
      pushNotifications: false,
      geoNotifications: false,
      advancedMetrics: false,
      excelExport: false,
    },
  },
  {
    id: 'STARTER',
    name: 'Inicial',
    tagline: 'Para tu primer local',
    priceUsdMonthly: 14,
    priceUsdMonthlyAnnual: 11,
    limits: { programs: 3, locations: 2, teamUsers: 3, customers: null, rewards: 3 },
    features: PAID_FEATURES,
  },
  {
    id: 'PRO',
    name: 'Pro',
    tagline: 'Popular',
    highlighted: true,
    priceUsdMonthly: 24,
    priceUsdMonthlyAnnual: 19,
    limits: { programs: 8, locations: 8, teamUsers: 15, customers: null, rewards: 5 },
    features: PAID_FEATURES,
  },
  {
    id: 'BUSINESS',
    name: 'Negocio',
    tagline: 'Para varias sucursales',
    priceUsdMonthly: 39,
    priceUsdMonthlyAnnual: 29,
    limits: { programs: 15, locations: 15, teamUsers: 25, customers: null, rewards: 10 },
    features: PAID_FEATURES,
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = CATALOG_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Plan desconocido: ${id}`);
  return plan;
}
