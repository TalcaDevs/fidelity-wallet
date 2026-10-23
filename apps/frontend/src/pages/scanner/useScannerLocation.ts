import { useState, useEffect } from 'react';
import { listBrandLocations, type LocationOption } from '../../services/locationsService';
import type { MerchantRole } from '../../hooks/useMembership';

function getStoredLocation(key: string | null): string | null {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredLocation(key: string | null, value: string): void {
  if (!key) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Modo privado o sin permisos de almacenamiento
  }
}

function resolveInitialLocation(
  role: MerchantRole | null,
  storageKey: string | null,
  initialMerchantId: string,
): string {
  if (role === 'OWNER' && storageKey) {
    const cached = getStoredLocation(storageKey);
    if (cached) return cached;
  }
  return initialMerchantId;
}

export interface UseScannerLocationParams {
  brandId?: string | null;
  initialMerchantId: string;
  role: MerchantRole | null;
}

export interface UseScannerLocationReturn {
  merchantId: string;
  locations: LocationOption[];
  activeLocation: LocationOption | undefined;
  selectLocation: (newMerchantId: string) => void;
}

export function useScannerLocation({
  brandId,
  initialMerchantId,
  role,
}: UseScannerLocationParams): UseScannerLocationReturn {
  const storageKey = brandId ? `fidelity_scanner_merchant_${brandId}` : null;

  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(() =>
    resolveInitialLocation(role, storageKey, initialMerchantId),
  );
  const [prevStorageKey, setPrevStorageKey] = useState<string | null>(storageKey);

  if (prevStorageKey !== storageKey) {
    setPrevStorageKey(storageKey);
    setSelectedMerchantId(resolveInitialLocation(role, storageKey, initialMerchantId));
  }

  const [locations, setLocations] = useState<LocationOption[]>([]);

  useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    listBrandLocations(brandId)
      .then((data) => {
        if (cancelled) return;
        const active = data.filter((l) => l.isActive);
        setLocations(active);
        if (role === 'OWNER') {
          setSelectedMerchantId((current) => {
            if (active.length > 0 && !active.some((l) => l.id === current)) {
              const fallback = active.some((l) => l.id === initialMerchantId)
                ? initialMerchantId
                : active[0].id;
              setStoredLocation(storageKey, fallback);
              return fallback;
            }
            return current;
          });
        }
      })
      .catch((err) => {
        console.error('Error al cargar sucursales:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [brandId, role, initialMerchantId, storageKey]);

  const merchantId = role === 'OWNER' ? selectedMerchantId : initialMerchantId;
  const activeLocation = locations.find((l) => l.id === merchantId);

  const selectLocation = (newMerchantId: string) => {
    setSelectedMerchantId(newMerchantId);
    setStoredLocation(storageKey, newMerchantId);
  };

  return {
    merchantId,
    locations,
    activeLocation,
    selectLocation,
  };
}
