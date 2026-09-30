import type { LocationOption } from '../../../../services/locationsService';

export function LocationSelect({
  id,
  locations,
  value,
  onChange,
}: {
  id: string;
  locations: LocationOption[];
  value: string;
  onChange: (locationId: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
    >
      <option value="" disabled>Selecciona un local</option>
      {locations.map((location) => (
        <option key={location.id} value={location.id} disabled={!location.isActive}>
          {location.name}{location.isActive ? '' : ' (inactivo)'}
        </option>
      ))}
    </select>
  );
}
