import { PageHeader } from '../../components/layout/PageHeader';
import { useCallback, useMemo, useState } from 'react';
import { getPlan, type LocationDto, type LocationInput } from '@fidelity/shared';
import { LocationForm } from '../../components/locations/LocationForm';
import { LocationQrPanel } from '../../components/locations/LocationQrPanel';
import { PrintCounterKitModal } from '../../components/locations/PrintCounterKitModal';
import { LocationMap, type MapPin } from '../../components/map/LocationMap';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { CopyBox } from '../../components/ui/CopyBox';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PlanLimitNotice } from '../../components/billing/PlanLimitNotice';
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
  | { kind: 'kit'; location: LocationDto; returnTo?: 'qr' }
  | null;

const addressOf = (l: LocationDto) => [l.address, l.commune, l.region].filter(Boolean).join(', ');

/** Sucursales de la marca con su ubicación (HANDOFF §11.3). */
export function Locations({ brandId }: { brandId: string | null }) {
  const fetcher = useCallback(() => listLocations(brandId!), [brandId]);
  const { data, loading, error, setData } = useAsyncData(brandId ? fetcher : null);
  const cardFetcher = useCallback(() => (brandId ? getCard(brandId) : Promise.resolve(null)), [brandId]);
  const { data: cardConfig, loading: cardLoading } = useAsyncData(brandId ? cardFetcher : null);
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
      <PageHeader
        title="Sucursales"
        description="Tus locales comparten el saldo de sellos: el cliente junta en uno y canjea en otro."
        className="mb-0"
        actions={
          <button
            type="button"
            onClick={() => setEditing({ kind: 'new' })}
            disabled={atLimit}
            title={atLimit ? 'Llegaste al límite de sucursales de tu plan' : undefined}
            className="px-6 py-3 rounded-xl bg-panel-primary hover:bg-panel-primary/90 text-white font-bold shadow-lg shadow-brand-blue/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-panel-primary"
          >
            Agregar sucursal
          </button>
        }
      />

      <PlanLimitNotice
        current={activeCount}
        limit={limit}
        resourceName="sucursales activas de tu plan"
        actionVerb="agregar o activar más"
      />

      {error && <ErrorAlert message={error} />}

      <LocationMap pins={pins} className="h-80" />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 min-w-0">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : locations.length === 0 ? (
        <EmptyState
          variant="card"
          title="Aún no tienes sucursales registradas"
          subtitle="Crea tu primer local para configurar el código QR de registro y la dirección."
        />
      ) : (
        <ul data-panel-stagger className="grid gap-4 md:grid-cols-2 min-w-0">
          {locations.map((l) => (
            <li
              key={l.id}
              className="bg-panel-surface rounded-2xl p-4 sm:p-6 border border-panel-border shadow-panel space-y-4 hover:border-panel-border/80 transition-all flex flex-col justify-between min-w-0 overflow-hidden"
            >
              <div className="space-y-4">
                {/* Cabecera: Icono, Nombre de sucursal y Badge de estado */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-panel-accent/10 text-panel-accent flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-lg text-panel-text truncate">{l.name}</h2>
                      <p className="text-xs sm:text-sm text-panel-muted truncate flex items-center gap-1 mt-0.5">
                        <svg className="w-3.5 h-3.5 shrink-0 text-panel-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{addressOf(l) || 'Sin dirección'}</span>
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone={l.isActive ? 'success' : 'neutral'}>
                    {l.isActive ? 'Activo' : 'Inactivo'}
                  </StatusBadge>
                </div>

                <CopyBox
                  label="Link de registro de clientes:"
                  value={publicJoinUrl(l.slug)}
                  buttonLabel="Copiar"
                />

                {l.latitude == null ? (
                  <p className="text-xs font-bold text-orange-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Falta ubicarlo en el mapa</span>
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Coordenadas listas para Google Wallet</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-panel-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mt-4 min-w-0">
                <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ kind: 'kit', location: l })}
                    disabled={cardLoading}
                    title={cardLoading ? 'Cargando configuración de tarjeta...' : undefined}
                    className="h-9 px-2 sm:px-3.5 rounded-xl text-xs font-bold bg-panel-primary hover:bg-panel-primary/90 text-white shadow-xs border border-transparent inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed min-w-0 w-full sm:w-auto"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="truncate">Kit de Mesón</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditing({ kind: 'qr', location: l })}
                    className="h-9 px-2 sm:px-3.5 rounded-xl text-xs font-bold bg-panel-surface hover:bg-panel-soft text-panel-text border border-panel-border shadow-2xs transition-all cursor-pointer active:scale-95 inline-flex items-center justify-center gap-1.5 min-w-0 w-full sm:w-auto"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 text-panel-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <span className="truncate">Link y QR</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ kind: 'edit', location: l })}
                    className="h-9 px-2 sm:px-3.5 rounded-xl text-xs font-bold bg-panel-surface hover:bg-panel-soft text-panel-text border border-panel-border shadow-2xs transition-all cursor-pointer active:scale-95 inline-flex items-center justify-center gap-1.5 min-w-0 w-full sm:w-auto"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 text-panel-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="truncate">Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleActive(l)}
                    disabled={!l.isActive && atLimit}
                    title={!l.isActive && atLimit ? 'Llegaste al límite de sucursales de tu plan' : undefined}
                    className={`h-9 px-2 sm:px-3.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 inline-flex items-center justify-center min-w-0 w-full sm:w-auto ${
                      l.isActive
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/25'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                    }`}
                  >
                    <span className="truncate">{l.isActive ? 'Desactivar' : 'Activar'}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing?.kind === 'qr' && (
        <Modal trapFocus size="lg" title={`Link y QR · ${editing.location.name}`} onClose={() => setEditing(null)}>
          <LocationQrPanel
            location={editing.location}
            cardConfig={cardConfig}
            cardLoading={cardLoading}
            onOpenKit={() => setEditing({ kind: 'kit', location: editing.location, returnTo: 'qr' })}
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
          onClose={() => {
            if (editing.returnTo === 'qr') {
              setEditing({ kind: 'qr', location: editing.location });
            } else {
              setEditing(null);
            }
          }}
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
