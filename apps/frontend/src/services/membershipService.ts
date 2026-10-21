import { supabase } from '../lib/supabase';

export type MerchantRole = 'OWNER' | 'STAFF';
export type BrandStatus = 'ACTIVE' | 'SUSPENDED';

export interface Membership {
  brandId: string;
  // Local con el que trabaja la sesión: el asignado al STAFF, o el más antiguo de la marca
  // para el OWNER hasta que exista el selector de locales.
  merchantId: string;
  programId: string | null;
  role: MerchantRole;
  brandStatus: BrandStatus;
}

export const MEMBERSHIP_INVALIDATED_EVENT = 'fidelity:membership-invalidated';

export function isBrandSuspended(brandStatus: BrandStatus | null | undefined): boolean {
  return brandStatus === 'SUSPENDED';
}

export function isMembershipSuspended(
  membership: { brandStatus?: BrandStatus | null; isSuspended?: boolean } | null | undefined,
): boolean {
  if (!membership) return false;
  if (membership.brandStatus !== undefined && membership.brandStatus !== null) {
    return isBrandSuspended(membership.brandStatus);
  }
  return Boolean(membership.isSuspended);
}

export function invalidateMemberships(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MEMBERSHIP_INVALIDATED_EVENT));
  }
}

interface BrandMemberRow {
  brandId: string;
  role: MerchantRole;
  merchantId: string | null;
}

// Un usuario podría pertenecer a más de una marca, pero el panel actual trabaja con una sola:
// devolvemos la lista ordenada por antigüedad y quien consume decide (hoy, la más antigua).
export async function fetchMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('BrandMember')
    .select('brandId, role, merchantId')
    .eq('userId', userId)
    .order('createdAt', { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as BrandMemberRow[];
  return Promise.all(rows.map(resolveMembership));
}

async function resolveMembership(row: BrandMemberRow): Promise<Membership> {
  const { data: brand, error: brandError } = await supabase
    .from('Brand')
    .select('status')
    .eq('id', row.brandId)
    .maybeSingle();
  if (brandError) throw brandError;

  const brandStatus: BrandStatus = brand?.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

  if (isBrandSuspended(brandStatus)) {
    // Si la marca está suspendida, las políticas RLS ocultan las tablas operativas (LoyaltyProgram, etc.).
    // Retornamos de inmediato con programId: null. El enrutamiento protege las rutas operativas
    // mediante RequireActiveSubscription y restringe al usuario a Billing y Support, las cuales
    // dependen únicamente de brandId y son completamente seguras contra valores nulos.
    return {
      brandId: row.brandId,
      merchantId: row.merchantId ?? '',
      programId: null,
      role: row.role,
      brandStatus: 'SUSPENDED',
    };
  }

  const [locationRes, programRes] = await Promise.all([
    row.merchantId
      ? Promise.resolve({ data: { id: row.merchantId }, error: null })
      : supabase
          .from('Merchant')
          .select('id')
          .eq('brandId', row.brandId)
          .order('createdAt', { ascending: true })
          .limit(1)
          .maybeSingle(),
    supabase
      .from('LoyaltyProgram')
      .select('id')
      .eq('brandId', row.brandId)
      .maybeSingle(),
  ]);

  if (locationRes.error) throw locationRes.error;
  if (programRes.error) throw programRes.error;
  if (!locationRes.data) throw new Error('Tu marca no tiene locales registrados.');

  return {
    brandId: row.brandId,
    merchantId: locationRes.data.id,
    programId: programRes.data?.id ?? null,
    role: row.role,
    brandStatus: 'ACTIVE',
  };
}
