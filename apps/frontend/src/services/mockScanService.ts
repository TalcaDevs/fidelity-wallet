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

// MOCK API CALL - Replace with real API later (Dev 1 task)
export const mockProcessScan = async (identifier: string): Promise<ScanResult> => {
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
