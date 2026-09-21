import { supabase } from '../lib/supabase';

export type MerchantRole = 'OWNER' | 'STAFF';

export interface Membership {
  merchantId: string;
  role: MerchantRole;
}

// Un usuario podría pertenecer a más de un comercio, pero el panel actual
// trabaja con uno solo: devolvemos la lista ordenada por antigüedad y quien
// consume decide (hoy, la más antigua).
export async function fetchMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('MerchantUser')
    .select('merchantId, role')
    .eq('userId', userId)
    .order('createdAt', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Membership[];
}
