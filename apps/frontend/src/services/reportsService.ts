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
  staffEmail?: string | null;
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
  merchantId?: string;
}

export interface RetentionQueryParams {
  dormantDays?: number;
  tz?: string;
  merchantId?: string;
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

async function getReport<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  fallbackMessage: string,
): Promise<T> {
  const qs = buildQueryString(params);
  const res = await authenticatedFetch(`${path}${qs}`);
  if (!res.ok) {
    const errorData: unknown = await res.json().catch(() => null);
    throw new Error(extractApiError(errorData) ?? fallbackMessage);
  }
  return res.json();
}

export async function fetchOverviewReport(
  id: string,
  params: ReportQueryParams = {},
  isBrand = false,
): Promise<OverviewReport> {
  const prefix = isBrand ? `/api/brands/${id}` : `/api/merchants/${id}`;
  return getReport<OverviewReport>(
    `${prefix}/reports/overview`,
    { from: params.from, to: params.to, tz: params.tz, merchantId: params.merchantId },
    'No se pudo obtener el reporte general',
  );
}

export async function fetchRetentionReport(
  id: string,
  params: RetentionQueryParams = {},
  isBrand = false,
): Promise<RetentionReport> {
  const prefix = isBrand ? `/api/brands/${id}` : `/api/merchants/${id}`;
  return getReport<RetentionReport>(
    `${prefix}/reports/retention`,
    { dormantDays: params.dormantDays, tz: params.tz, merchantId: params.merchantId },
    'No se pudo obtener el reporte de retención',
  );
}

export async function fetchPromotionsReport(
  id: string,
  params: ReportQueryParams = {},
  isBrand = false,
): Promise<PromotionPerformanceReport> {
  const prefix = isBrand ? `/api/brands/${id}` : `/api/merchants/${id}`;
  return getReport<PromotionPerformanceReport>(
    `${prefix}/reports/promotions`,
    { from: params.from, to: params.to, tz: params.tz, merchantId: params.merchantId },
    'No se pudo obtener el reporte de promociones',
  );
}

export async function fetchStaffActivityReport(
  id: string,
  params: ReportQueryParams = {},
  isBrand = false,
): Promise<StaffActivityReport> {
  const prefix = isBrand ? `/api/brands/${id}` : `/api/merchants/${id}`;
  return getReport<StaffActivityReport>(
    `${prefix}/reports/staff`,
    { from: params.from, to: params.to, tz: params.tz, merchantId: params.merchantId },
    'No se pudo obtener el reporte de personal',
  );
}
