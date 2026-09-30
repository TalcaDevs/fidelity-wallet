import { useCallback, useMemo, useState } from 'react';
import { getPlan, type LocationDto, type LocationInput } from '@fidelity/shared';
import { LocationForm } from '../../components/locations/LocationForm';
import { LocationMap, type MapPin } from '../../components/map/LocationMap';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Modal } from '../../components/ui/Modal';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../../hooks/useToast';
import { createLocation, listLocations, updateLocation } from '../../services/locationsService';
import { publicJoinUrl } from '../../services/merchantService';

type Editing = { kind: 'new' } | { kind: 'edit'; location: LocationDto } | null;

const addressOf = (l: LocationDto) => [l.address, l.commune, l.region].filter(Boolean).join(', ');

/** Sucursales de la marca con su ubicación (HANDOFF §11.3). */
export function Locations({ brandId }: { brandId: string | null }) {
  const fetcher = useCallback(() => listLocations(brandId!), [brandId]);
  const { data, loading, error, setData } = useAsyncData(brandId ? fetcher : null);
  const { subscription } = useSubscription(brandId);
  const { notifySuccess, notifyError } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const locations = useMemo(() => data ?? [], [data]);

  const limit = subscription ? getPlan(subscription.planId).limits.locations : null;
  const overLimit = limit !== null && locations.length >= limit;

  const pins = useMemo<MapPin[]>(
    () =>
      locations
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => ({
          id: l.id,
          latitude: l.latitude!,
          longitude: l.longitude!,
          label: l.name,
          detail: addressOf(l),
          muted: !l.isActive,
        })),
    [locations],
  );

  const upsert = (saved: LocationDto) =>
    setData((prev) => {
      const list = prev ?? [];
      return list.some((l) => l.id === saved.id) ? list.map((l) => (l.id === saved.id ? saved : l)) : [...list, saved];
    });

  async function handleSubmit(input: LocationInput) {
    if (!brandId || !editing) return;
    const saved =
      editing.kind === 'new'
        ? await createLocation(brandId, input)
        : await updateLocation(brandId, editing.location.id, input);
    upsert(saved);
    setEditing(null);
    notifySuccess(editing.kind === 'new' ? 'Sucursal creada' : 'Sucursal actualizada');
  }

  async function toggleActive(location: LocationDto) {
    if (!brandId) return;
    try {
      upsert(await updateLocation(brandId, location.id, { isActive: !location.isActive }));
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'No se pudo actualizar la sucursal');
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sucursales</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Tus locales comparten el saldo de sellos: el cliente junta en uno y canjea en otro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ kind: 'new' })}
          className="px-6 py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold shadow-lg shadow-brand-blue/30"
        >
          Agregar sucursal
        </button>
      </div>

      {limit !== null && (
        <p className={`text-sm font-bold ${overLimit ? 'text-orange-600' : 'text-slate-500'}`}>
          {locations.length} de {limit} sucursales de tu plan
          {locations.length > limit ? ' · superaste el límite de tu plan' : overLimit ? ' · llegaste al límite de tu plan' : ''}
        </p>
      )}

      {error && <ErrorAlert message={error} />}

      <LocationMap pins={pins} className="h-80" />

      {loading ? (
        <div className="animate-pulse grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl" />)}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {locations.map((l) => (
            <li key={l.id} className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-lg text-slate-900 dark:text-white truncate">{l.name}</h2>
                  <p className="text-sm text-slate-500 truncate">{addressOf(l) || 'Sin dirección'}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${l.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {l.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 break-all">
                Registro: <a href={publicJoinUrl(l.slug)} target="_blank" rel="noopener noreferrer" className="text-brand-blue font-bold">{publicJoinUrl(l.slug)}</a>
              </p>
              {l.latitude == null && <p className="text-xs font-bold text-orange-600">Falta ubicarlo en el mapa</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditing({ kind: 'edit', location: l })} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-brand-blue/10 hover:text-brand-blue">
                  Editar
                </button>
                <button type="button" onClick={() => void toggleActive(l)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200">
                  {l.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal
          size="lg"
          title={editing.kind === 'new' ? 'Nueva sucursal' : `Editar ${editing.location.name}`}
          description={editing.kind === 'new' ? 'El link de registro (/join) se genera a partir del nombre.' : undefined}
          onClose={() => setEditing(null)}
        >
          <LocationForm
            location={editing.kind === 'edit' ? editing.location : null}
            submitLabel={editing.kind === 'new' ? 'Crear sucursal' : 'Guardar cambios'}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
