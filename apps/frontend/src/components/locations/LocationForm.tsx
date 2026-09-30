import { useState, type FormEvent } from 'react';
import { CHILE_REGIONS, type GeocodeResultDto, type LocationDto, type LocationInput } from '@fidelity/shared';
import { geocode } from '../../services/locationsService';
import { errorMessage } from '../../hooks/useAsyncData';
import { ErrorAlert } from '../ui/ErrorAlert';
import { LocationMap } from '../map/LocationMap';

const INPUT =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue';
const LABEL = 'block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5';

const emptyToNull = (v: string) => (v.trim() === '' ? null : v.trim());

type Fields = Record<'name' | 'address' | 'commune' | 'region' | 'phone' | 'contactName', string>;

function initialFields(location?: LocationDto | null): Fields {
  return {
    name: location?.name ?? '',
    address: location?.address ?? '',
    commune: location?.commune ?? '',
    region: location?.region ?? '',
    phone: location?.phone ?? '',
    contactName: location?.contactName ?? '',
  };
}

/** Datos y ubicación de un local; lo usan /admin/locations y /internal. */
export function LocationForm({
  location,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  location?: LocationDto | null;
  submitLabel: string;
  onSubmit: (input: LocationInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<Fields>(() => initialFields(location));
  const [coords, setCoords] = useState(
    location?.latitude != null && location.longitude != null
      ? { latitude: location.latitude, longitude: location.longitude }
      : null,
  );
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<GeocodeResultDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Fields) => (value: string) => setFields((f) => ({ ...f, [key]: value }));

  async function handleSearch() {
    if (search.trim().length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const found = await geocode(search.trim());
      setResults(found);
      if (found.length === 0) setError('No encontramos esa dirección. Marca el local directamente en el mapa.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function pick(result: GeocodeResultDto) {
    setCoords({ latitude: result.latitude, longitude: result.longitude });
    setFields((f) => ({
      ...f,
      address: result.address ?? f.address,
      commune: result.commune ?? f.commune,
      region: result.region ?? f.region,
    }));
    setResults([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: fields.name.trim(),
        address: emptyToNull(fields.address),
        commune: emptyToNull(fields.commune),
        region: emptyToNull(fields.region),
        phone: emptyToNull(fields.phone),
        contactName: emptyToNull(fields.contactName),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="loc-name" className={LABEL}>Nombre del local</label>
          <input id="loc-name" required minLength={2} maxLength={80} value={fields.name} onChange={(e) => set('name')(e.target.value)} className={INPUT} placeholder="Café Demo — Providencia" />
        </div>
      </div>

      <div>
        <label htmlFor="loc-search" className={LABEL}>Buscar dirección</label>
        <div className="flex gap-2">
          <input
            id="loc-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            className={INPUT}
            placeholder="Av. Providencia 2124, Providencia"
          />
          <button type="button" onClick={() => void handleSearch()} disabled={searching} className="px-5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 disabled:opacity-60 shrink-0">
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {results.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <button type="button" onClick={() => pick(r)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <LocationMap value={coords} onChange={setCoords} className="h-64" />
        <p className="text-xs text-slate-500 mt-2">
          {coords ? 'Arrastra el pin o haz clic en el mapa para ajustar la ubicación exacta.' : 'Busca la dirección o haz clic en el mapa para ubicar el local.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="loc-address" className={LABEL}>Dirección</label>
          <input id="loc-address" value={fields.address} onChange={(e) => set('address')(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="loc-commune" className={LABEL}>Comuna</label>
          <input id="loc-commune" value={fields.commune} onChange={(e) => set('commune')(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="loc-region" className={LABEL}>Región</label>
          <select id="loc-region" value={fields.region} onChange={(e) => set('region')(e.target.value)} className={INPUT}>
            <option value="">Sin región</option>
            {CHILE_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="loc-phone" className={LABEL}>Teléfono del local</label>
          <input id="loc-phone" value={fields.phone} onChange={(e) => set('phone')(e.target.value)} className={INPUT} placeholder="+56223456789" />
        </div>
        <div>
          <label htmlFor="loc-contact" className={LABEL}>Persona de contacto</label>
          <input id="loc-contact" value={fields.contactName} onChange={(e) => set('contactName')(e.target.value)} className={INPUT} />
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold disabled:opacity-60">
          {saving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
