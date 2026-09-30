import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  detail?: string;
  muted?: boolean;
}

const SANTIAGO: L.LatLngTuple = [-33.4489, -70.6693];
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// divIcon en vez del ícono por defecto: el de Leaflet usa imágenes que el bundler no resuelve.
const pinIcon = (muted = false) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);background:${muted ? '#94a3b8' : '#2563eb'}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * Mapa de OpenStreetMap (HANDOFF §11.3). Con `pins` muestra locales; con `value` + `onChange`
 * es un selector de ubicación con pin arrastrable (clic en el mapa también lo mueve).
 */
export function LocationMap({
  pins = [],
  value,
  onChange,
  onPinClick,
  className = 'h-80',
}: {
  pins?: MapPin[];
  value?: { latitude: number; longitude: number } | null;
  onChange?: (coords: { latitude: number; longitude: number }) => void;
  onPinClick?: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinsLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const onPinClickRef = useRef(onPinClick);
  useEffect(() => {
    onChangeRef.current = onChange;
    onPinClickRef.current = onPinClick;
  }, [onChange, onPinClick]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { center: SANTIAGO, zoom: 11 });
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    pinsLayerRef.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      onChangeRef.current?.({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
    mapRef.current = map;
    // El contenedor puede medir 0 al montar dentro de un modal o una pestaña.
    const resize = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      pickerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = pinsLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const pin of pins) {
      const marker = L.marker([pin.latitude, pin.longitude], { icon: pinIcon(pin.muted), title: pin.label })
        .bindPopup(`<strong>${escapeHtml(pin.label)}</strong>${pin.detail ? `<br>${escapeHtml(pin.detail)}` : ''}`)
        .addTo(layer);
      marker.on('click', () => onPinClickRef.current?.(pin.id));
    }
    if (pins.length > 0 && !value) {
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 15 });
    }
  }, [pins, value]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onChangeRef.current) return;
    if (!value) {
      pickerRef.current?.remove();
      pickerRef.current = null;
      return;
    }
    const position: L.LatLngTuple = [value.latitude, value.longitude];
    if (!pickerRef.current) {
      pickerRef.current = L.marker(position, { draggable: true, icon: pinIcon() }).addTo(map);
      pickerRef.current.on('dragend', () => {
        const { lat, lng } = pickerRef.current!.getLatLng();
        onChangeRef.current?.({ latitude: lat, longitude: lng });
      });
    } else {
      pickerRef.current.setLatLng(position);
    }
    map.setView(position, Math.max(map.getZoom(), 15));
  }, [value]);

  return <div ref={containerRef} className={`w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 z-0 ${className}`} />;
}
