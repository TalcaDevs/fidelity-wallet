export interface PlanLimit {
  loyaltyPrograms: number;
  customers: number | 'unlimited';
  locations: number;
  staffUsers: number;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  limits: PlanLimit;
}

export const CATALOG_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratis',
    priceMonthly: 0,
    priceAnnual: 0,
    limits: {
      loyaltyPrograms: 1,
      customers: 100,
      locations: 1,
      staffUsers: 1,
    }
  },
  {
    id: 'inicial',
    name: 'Inicial',
    priceMonthly: 24900,
    priceAnnual: 24900 * 10, // Ejemplo: 2 meses gratis si es anual
    limits: {
      loyaltyPrograms: 3,
      customers: 'unlimited',
      locations: 2,
      staffUsers: 3,
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 44900,
    priceAnnual: 44900 * 10,
    limits: {
      loyaltyPrograms: 8,
      customers: 'unlimited',
      locations: 8,
      staffUsers: 15,
    }
  },
  {
    id: 'negocio',
    name: 'Negocio',
    priceMonthly: 69900,
    priceAnnual: 69900 * 10,
    limits: {
      loyaltyPrograms: 15,
      customers: 'unlimited',
      locations: 15,
      staffUsers: 25,
    }
  }
];
