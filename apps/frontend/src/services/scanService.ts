import { supabase } from '../lib/supabase';

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

const mockProcessScan = async (id: string, action: 'SCAN' | 'REDEEM'): Promise<ScanResult> => {
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
  action: 'SCAN' | 'REDEEM';
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

    const endpoint = params.identifier ? '/api/scan/manual' : '/api/scan';
    const type = params.action === 'REDEEM' ? 'REWARD_REDEEMED' : 'STAMP_ADDED';
    
    const body = params.identifier 
      ? { merchantId: params.merchantId, identifier: params.identifier, type }
      : { merchantId: params.merchantId, passToken: params.passToken, type };

    const response = await fetch(endpoint, {
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
        return { ok: false, error: errorData.error || errorData.message || 'Pase inválido o de otro local' };
      }
      return { ok: false, error: 'Ocurrió un error al procesar el pase' };
    }
    
    const data = await response.json();
    return {
      ok: true,
      customerLabel: data.customerLabel,
      stampsCount: data.stampsCount,
      targetStamps: data.targetStamps,
      rewardUnlocked: data.rewardUnlocked,
      rewardName: data.rewardName,
      alreadyScanned: data.alreadyScanned
    };
  } catch (error) {
    return { ok: false, error: 'Error de red o de servidor' };
  }
};
