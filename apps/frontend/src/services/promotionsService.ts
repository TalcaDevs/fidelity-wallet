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

export type PromotionFormValues = Pick<Promotion, 'targetStamps' | 'rewardName'>;

export async function listPromotions(merchantId: string): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('Promotion')
    .select('*')
    .eq('merchantId', merchantId)
    .order('createdAt', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPromotion(promoId: string): Promise<PromotionFormValues | null> {
  const { data, error } = await supabase
    .from('Promotion')
    .select('*')
    .eq('id', promoId)
    .single();

  if (error) throw error;
  return data;
}

export async function createPromotion(merchantId: string, values: PromotionFormValues): Promise<void> {
  const { error } = await supabase.from('Promotion').insert([{
    merchantId,
    targetStamps: values.targetStamps,
    rewardName: values.rewardName,
    name: 'Regla de Promoción',
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
