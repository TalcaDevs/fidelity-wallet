import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHILE_REGIONS } from '@fidelity/shared';
import { LocationMap, type MapPin } from '../../components/map/LocationMap';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { listLocationPins } from '../../services/internalService';
import { INPUT, PageHeader } from './ui';

export function InternalMap() {
  const [region, setRegion] = useState('');
  const navigate = useNavigate();
  const fetcher = useCallback(() => listLocationPins({ region: region || undefined }), [region]);
  const { data, error } = useAsyncData(fetcher);

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
        subtitle={data ? `${data.length} locales con ubicación · en gris, inactivos o de marcas suspendidas` : undefined}
        actions={
          <select aria-label="Región" value={region} onChange={(e) => setRegion(e.target.value)} className={INPUT}>
            <option value="">Todo Chile</option>
            {CHILE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        }
      />
      {error && <ErrorAlert message={error} />}
      <LocationMap pins={pins} onPinClick={(brandId) => navigate(`/internal/brands/${brandId}`)} className="h-[70vh]" />
    </div>
  );
}
