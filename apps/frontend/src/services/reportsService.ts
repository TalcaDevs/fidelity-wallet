import { authenticatedFetch } from '../lib/api';
import { extractApiError } from '../lib/apiError';

export interface KpiMetric {
  current: number;
  previous: number;
  changePercentage: number | null;
}

export interface OverviewKpis {
  newCustomers: KpiMetric;
  activeCustomers: KpiMetric;
  stampsDelivered: KpiMetric;
  rewardsRedeemed: KpiMetric;
  recurrenceRate: KpiMetric;
  expiredStamps: KpiMetric;
}

export interface TimeSeriesPoint {
  date: string;
  stamps: number;
  rewards: number;
  uniqueCustomers: number;
}

export interface MethodDistribution {
  qrCount: number;
  manualCount: number;
  qrPercentage: number;
  manualPercentage: number;
}

export interface OverviewReport {
  period: {
    from: string;
    to: string;
    timeZone: string;
  };
  kpis: OverviewKpis;
  timeSeries: TimeSeriesPoint[];
  methodDistribution: MethodDistribution;
}

export interface WeeklyRetentionPoint {
  weekStart: string;
  newCustomers: number;
  returningCustomers: number;
}

export interface FrequencyDistributionItem {
  range: string;
  customerCount: number;
  percentage: number;
}

export interface DormantCustomer {
  customerId: string;
  maskedIdentifier: string;
  lastVisitAt: string;
  daysInactive: number;
}

export interface DormantCustomersGroup {
  count: number;
  customers: DormantCustomer[];
}

export interface CohortItem {
  cohortMonth: string;
  totalNewCustomers: number;
  month1ReturnRate: number;
  month2ReturnRate: number;
  month3ReturnRate: number;
}

export interface RetentionReport {
  weeklyRetention: WeeklyRetentionPoint[];
  visitFrequencyDistribution: FrequencyDistributionItem[];
  dormantCustomers: DormantCustomersGroup;
  cohorts: CohortItem[];
}

export interface PromotionMetric {
  id: string;
  name: string;
  targetStamps: number;
  rewardName: string;
  isActive: boolean;
  redeemedCount: number;
  averageDaysToRedeem: number | null;
  breakageCount: number;
}

export interface PromotionPerformanceReport {
  promotions: PromotionMetric[];
}

export interface StaffAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface StaffMemberMetric {
  userId: string;
  staffName?: string | null;
  role: string;
  stampsCount: number;
  redeemsCount: number;
  manualPercentage: number;
  alerts: StaffAlert[];
}

export interface StaffActivityReport {
  staff: StaffMemberMetric[];
}

export interface ReportQueryParams {
  from?: string;
  to?: string;
  tz?: string;
}

export interface RetentionQueryParams {
  dormantDays?: number;
  tz?: string;
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export async function fetchOverviewReport(
  merchantId: string,
  params: ReportQueryParams = {},
): Promise<OverviewReport> {
  const qs = buildQueryString({
    from: params.from,
    to: params.to,
    tz: params.tz,
  });

  const res = await authenticatedFetch(`/api/merchants/${merchantId}/reports/overview${qs}`);
  if (!res.ok) {
    const errorData: unknown = await res.json().catch(() => null);
    throw new Error(extractApiError(errorData) ?? 'No se pudo obtener el reporte general');
  }
  return res.json();
}

export async function fetchRetentionReport(
  merchantId: string,
  params: RetentionQueryParams = {},
): Promise<RetentionReport> {
  const qs = buildQueryString({
    dormantDays: params.dormantDays,
    tz: params.tz,
  });

  const res = await authenticatedFetch(`/api/merchants/${merchantId}/reports/retention${qs}`);
  if (!res.ok) {
    const errorData: unknown = await res.json().catch(() => null);
    throw new Error(extractApiError(errorData) ?? 'No se pudo obtener el reporte de retención');
  }
  return res.json();
}

export async function fetchPromotionsReport(
  merchantId: string,
  params: ReportQueryParams = {},
): Promise<PromotionPerformanceReport> {
  const qs = buildQueryString({
    from: params.from,
    to: params.to,
    tz: params.tz,
  });

  const res = await authenticatedFetch(`/api/merchants/${merchantId}/reports/promotions${qs}`);
  if (!res.ok) {
    const errorData: unknown = await res.json().catch(() => null);
    throw new Error(extractApiError(errorData) ?? 'No se pudo obtener el reporte de promociones');
  }
  return res.json();
}

export async function fetchStaffActivityReport(
  merchantId: string,
  params: ReportQueryParams = {},
): Promise<StaffActivityReport> {
  const qs = buildQueryString({
    from: params.from,
    to: params.to,
    tz: params.tz,
  });

  const res = await authenticatedFetch(`/api/merchants/${merchantId}/reports/staff${qs}`);
  if (!res.ok) {
    const errorData: unknown = await res.json().catch(() => null);
    throw new Error(extractApiError(errorData) ?? 'No se pudo obtener el reporte de personal');
  }
  return res.json();
}
