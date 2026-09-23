import { useCallback } from 'react';
import { getAudioContext, playSuccessSound, playRewardSound, playErrorSound, playAlreadyScannedSound } from '../utils/audioFeedback';

export function useScanFeedback() {
  const resumeAudio = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const triggerFeedback = useCallback((type: 'success' | 'reward' | 'error' | 'alreadyScanned') => {
    if (type === 'reward') {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
      playRewardSound();
    } else if (type === 'error') {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      playErrorSound();
    } else if (type === 'alreadyScanned') {
      // Distinct sound and no vibration per the review "sin la vibración de confirmación"
      playAlreadyScannedSound();
    } else {
      if (navigator.vibrate) navigator.vibrate(100);
      playSuccessSound();
    }
  }, []);

  return { triggerFeedback, resumeAudio };
}
