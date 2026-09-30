import { supabase } from '../lib/supabase';

export interface LocationOption {
  id: string;
  name: string;
  isActive: boolean;
}

/** Locales de la marca; el RLS ya limita la lectura a los miembros. */
export async function listBrandLocations(brandId: string): Promise<LocationOption[]> {
  const { data, error } = await supabase
    .from('Merchant')
    .select('id, name, isActive')
    .eq('brandId', brandId)
    .order('createdAt', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LocationOption[];
}
