import { supabase } from '../lib/supabase';
import { isValidStampValidityDays } from '../lib/stampExpiry';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  // Vigencia de los sellos en días. null = no vencen. Es una regla del local,
  // no de cada promoción: se configura una sola vez acá.
  stampValidityDays: number | null;
  createdAt: string;
}

export type MerchantSettings = Pick<Merchant, 'name' | 'stampValidityDays'>;

export interface MerchantPublicData {
  id: string;
  name: string;
  stampValidityDays: number | null;
  Promotion: {
    targetStamps: number;
    rewardName: string;
    isActive: boolean;
  }[];
}

export async function getMerchantWithActivePromo(merchantId: string): Promise<MerchantPublicData | null> {
  const { data, error } = await supabase
    .from('Merchant')
    .select(`
      id,
      name,
      stampValidityDays,
      Promotion (
        targetStamps,
        rewardName,
        isActive
      )
    `)
    .eq('id', merchantId)
    .single();

  if (error || !data) {
    return null;
  }

  // Filter promotions to only include active ones, and cast type
  return {
    ...data,
    Promotion: data.Promotion.filter((p: any) => p.isActive)
  } as unknown as MerchantPublicData;
}

export async function getMerchant(merchantId: string): Promise<Merchant | null> {
  const { data, error } = await supabase
    .from('Merchant')
    .select('id, name, email, stampValidityDays, createdAt')
    .eq('id', merchantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// El nombre del comercio viaja al pase de la billetera y al landing de
// adquisición, así que el dueño tiene que poder corregir el que generó el
// trigger al registrarse ("Mi Local (...)").
export async function updateMerchantSettings(merchantId: string, settings: MerchantSettings): Promise<void> {
  // El vencimiento de cada sello se congela al entregarlo, así que un valor
  // corrupto acá no se puede "arreglar" después: validamos antes de escribir.
  if (!isValidStampValidityDays(settings.stampValidityDays)) {
    throw new Error('La vigencia de los sellos debe ser un número entero de días mayor que cero.');
  }

  const { data, error } = await supabase
    .from('Merchant')
    .update({ name: settings.name, stampValidityDays: settings.stampValidityDays })
    .eq('id', merchantId)
    .select('id');

  if (error) throw error;

  // PostgREST responde 204 a un UPDATE que RLS dejó sin filas: no es un error,
  // simplemente no tocó nada. Sin pedir las filas afectadas, el panel avisaría
  // "guardado" sobre una escritura que la base rechazó en silencio.
  if (!data || data.length === 0) {
    throw new Error('No se pudo guardar: tu cuenta no tiene permisos sobre este local.');
  }
}
