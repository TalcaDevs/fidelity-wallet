import type { CardType, PublicCardDto } from '@fidelity/shared';
import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/api';
import { extractApiError } from '../lib/apiError';

export interface MerchantWithPromo {
  id: string;
  name: string;
  stampValidityDays: number | null;
  /** null con mocks o si la marca aún no tiene tarjeta: se usa lo de siempre (sellos, todo opcional). */
  card: PublicCardDto | null;
  Promotion: {
    id: string;
    name: string;
    targetStamps: number;
    rewardName: string;
    currency?: CardType;
  }[];
}

type ApiPromotion = { id: string; name?: string; targetStamps: number; rewardName: string; currency?: CardType };

/** Contrato de GET /api/merchants/by-slug/:slug (PublicMerchantDto del backend). */
interface PublicMerchantResponse {
  id: string;
  name: string;
  slug: string;
  stampValidityDays: number | null;
  activePromotion: ApiPromotion | null;
  activePromotions?: ApiPromotion[];
  card?: PublicCardDto | null;
}

export async function getMerchantWithActivePromo(merchantName: string): Promise<MerchantWithPromo | null> {
  // Manejo de Mocks si Dev 3 aún no abre el RLS, o para tests
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return {
      id: 'mock-merchant-id',
      name: merchantName || 'Mi Local (Mock)',
      stampValidityDays: 30,
      card: null,
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
  
  const data = (await response.json()) as PublicMerchantResponse;

  // Mapear la respuesta del backend al contrato esperado por el frontend.
  // Promotion[0] es la más reciente (la que se destaca); el resto también se puede canjear
  // con los mismos sellos.
  const promotions: ApiPromotion[] =
    data.activePromotions ?? (data.activePromotion ? [data.activePromotion] : []);

  return {
    id: data.id,
    name: data.name,
    stampValidityDays: data.stampValidityDays,
    card: data.card ?? null,
    Promotion: promotions.filter((p) => {
      const currency = p.currency ?? data.card?.type ?? 'STAMPS';
      return currency === 'POINTS'
        ? (data.card?.pointsEnabled ?? data.card?.type === 'POINTS')
        : (data.card?.stampsEnabled ?? data.card?.type !== 'POINTS');
    }).map((p) => ({
      id: p.id,
      name: p.name || 'Promoción Activa',
      targetStamps: p.targetStamps,
      rewardName: p.rewardName,
      currency: p.currency ?? data.card?.type ?? 'STAMPS',
    }))
  };
}

/** URL pública que el dueño imprime en el QR de las mesas. */
export function publicJoinUrl(slug: string): string {
  return `${window.location.origin}/join/${slug}`;
}

// El slug no se escribe por Supabase: el panel no tiene permiso sobre esa columna (grant por
// columna), así siempre pasa por la normalización y la unicidad del backend.
export async function updateMerchantSlug(merchantId: string, slug: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');

  const response = await fetch(apiUrl(`/api/merchants/${merchantId}/slug`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ slug }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(extractApiError(body) ?? 'No pudimos cambiar el link. Intenta de nuevo.');
  }
  return (body as { slug: string }).slug;
}
