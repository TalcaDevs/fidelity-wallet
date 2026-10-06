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
      className="w-full bg-panel-soft border border-panel-border rounded-xl px-4 py-3 text-panel-text font-medium focus:outline-none focus:ring-2 focus:ring-panel-accent/50 focus:border-panel-accent"
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
