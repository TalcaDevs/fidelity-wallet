import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHILE_REGIONS, type GeocodeResultDto } from '@fidelity/shared';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
/** Con 1 req/s, más de esto en espera ya supera lo que un usuario aguanta en un autocompletado. */
export const MAX_PENDING_REQUESTS = 5;

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    city_district?: string;
    state?: string;
  };
}

/** "Región Metropolitana de Santiago" → "Metropolitana", según CHILE_REGIONS. */
export function matchRegion(state: string | undefined): string | null {
  if (!state) return null;
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const target = normalize(state);
  return CHILE_REGIONS.find((r) => target.includes(normalize(r))) ?? null;
}

export function toGeocodeResult(r: NominatimResult): GeocodeResultDto {
  const a = r.address ?? {};
  const street = [a.road, a.house_number].filter(Boolean).join(' ');
  return {
    label: r.display_name,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    address: street || null,
    commune:
      a.city ?? a.town ?? a.village ?? a.city_district ?? a.suburb ?? null,
    region: matchRegion(a.state),
  };
}

/**
 * Proxy a Nominatim (OpenStreetMap). Su política exige a lo más 1 request por segundo y un
 * User-Agent identificable: las consultas se serializan acá, se cachean, y el navegador nunca
 * llama a Nominatim directo (HANDOFF §11.3). La cola tiene tope: pasado MAX_PENDING_REQUESTS se
 * responde 503 de inmediato en vez de dejar esperando al cliente, y búsquedas iguales en vuelo
 * comparten la misma consulta.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<
    string,
    { at: number; results: GeocodeResultDto[] }
  >();
  private readonly inFlight = new Map<string, Promise<GeocodeResultDto[]>>();
  private queue: Promise<unknown> = Promise.resolve();
  private pending = 0;
  private lastRequestAt = 0;

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<GeocodeResultDto[]> {
    const key = query.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.results;

    const running = this.inFlight.get(key);
    if (running) return running;

    const request = this.enqueue(() => this.fetchNominatim(key))
      .then((results) => {
        if (this.cache.size >= MAX_CACHE_ENTRIES) {
          this.cache.delete(this.cache.keys().next().value as string);
        }
        this.cache.set(key, { at: Date.now(), results });
        return results;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.pending >= MAX_PENDING_REQUESTS) {
      return Promise.reject(
        new ServiceUnavailableException(
          'Hay muchas búsquedas de direcciones en curso. Intenta en unos segundos.',
        ),
      );
    }
    this.pending++;
    const run = this.queue.then(async () => {
      const wait = this.lastRequestAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      this.lastRequestAt = Date.now();
      return task();
    });
    this.queue = run.catch(() => undefined);
    return run.finally(() => this.pending--);
  }

  private async fetchNominatim(query: string): Promise<GeocodeResultDto[]> {
    const url = new URL(NOMINATIM_URL);
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'cl',
      limit: '5',
      'accept-language': 'es',
    }).toString();

    const contact =
      this.config.get<string>('GEOCODING_CONTACT_EMAIL') ??
      'soporte@fidelity-wallet.local';
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': `FidelityWallet/1.0 (${contact})` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
      const body = (await res.json()) as NominatimResult[];
      return body.map(toGeocodeResult);
    } catch (err) {
      this.logger.warn(
        `Geocoding falló: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ServiceUnavailableException(
        'No pudimos buscar la dirección. Ubica el local en el mapa.',
      );
    }
  }
}
