/**
 * geocodingService — free, keyless place search & reverse geocoding backed by
 * OpenStreetMap's Nominatim API (https://nominatim.org).
 *
 * Nominatim usage policy notes we honour here:
 *  - Identify the app via the `email` query param (we do NOT set a User-Agent
 *    header — see getJson for why that breaks the request on React Native).
 *  - No more than ~1 request/second. Callers should debounce input (the
 *    LocationPicker does) and we expose an AbortSignal so stale requests can
 *    be cancelled.
 *  - Results are cached lightly by the caller via debounce; we don't hammer.
 *
 * This runs entirely over `fetch`, so it needs no native module and works on
 * both iOS and Android.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * Location bias. The app is used primarily in South Africa, so we nudge
 * Nominatim to surface South African places first instead of foreign ones —
 * while still returning foreign matches when the user clearly searches for one.
 *
 *  - `viewbox` is a rough bounding box around South Africa. With `bounded=0`
 *    it is a *soft* preference: places inside the box rank higher, but places
 *    outside it (e.g. "Eiffel Tower") are still returned. We deliberately do
 *    NOT use `countrycodes=za`, because that is a hard filter that would drop
 *    every foreign result.
 *  - `accept-language=en-ZA` keeps labels in English.
 */
/** lon_min,lat_max,lon_max,lat_min — a loose box around South Africa. */
const PREFERRED_VIEWBOX = '16.0,-22.0,33.0,-35.0';
const PREFERRED_LANGUAGE = 'en-ZA';

/**
 * Build a query string from a params object.
 *
 * We deliberately do NOT use `URLSearchParams`: React Native's built-in
 * implementation is effectively a no-op — `set()` can throw "not implemented"
 * and `toString()` returns an empty/malformed string, so the query never
 * reaches Nominatim and no results (or address) come back. This was the real
 * cause of the "no suggestions / no address on the map" bug. Encoding each
 * key/value by hand with `encodeURIComponent` works reliably on both platforms.
 */
function buildQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/** The South-Africa-first location bias params, added to every search query. */
function locationBiasParams(): Record<string, string> {
  return {
    viewbox: PREFERRED_VIEWBOX,
    // 0 = prefer results in the viewbox but still allow ones outside it.
    bounded: '0',
    'accept-language': PREFERRED_LANGUAGE,
  };
}

/**
 * Identifies the app to Nominatim. Their usage policy REQUIRES a descriptive,
 * identifiable `User-Agent`; requests with a generic UA are rejected with HTTP
 * 403 (https://operations.osmfoundation.org/policies/nominatim/).
 *
 * On React Native this matters a lot: the default UA is `okhttp/...` (Android)
 * or an empty/system UA (iOS), and Nominatim 403s BOTH of those — that was the
 * real "couldn't search places" failure. Contrary to a note in this file's
 * history, RN's fetch DOES send a `User-Agent` header when you set one (the
 * app's own API client sets custom headers via fetch and they arrive), so we
 * set a descriptive UA below. The `email` query param is kept as an additional
 * identifier per the policy, but on its own it does NOT prevent the 403.
 */
const CONTACT_EMAIL = 'support@amori.app';

/** Descriptive UA required by Nominatim's usage policy (a generic UA 403s). */
const USER_AGENT = `Amori/1.0 (${CONTACT_EMAIL})`;

/** A place returned from search or reverse geocoding. */
export interface GeocodePlace {
  /** Stable id for list keys (Nominatim place_id as a string). */
  id: string;
  /** Full human-readable address, e.g. "Santorini, Greece". */
  displayName: string;
  /** Short primary label (first segment of the display name). */
  title: string;
  /** Remaining address detail after the title. */
  subtitle: string;
  latitude: number;
  longitude: number;
}

interface NominatimSearchResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
}

interface NominatimReverseResult {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
}

function toPlace(r: {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
}): GeocodePlace | null {
  const latitude = Number(r.lat);
  const longitude = Number(r.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const parts = r.display_name.split(',').map((p) => p.trim());
  const title = r.name?.trim() || parts[0] || r.display_name;
  const subtitle = parts.slice(title === parts[0] ? 1 : 0).join(', ');

  return {
    id: String(r.place_id),
    displayName: r.display_name,
    title,
    subtitle,
    latitude,
    longitude,
  };
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  // Nominatim rejects generic user agents (okhttp on Android, empty on iOS)
  // with HTTP 403, so we MUST send a descriptive User-Agent. RN's fetch does
  // deliver custom request headers, so setting it here works on both platforms.
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    signal,
  });
  if (!response.ok) throw new Error(`Geocoding failed (HTTP ${response.status})`);
  return (await response.json()) as T;
}

/** The Nominatim identifier param, added to every query. */
function contactParams(): Record<string, string> {
  return { email: CONTACT_EMAIL };
}

export const geocodingService = {
  /**
   * Free-text place search for autocomplete. Returns up to `limit` matches
   * ordered by Nominatim's relevance. Pass an AbortSignal to cancel a stale
   * request when the query changes.
   */
  async search(
    query: string,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<GeocodePlace[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    const queryString = buildQuery({
      q,
      format: 'jsonv2',
      addressdetails: '0',
      limit: String(options.limit ?? 5),
      ...locationBiasParams(),
      ...contactParams(),
    });

    const results = await getJson<NominatimSearchResult[]>(
      `${NOMINATIM_BASE}/search?${queryString}`,
      options.signal,
    );

    return results
      .map((r) => toPlace({ ...r, lat: r.lat, lon: r.lon }))
      .filter((p): p is GeocodePlace => p !== null);
  },

  /**
   * Resolve a coordinate to the nearest address (used when the user drags the
   * map pin to fine-tune the exact spot).
   */
  async reverse(
    latitude: number,
    longitude: number,
    options: { signal?: AbortSignal } = {},
  ): Promise<GeocodePlace | null> {
    const queryString = buildQuery({
      lat: String(latitude),
      lon: String(longitude),
      format: 'jsonv2',
      addressdetails: '0',
      'accept-language': PREFERRED_LANGUAGE,
      ...contactParams(),
    });

    const result = await getJson<NominatimReverseResult>(
      `${NOMINATIM_BASE}/reverse?${queryString}`,
      options.signal,
    );

    if (!result?.display_name || result.lat == null || result.lon == null) {
      return null;
    }

    return toPlace({
      place_id: result.place_id ?? `${latitude},${longitude}`,
      display_name: result.display_name,
      lat: result.lat,
      lon: result.lon,
    });
  },
};
