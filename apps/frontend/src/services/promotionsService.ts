import { supabase } from '../lib/supabase';

export interface Promotion {
  id: string;
  merchantId: string;
  name: string;
  targetStamps: number;
  rewardName: string;
  isActive: boolean;
  createdAt: string;
}

export type PromotionFormValues = Pick<Promotion, 'name' | 'targetStamps' | 'rewardName'>;

export async function listPromotions(merchantId: string): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('Promotion')
    .select('*')
    .eq('merchantId', merchantId)
    .order('createdAt', { ascending: false });

  if (error) throw error;
  return data || [];
}

// maybeSingle en vez de single: single lanza PGRST116 cuando no hay fila, con lo
// que el `| null` del tipo de retorno nunca se cumpliría.
export async function getPromotion(promoId: string): Promise<PromotionFormValues | null> {
  const { data, error } = await supabase
    .from('Promotion')
    .select('name, targetStamps, rewardName')
    .eq('id', promoId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPromotion(merchantId: string, values: PromotionFormValues): Promise<void> {
  const { error } = await supabase.from('Promotion').insert([{
    merchantId,
    name: values.name,
    targetStamps: values.targetStamps,
    rewardName: values.rewardName,
  }]);
  if (error) throw error;
}

export async function updatePromotion(promoId: string, values: PromotionFormValues): Promise<void> {
  const { error } = await supabase.from('Promotion').update(values).eq('id', promoId);
  if (error) throw error;
}

export async function setPromotionActive(promoId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('Promotion').update({ isActive }).eq('id', promoId);
  if (error) throw error;
}

export async function deletePromotion(promoId: string): Promise<void> {
  const { error } = await supabase.from('Promotion').delete().eq('id', promoId);
  if (error) throw error;
}
