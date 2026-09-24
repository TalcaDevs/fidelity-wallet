import { supabase } from '../lib/supabase';
import { isValidStampValidityDays } from '../lib/stampExpiry';
import { apiUrl } from '../lib/api';

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

export interface MerchantWithPromo {
  id: string;
  name: string;
  stampValidityDays: number | null;
  Promotion: {
    id: string;
    name: string;
    targetStamps: number;
    rewardName: string;
  }[];
}

export async function getMerchantWithActivePromo(merchantName: string): Promise<MerchantWithPromo | null> {
  // Manejo de Mocks si Dev 3 aún no abre el RLS, o para tests
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return {
      id: 'mock-merchant-id',
      name: merchantName || 'Mi Local (Mock)',
      stampValidityDays: 30,
      Promotion: [
        {
          id: 'mock-promo-id',
          name: 'Promo 10 Sellos',
          targetStamps: 10,
          rewardName: 'Café Gratis'
        }
      ]
    };
  }

  const response = await fetch(apiUrl('/api/merchants/by-slug/' + encodeURIComponent(merchantName)));
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error('No se pudo cargar la información del local. Por favor, reintenta.');
  }
  
  const data = await response.json();
  
  // Mapear la respuesta del backend al contrato esperado por el frontend.
  // Promotion[0] es la más reciente (la que se destaca); el resto también se puede canjear
  // con los mismos sellos.
  type ApiPromotion = { id: string; name?: string; targetStamps: number; rewardName: string };
  const promotions: ApiPromotion[] =
    data.activePromotions ?? (data.activePromotion ? [data.activePromotion] : []);

  return {
    id: data.id,
    name: data.name,
    stampValidityDays: data.stampValidityDays,
    Promotion: promotions.map((p) => ({
      id: p.id,
      name: p.name || 'Promoción Activa',
      targetStamps: p.targetStamps,
      rewardName: p.rewardName
    }))
  };
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
