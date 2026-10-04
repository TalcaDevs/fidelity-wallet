import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHILE_REGIONS, type LocationPinsBbox } from '@fidelity/shared';
import { LocationMap, type MapPin } from '../../components/map/LocationMap';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { listLocationPins } from '../../services/internalService';
import { INPUT, PageHeader } from './ui';

const BOUNDS_DEBOUNCE_MS = 400;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const clampBbox = (b: LocationPinsBbox): LocationPinsBbox => ({
  minLat: clamp(b.minLat, -90, 90),
  maxLat: clamp(b.maxLat, -90, 90),
  minLng: clamp(b.minLng, -180, 180),
  maxLng: clamp(b.maxLng, -180, 180),
});

/**
 * Al abrir (o cambiar de región) trae todo y encuadra. Desde que el usuario mueve el mapa, pide
 * solo lo que está a la vista y deja de encuadrar, para no pelear con el usuario.
 */
export function InternalMap() {
  const [region, setRegion] = useState('');
  const [bbox, setBbox] = useState<LocationPinsBbox | null>(null);
  const navigate = useNavigate();
  const debounce = useRef<number | undefined>(undefined);
  const fetcher = useCallback(
    () => listLocationPins({ region: region || undefined, ...(bbox ?? {}) }),
    [region, bbox],
  );
  const { data, error } = useAsyncData(fetcher);

  useEffect(() => () => window.clearTimeout(debounce.current), []);

  const onBoundsChange = useCallback((bounds: LocationPinsBbox) => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => setBbox(clampBbox(bounds)), BOUNDS_DEBOUNCE_MS);
  }, []);

  function changeRegion(next: string) {
    window.clearTimeout(debounce.current);
    setBbox(null);
    setRegion(next);
  }

  const pins = useMemo<MapPin[]>(
    () =>
      (data ?? []).map((p) => ({
        id: p.brandId,
        latitude: p.latitude,
        longitude: p.longitude,
        label: `${p.brandName} — ${p.name}`,
        detail: [p.commune, p.region].filter(Boolean).join(', '),
        muted: !p.isActive || p.brandStatus === 'SUSPENDED',
      })),
    [data],
  );

  return (
    <div>
      <PageHeader
        title="Mapa de locales"
        subtitle={data ? `${data.length} locales ${bbox ? 'a la vista' : 'con ubicación'} · en gris, inactivos o de marcas suspendidas` : undefined}
        actions={
          <select aria-label="Región" value={region} onChange={(e) => changeRegion(e.target.value)} className={INPUT}>
            <option value="">Todo Chile</option>
            {CHILE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        }
      />
      {error && <ErrorAlert message={error} />}
      <LocationMap
        pins={pins}
        autoFit={bbox === null}
        onBoundsChange={onBoundsChange}
        onPinClick={(brandId) => navigate(`/internal/brands/${brandId}`)}
        className="h-[70vh]"
      />
    </div>
  );
}
