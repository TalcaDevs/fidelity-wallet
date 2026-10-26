import { PanelTitle } from '../../components/admin/PanelTitle';
import { useCallback, useMemo, useState } from 'react';
import { getPlan, type LocationDto, type LocationInput } from '@fidelity/shared';
import { LocationForm } from '../../components/locations/LocationForm';
import { LocationQrPanel } from '../../components/locations/LocationQrPanel';
import { PrintCounterKitModal } from '../../components/locations/PrintCounterKitModal';
import { LocationMap, type MapPin } from '../../components/map/LocationMap';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../../hooks/useToast';
import { createLocation, listLocations, updateLocation } from '../../services/locationsService';
import { publicJoinUrl } from '../../services/merchantService';
import { getCard } from '../../services/cardService';

type Editing =
  | { kind: 'new' }
  | { kind: 'edit'; location: LocationDto }
  | { kind: 'qr'; location: LocationDto }
  | { kind: 'kit'; location: LocationDto }
  | null;

const addressOf = (l: LocationDto) => [l.address, l.commune, l.region].filter(Boolean).join(', ');

/** Sucursales de la marca con su ubicación (HANDOFF §11.3). */
export function Locations({ brandId }: { brandId: string | null }) {
  const fetcher = useCallback(() => listLocations(brandId!), [brandId]);
  const { data, loading, error, setData } = useAsyncData(brandId ? fetcher : null);
  const cardFetcher = useCallback(() => (brandId ? getCard(brandId) : Promise.resolve(null)), [brandId]);
  const { data: cardConfig } = useAsyncData(brandId ? cardFetcher : null);
  const { subscription } = useSubscription(brandId);
  const { notifySuccess, notifyError } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const locations = useMemo(() => data ?? [], [data]);

  const limit = subscription ? getPlan(subscription.planId).limits.locations : null;
  const activeCount = locations.filter((l) => l.isActive).length;
  const atLimit = limit !== null && activeCount >= limit;

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
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text"><PanelTitle text="Sucursales" /></h1>
          <p className="text-panel-muted mt-2 text-sm sm:text-base">
            Tus locales comparten el saldo de sellos: el cliente junta en uno y canjea en otro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ kind: 'new' })}
          disabled={atLimit}
          title={atLimit ? 'Llegaste al límite de sucursales de tu plan' : undefined}
          className="px-6 py-3 rounded-xl bg-panel-primary hover:bg-panel-primary/90 text-white font-bold shadow-lg shadow-brand-blue/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-panel-primary"
        >
          Agregar sucursal
        </button>
      </div>

      {limit !== null && (
        <p className={`text-sm font-bold ${atLimit ? 'text-orange-600' : 'text-panel-muted'}`}>
          {activeCount} de {limit} sucursales activas de tu plan
          {atLimit ? ' · llegaste al límite: sube de plan para agregar o activar más' : ''}
        </p>
      )}

      {error && <ErrorAlert message={error} />}

      <LocationMap pins={pins} className="h-80" />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <ul data-panel-stagger className="grid gap-4 md:grid-cols-2">
          {locations.map((l) => (
            <li key={l.id} className="bg-panel-surface rounded-2xl p-4 sm:p-6 border border-panel-border space-y-3 overflow-hidden shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-lg text-panel-text truncate">{l.name}</h2>
                  <p className="text-sm text-panel-muted truncate">{addressOf(l) || 'Sin dirección'}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${l.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-panel-soft text-panel-muted '}`}>
                  {l.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-xs text-panel-muted break-all">
                Registro: <a href={publicJoinUrl(l.slug)} target="_blank" rel="noopener noreferrer" className="text-panel-accent font-bold">{publicJoinUrl(l.slug)}</a>
              </p>
              {l.latitude == null && <p className="text-xs font-bold text-orange-600">Falta ubicarlo en el mapa</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => setEditing({ kind: 'edit', location: l })} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-panel-soft text-panel-text hover:bg-panel-accent/10 hover:text-panel-accent">
                  Editar
                </button>
                <button type="button" onClick={() => setEditing({ kind: 'qr', location: l })} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-panel-soft text-panel-text hover:bg-panel-accent/10 hover:text-panel-accent">
                  Link y QR
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ kind: 'kit', location: l })}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-brand-blue hover:bg-blue-600 text-white shadow-sm shadow-brand-blue/30 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Kit de Mesón</span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(l)}
                  disabled={!l.isActive && atLimit}
                  title={!l.isActive && atLimit ? 'Llegaste al límite de sucursales de tu plan' : undefined}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-panel-soft text-panel-text hover:bg-panel-soft disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {l.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing?.kind === 'qr' && (
        <Modal trapFocus title={`Link y QR · ${editing.location.name}`} onClose={() => setEditing(null)}>
          <LocationQrPanel
            location={editing.location}
            cardConfig={cardConfig}
            onSlugChange={(slug) => {
              const updated = { ...editing.location, slug };
              upsert(updated);
              setEditing({ kind: 'qr', location: updated });
            }}
          />
        </Modal>
      )}

      {editing?.kind === 'kit' && (
        <PrintCounterKitModal
          location={editing.location}
          cardConfig={cardConfig}
          onClose={() => setEditing(null)}
        />
      )}

      {editing && editing.kind !== 'qr' && editing.kind !== 'kit' && (
        <Modal trapFocus
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
