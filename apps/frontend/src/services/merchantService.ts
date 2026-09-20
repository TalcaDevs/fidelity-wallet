import { supabase } from '../lib/supabase';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export async function getMerchant(merchantId: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('Merchant')
    .select('id, name, email, createdAt')
    .eq('id', merchantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// El nombre del comercio viaja al pase de la billetera y al landing de
// adquisición, así que el dueño tiene que poder corregir el que generó el
// trigger al registrarse ("Mi Local (...)").
export async function updateMerchantName(merchantId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('Merchant')
    .update({ name })
    .eq('id', merchantId);

  if (error) throw error;
}
