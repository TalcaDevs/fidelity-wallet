import { useCallback } from 'react';
import { getSubscription, trialDaysLeft } from '../services/billingService';
import { useAsyncData } from './useAsyncData';

/** brandId null = no pide nada (p. ej. con el flag de facturación apagado). */
export function useSubscription(brandId: string | null) {
  // Los días restantes se calculan al cargar, no en cada render.
  const fetcher = useCallback(async () => {
    const subscription = await getSubscription(brandId!);
    return { subscription, daysLeft: trialDaysLeft(subscription, new Date()) };
  }, [brandId]);
  const { data, loading, error } = useAsyncData(brandId ? fetcher : null);
  return {
    subscription: data?.subscription ?? null,
    trialDaysLeft: data?.daysLeft ?? 0,
    loading,
    error,
  };
}
