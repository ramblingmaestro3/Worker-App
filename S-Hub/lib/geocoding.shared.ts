// Platform-agnostic pieces shared by lib/geocoding.ts (native, REST) and
// lib/geocoding.web.ts (Google Maps JS SDK). Kept in its own file so the web
// build doesn't try to resolve `./geocoding` back onto itself.

export type GeoSuggestion = {
  placeId: string;
  /** Bold line, e.g. "Kejetia Market". */
  primary: string;
  /** Context line, e.g. "Kumasi, Ashanti, Ghana". */
  secondary: string;
};

export type GeoResult = {
  latitude: number;
  longitude: number;
  address: string;
  region: string | null;
};

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
  'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
  'Upper East', 'Upper West', 'Volta', 'Western', 'Western North',
];

/** Maps a raw admin-area name ("Ashanti Region", "ashanti") to a canonical Ghana region, or null. */
export function normalizeRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+region$/i, '').trim();
  return GHANA_REGIONS.find((r) => r.toLowerCase() === cleaned.toLowerCase()) ?? null;
}

/** Reads the region from a Google address_components / addressComponents array (handles both casings). */
export function regionFromComponents(components: any[] | undefined | null): string | null {
  if (!Array.isArray(components)) return null;
  const admin1 = components.find((c) => (c?.types ?? []).includes('administrative_area_level_1'));
  return normalizeRegion(admin1?.longText ?? admin1?.long_name ?? null);
}

/** Opaque token that groups an autocomplete session with its final "get details" call for billing. */
export function newSessionToken(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
