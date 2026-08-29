// Native (iOS / Android) geocoding against Google Places API (New) + Geocoding API
// over plain REST. The web build resolves lib/geocoding.web.ts instead — these
// REST endpoints are not CORS-enabled, so the browser uses the Maps JS SDK.

import {
  GOOGLE_MAPS_API_KEY as KEY,
  regionFromComponents,
  type GeoResult,
  type GeoSuggestion,
} from './geocoding.shared';

export { GHANA_REGIONS, newSessionToken, normalizeRegion } from './geocoding.shared';
export type { GeoResult, GeoSuggestion } from './geocoding.shared';

type LatLng = { latitude: number; longitude: number };

/** Address suggestions for a partial query, biased to Ghana and (optionally) near a point. */
export async function searchPlaces(
  input: string,
  opts: { sessionToken: string; near?: LatLng },
): Promise<GeoSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 3) return [];
  if (!KEY) throw new Error('geocoding/no-key');

  const body: Record<string, unknown> = {
    input: trimmed,
    includedRegionCodes: ['gh'],
    sessionToken: opts.sessionToken,
  };
  if (opts.near) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.near.latitude, longitude: opts.near.longitude },
        radius: 30000,
      },
    };
  }

  let res: Response;
  try {
    res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[geocoding] autocomplete request failed:', err);
    throw new Error('geocoding/search-failed');
  }
  if (!res.ok) {
    console.warn('[geocoding] autocomplete HTTP', res.status, await res.text().catch(() => ''));
    throw new Error(`geocoding/search-${res.status}`);
  }

  const data = await res.json();
  const suggestions: any[] = data?.suggestions ?? [];
  return suggestions
    .map((s) => s?.placePrediction)
    .filter(Boolean)
    .map((p: any): GeoSuggestion => ({
      placeId: p.placeId ?? '',
      primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
    }))
    .filter((s: GeoSuggestion) => s.placeId && s.primary);
}

/** Resolves a suggestion's placeId to coordinates + a formatted address. */
export async function getPlaceDetails(placeId: string, sessionToken: string): Promise<GeoResult> {
  if (!KEY) throw new Error('geocoding/no-key');
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
    `?sessionToken=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'location,formattedAddress,addressComponents',
    },
  });
  if (!res.ok) throw new Error(`geocoding/details-${res.status}`);
  const data = await res.json();
  const lat = data?.location?.latitude;
  const lng = data?.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') throw new Error('geocoding/details-empty');
  return {
    latitude: lat,
    longitude: lng,
    address: data?.formattedAddress ?? '',
    region: regionFromComponents(data?.addressComponents),
  };
}

/** Best-effort street address for a coordinate. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoResult> {
  if (!KEY) throw new Error('geocoding/no-key');
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${latitude},${longitude}&region=gh&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geocoding/reverse-${res.status}`);
  const data = await res.json();
  const first = data?.results?.[0];
  if (!first) throw new Error('geocoding/reverse-empty');
  return {
    latitude,
    longitude,
    address: first.formatted_address ?? '',
    region: regionFromComponents(first.address_components),
  };
}
