// Web geocoding via the Google Maps JavaScript SDK (Places API New + Geocoder).
// The REST endpoints used by lib/geocoding.ts are not CORS-enabled, so the
// browser has to go through the SDK, which is loaded anyway for the map.

import { loadGoogleMaps } from './googleMapsLoader.web';
import {
  normalizeRegion,
  regionFromComponents,
  type GeoResult,
  type GeoSuggestion,
} from './geocoding.shared';

export { GHANA_REGIONS, newSessionToken, normalizeRegion } from './geocoding.shared';
export type { GeoResult, GeoSuggestion } from './geocoding.shared';

type LatLng = { latitude: number; longitude: number };

// The SDK's session token is an object, not a string. We rotate our object
// whenever the caller's string token changes so billing still groups a search
// with its follow-up "get details" call.
let tokenKey = '';
let tokenObj: any = null;

function syncToken(key: string, AutocompleteSessionToken: any) {
  if (key !== tokenKey || !tokenObj) {
    tokenObj = new AutocompleteSessionToken();
    tokenKey = key;
  }
  return tokenObj;
}

export async function searchPlaces(
  input: string,
  opts: { sessionToken: string; near?: LatLng },
): Promise<GeoSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];

  const g = await loadGoogleMaps();
  const places = await g.maps.importLibrary('places');
  const { AutocompleteSuggestion, AutocompleteSessionToken } = places;
  if (!AutocompleteSuggestion) {
    console.warn('[geocoding] AutocompleteSuggestion missing — enable "Places API (New)"');
    throw new Error('geocoding/search-unavailable');
  }

  const request: any = {
    input: trimmed,
    includedRegionCodes: ['gh'],
    sessionToken: syncToken(opts.sessionToken, AutocompleteSessionToken),
  };
  if (opts.near) {
    request.locationBias = {
      center: { lat: opts.near.latitude, lng: opts.near.longitude },
      radius: 30000,
    };
  }

  let suggestions: any[];
  try {
    ({ suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request));
  } catch (err) {
    console.warn('[geocoding] fetchAutocompleteSuggestions failed:', err);
    throw new Error('geocoding/search-failed');
  }

  return (suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any): GeoSuggestion => ({
      placeId: p.placeId ?? '',
      primary: p.mainText?.text ?? p.text?.text ?? '',
      secondary: p.secondaryText?.text ?? '',
    }))
    .filter((s: GeoSuggestion) => s.placeId && s.primary);
}

export async function getPlaceDetails(placeId: string, _sessionToken: string): Promise<GeoResult> {
  const g = await loadGoogleMaps();
  const { Place } = await g.maps.importLibrary('places');
  const place = new Place({ id: placeId });
  try {
    await place.fetchFields({ fields: ['location', 'formattedAddress', 'addressComponents'] });
  } catch (err) {
    console.warn('[geocoding] place.fetchFields failed:', err);
    throw new Error('geocoding/details-failed');
  }
  // Consuming the session: the next search should start a fresh token.
  tokenObj = null;
  tokenKey = '';
  const loc = place.location;
  if (!loc) throw new Error('geocoding/details-empty');
  return {
    latitude: loc.lat(),
    longitude: loc.lng(),
    address: place.formattedAddress ?? '',
    region: regionFromComponents(place.addressComponents),
  };
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoResult> {
  const g = await loadGoogleMaps();
  const { Geocoder } = await g.maps.importLibrary('geocoding');
  const geocoder = new Geocoder();
  let results: any[];
  try {
    ({ results } = await geocoder.geocode({ location: { lat: latitude, lng: longitude } }));
  } catch (err) {
    console.warn('[geocoding] reverse geocode failed (is the Geocoding API enabled?):', err);
    throw new Error('geocoding/reverse-failed');
  }
  const first = results?.[0];
  if (!first) throw new Error('geocoding/reverse-empty');
  const admin1 = (first.address_components ?? []).find((c: any) =>
    (c.types ?? []).includes('administrative_area_level_1'),
  );
  return {
    latitude,
    longitude,
    address: first.formatted_address ?? '',
    region: normalizeRegion(admin1?.long_name ?? null),
  };
}
