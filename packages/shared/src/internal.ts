// Panel interno /internal (HANDOFF §11.5). Todo sale de /api/internal/*.
import type { LocationDto } from './locations.js';
import type { PlanId, SubscriptionMock } from './plans.js';

export type PlatformRole = 'SUPERADMIN' | 'SUPPORT';
export type BrandStatus = 'ACTIVE' | 'SUSPENDED';

export interface PlatformMeDto {
  userId: string;
  email: string | null;
  role: PlatformRole;
}

export interface InternalBrandSummaryDto {
  id: string;
  name: string;
  status: BrandStatus;
  planId: PlanId;
  trialEndsAt: string;
  ownerEmail: string | null;
  locations: number;
  customers: number;
  openTickets: number;
  lastScanAt: string | null;
  createdAt: string;
}

export interface InternalBrandMemberDto {
  userId: string;
  email: string | null;
  role: 'OWNER' | 'STAFF';
  locationId: string | null;
  locationName: string | null;
  lastSignInAt: string | null;
}

export interface InternalProgramDto {
  id: string;
  name: string;
  type: string;
  stampValidityDays: number | null;
  isActive: boolean;
  promotions: { id: string; name: string; targetStamps: number; rewardName: string; isActive: boolean }[];
}

export interface InternalBrandDetailDto extends InternalBrandSummaryDto {
  legalName: string | null;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscription: SubscriptionMock;
  locationsList: LocationDto[];
  programs: InternalProgramDto[];
  members: InternalBrandMemberDto[];
  recentActivity: {
    id: string;
    type: 'STAMP_ADDED' | 'REWARD_REDEEMED';
    method: 'QR' | 'MANUAL';
    locationName: string;
    customer: string;
    createdAt: string;
  }[];
}

/** Solo SUPERADMIN. Cada cambio queda en AuditLog. */
export interface InternalBrandUpdateInput {
  name?: string;
  legalName?: string | null;
  taxId?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: BrandStatus;
  planId?: PlanId;
  trialEndsAt?: string;
}

export interface InternalLocationPinDto {
  id: string;
  brandId: string;
  brandName: string;
  brandStatus: BrandStatus;
  name: string;
  commune: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export interface InternalCustomerDto {
  id: string;
  /** Siempre enmascarados: el dato completo exige POST .../reveal con motivo. */
  rut: string | null;
  phone: string | null;
  createdAt: string;
  cards: { brandId: string; brandName: string; activeStamps: number; joinedAt: string }[];
}

export interface RevealCustomerInput {
  reason: string;
}

export interface RevealedCustomerDto {
  id: string;
  rut: string | null;
  phone: string | null;
}

export const REVEAL_REASON_MIN = 10;

export interface AuditLogEntryDto {
  id: string;
  actorUserId: string;
  actorEmail: string | null;
  actorType: 'PLATFORM' | 'OWNER';
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: string;
}

/** Pantalla de inicio de /internal. */
export interface InternalSummaryDto {
  brands: { total: number; active: number; suspended: number; byPlan: Record<PlanId, number> };
  trials: {
    endingSoon: { id: string; name: string; trialEndsAt: string }[];
    expired: number;
  };
  tickets: { open: number; unassigned: number; urgent: number; waitingOnMerchant: number };
  /** Últimos 7 días, en hora de Chile. */
  activity: { date: string; stamps: number; redemptions: number; newCustomers: number }[];
}

export interface LocationPinsBbox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
