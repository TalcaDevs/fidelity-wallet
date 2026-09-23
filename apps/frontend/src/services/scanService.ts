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

const mockProcessScan = async (identifier: string): Promise<ScanResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rand = Math.random();
      if (rand < 0.1) {
        resolve({ ok: false, error: 'Pase inválido o de otro local' });
      } else if (rand < 0.2) {
        resolve({ ok: true, alreadyScanned: true, customerLabel: '···678-5', stampsCount: 4, targetStamps: 5 });
      } else if (rand < 0.4) {
        resolve({ ok: true, rewardUnlocked: true, rewardName: 'Café Gratis', customerLabel: '···123-K', stampsCount: 5, targetStamps: 5 });
      } else {
        resolve({ ok: true, rewardUnlocked: false, customerLabel: '···' + identifier.slice(-3), stampsCount: Math.floor(Math.random() * 4) + 1, targetStamps: 5 });
      }
    }, 800);
  });
};

export const processScan = async (identifier: string): Promise<ScanResult> => {
  if (import.meta.env.VITE_USE_MOCK_SCAN === 'true') {
    return mockProcessScan(identifier);
  }

  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        const errorData = await response.json();
        return { ok: false, error: errorData.error || 'Pase inválido o de otro local' };
      }
      return { ok: false, error: 'Ocurrió un error al procesar el pase' };
    }
    
    const data = await response.json();
    return data as ScanResult;
  } catch (error) {
    return { ok: false, error: 'Error de red o de servidor' };
  }
};
