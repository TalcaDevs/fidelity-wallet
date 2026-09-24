import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/api';
import { extractApiError } from '../lib/apiError';

// Promoción activa del local y si el saldo del cliente alcanza para canjearla.
export interface PromotionOption {
  id: string;
  name: string;
  rewardName: string;
  targetStamps: number;
  canRedeem: boolean;
}

export interface ScanResult {
  ok: boolean;
  passId?: string;
  scanId?: string;
  customerLabel?: string;
  stampsCount?: number;
  targetStamps?: number;
  rewardUnlocked?: boolean;
  rewardName?: string;
  alreadyScanned?: boolean;
  // Los sellos son un saldo único: el cliente elige en caja cuál de estas canjear.
  availablePromotions?: PromotionOption[];
  // Mensaje del backend; en un sello bloqueado dice cuántos minutos faltan.
  message?: string;
  error?: string;
}

const MOCK_PROMOTIONS = (stamps: number): PromotionOption[] => [
  { id: 'mock-promo-cafe', name: 'Café', rewardName: 'Café Gratis', targetStamps: 5, canRedeem: stamps >= 5 },
  { id: 'mock-promo-almuerzo', name: 'Almuerzo', rewardName: 'Almuerzo Gratis', targetStamps: 10, canRedeem: stamps >= 10 },
];

const mockProcessScan = async (id: string, action: 'STAMP' | 'REDEEM'): Promise<ScanResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (action === 'REDEEM') {
        resolve({ ok: true, rewardUnlocked: false, customerLabel: '···123-K', stampsCount: 0, targetStamps: 5 });
        return;
      }

      const rand = Math.random();
      if (rand < 0.1) {
        resolve({ ok: false, error: 'Pase inválido o de otro local' });
      } else if (rand < 0.2) {
        resolve({ ok: true, alreadyScanned: true, customerLabel: '···678-5', stampsCount: 4, targetStamps: 5 });
      } else if (rand < 0.4) {
        resolve({ ok: true, rewardUnlocked: true, rewardName: 'Café Gratis', customerLabel: '···123-K', stampsCount: 6, targetStamps: 5, availablePromotions: MOCK_PROMOTIONS(6) });
      } else {
        resolve({ ok: true, rewardUnlocked: false, customerLabel: '···' + id.slice(-3), stampsCount: Math.floor(Math.random() * 4) + 1, targetStamps: 5 });
      }
    }, 800);
  });
};

/** Contrato de POST /api/scan (ScanResultDto del backend), solo con lo que usa la PWA. */
interface ScanApiResponse {
  passId: string;
  scanId?: string;
  activeStamps: number;
  targetStamps: number;
  rewardUnlocked: boolean;
  rewardName: string;
  alreadyScanned: boolean;
  availablePromotions?: PromotionOption[];
  message?: string;
  customer?: { rut?: string | null; phone?: string | null };
}

/** A quién se escanea: el QR del pase o, en el ingreso manual, el RUT o teléfono del cliente. */
export type ScanTarget =
  | { passToken: string }
  | { customer: { rut: string } | { phone: string } };

export interface ScanParams {
  merchantId: string;
  action: 'STAMP' | 'REDEEM';
  target: ScanTarget;
  // Solo en REDEEM: la promoción que eligió el cliente.
  promotionId?: string;
}

export const processScan = async (params: ScanParams): Promise<ScanResult> => {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const id = 'passToken' in params.target ? params.target.passToken : Object.values(params.target.customer)[0];
    return mockProcessScan(id, params.action);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { ok: false, error: 'No hay sesión activa' };
    }

    const body = {
      merchantId: params.merchantId,
      action: params.action,
      ...params.target,
      ...(params.promotionId ? { promotionId: params.promotionId } : {})
    };

    let response = await fetch(apiUrl('/api/scan'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok && response.status === 401) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session) {
        response = await fetch(apiUrl('/api/scan'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshData.session.access_token}`
          },
          body: JSON.stringify(body)
        });
      }
    }

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      if (response.status === 401) {
        return { ok: false, error: 'Tu sesión venció. Vuelve a iniciar sesión.' };
      }
      if ([400, 403, 404, 409, 429].includes(response.status)) {
        return { ok: false, error: extractApiError(errorData) ?? 'Pase inválido o de otro local' };
      }
      return { ok: false, error: 'Ocurrió un error al procesar el pase' };
    }
    
    const data = (await response.json()) as ScanApiResponse;
    return {
      ok: true,
      passId: data.passId,
      scanId: data.scanId,
      customerLabel: data.customer?.rut ?? data.customer?.phone ?? '',
      stampsCount: data.activeStamps,
      targetStamps: data.targetStamps,
      rewardUnlocked: data.rewardUnlocked,
      rewardName: data.rewardName,
      alreadyScanned: data.alreadyScanned,
      availablePromotions: data.availablePromotions ?? [],
      message: data.message
    };
  } catch {
    return { ok: false, error: 'Error de red o de servidor' };
  }
};
