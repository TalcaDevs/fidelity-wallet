export type PlanId = 'TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS';
export interface Plan {
  id: PlanId; name: string; tagline: string; highlighted?: boolean;
  priceUsdMonthly: number; priceUsdMonthlyAnnual: number | null; trialDays?: number;
  limits: { programs: number; locations: number; teamUsers: number; customers: number | null };
  features: { walletPasses: boolean; pushNotifications: boolean; geoNotifications: boolean;
              advancedMetrics: boolean; excelExport: boolean };
}
export interface SubscriptionMock {
  planId: PlanId; status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  billingCycle: 'MONTHLY' | 'ANNUAL'; trialEndsAt: string | null; currentPeriodEnd: string;
  usage: { programs: number; locations: number; teamUsers: number; customers: number };
}

export const CATALOG_PLANS: Plan[] = [
  { id: 'TRIAL', name: 'Prueba gratis', tagline: 'Para empezar', priceUsdMonthly: 0, priceUsdMonthlyAnnual: null, trialDays: 30, limits: { programs: 1, locations: 1, teamUsers: 1, customers: 100 }, features: { walletPasses: true, pushNotifications: false, geoNotifications: false, advancedMetrics: false, excelExport: false } },
  { id: 'STARTER', name: 'Inicial', tagline: 'Para crecer', priceUsdMonthly: 14, priceUsdMonthlyAnnual: 11, limits: { programs: 3, locations: 2, teamUsers: 3, customers: null }, features: { walletPasses: true, pushNotifications: true, geoNotifications: true, advancedMetrics: true, excelExport: true } },
  { id: 'PRO', name: 'Pro', tagline: 'Popular', highlighted: true, priceUsdMonthly: 24, priceUsdMonthlyAnnual: 19, limits: { programs: 8, locations: 8, teamUsers: 15, customers: null }, features: { walletPasses: true, pushNotifications: true, geoNotifications: true, advancedMetrics: true, excelExport: true } },
  { id: 'BUSINESS', name: 'Negocio', tagline: 'Escala global', priceUsdMonthly: 39, priceUsdMonthlyAnnual: 29, limits: { programs: 15, locations: 15, teamUsers: 25, customers: null }, features: { walletPasses: true, pushNotifications: true, geoNotifications: true, advancedMetrics: true, excelExport: true } }
];
