import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/api';

export interface ScanResult {
  ok: boolean;
  customerLabel?: string;
  stampsCount?: number;
  targetStamps?: number;
  rewardUnlocked?: boolean;
  rewardName?: string;
  alreadyScanned?: boolean;
  error?: string;
}

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
        resolve({ ok: true, rewardUnlocked: true, rewardName: 'Café Gratis', customerLabel: '···123-K', stampsCount: 5, targetStamps: 5 });
      } else {
        resolve({ ok: true, rewardUnlocked: false, customerLabel: '···' + id.slice(-3), stampsCount: Math.floor(Math.random() * 4) + 1, targetStamps: 5 });
      }
    }, 800);
  });
};

export interface ScanParams {
  merchantId: string;
  action: 'STAMP' | 'REDEEM';
  passToken?: string;
  identifier?: string;
}

export const processScan = async (params: ScanParams): Promise<ScanResult> => {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return mockProcessScan(params.passToken || params.identifier || '123', params.action);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { ok: false, error: 'No hay sesión activa' };
    }

    let customer: { rut?: string, phone?: string } | undefined = undefined;
    if (params.identifier) {
      const isPhone = /^\+569\d{8}$/.test(params.identifier);
      customer = isPhone ? { phone: params.identifier } : { rut: params.identifier };
    }

    const body = {
      merchantId: params.merchantId,
      action: params.action,
      ...(params.passToken ? { passToken: params.passToken } : {}),
      ...(customer ? { customer } : {})
    };

    const response = await fetch(apiUrl('/api/scan'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      if (response.status === 400 || response.status === 404 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error || errorData.message;
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage[0];
        }
        return { ok: false, error: errorMessage || 'Pase inválido o de otro local' };
      }
      return { ok: false, error: 'Ocurrió un error al procesar el pase' };
    }
    
    const data = await response.json();
    return {
      ok: true,
      customerLabel: data.customer?.rut ?? data.customer?.phone ?? '',
      stampsCount: data.activeStamps,
      targetStamps: data.targetStamps,
      rewardUnlocked: data.rewardUnlocked,
      rewardName: data.rewardName,
      alreadyScanned: data.alreadyScanned
    };
  } catch (error) {
    return { ok: false, error: 'Error de red o de servidor' };
  }
};
