import { useCallback } from 'react';
import { listBrandLocations } from '../services/locationsService';
import { useAsyncData } from './useAsyncData';

export function useBrandLocations(brandId: string | null) {
  const fetcher = useCallback(() => listBrandLocations(brandId!), [brandId]);
  const { data, loading, error } = useAsyncData(brandId ? fetcher : null);
  return { locations: data ?? [], loading, error };
}
