import { supabase } from '../lib/supabase';

export type MerchantRole = 'OWNER' | 'STAFF';

export interface Membership {
  brandId: string;
  // Local con el que trabaja la sesión: el asignado al STAFF, o el más antiguo de la marca
  // para el OWNER hasta que exista el selector de locales.
  merchantId: string;
  programId: string | null;
  role: MerchantRole;
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
      .eq('type', 'STAMPS')
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
  };
}
