import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { normalizeRegion, reverseGeocode } from './geocoding';

export type MyLocation = {
  latitude: number;
  longitude: number;
  /** Short "City, Region" display string, e.g. "Kumasi, Ashanti" — falls back to a generic label if reverse geocoding fails. */
  label: string;
};

const IS_WEB = Platform.OS === 'web';

/**
 * Requests foreground location permission and resolves the device's current
 * position plus a short "City, Region" label, for the home screen's location
 * header and distance-to-worker calculations on the search screens.
 *
 * Never throws — permission denial, disabled location services, or a failed
 * reverse-geocode all just leave `location` null (or label generic); callers
 * should fall back to a sensible default rather than block on this.
 */
export function useMyLocation(): { location: MyLocation | null; loading: boolean } {
  const [location, setLocation] = useState<MyLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (!cancelled) setLoading(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = pos.coords;
        if (cancelled) return;

        let label = '';
        try {
          if (IS_WEB) {
            const r = await reverseGeocode(latitude, longitude);
            const locality = r.address.split(',')[0]?.trim();
            label = [locality, r.region].filter(Boolean).join(', ');
          } else {
            const results = await Location.reverseGeocodeAsync({ latitude, longitude });
            const r = results[0];
            if (r) {
              const region = normalizeRegion(r.region);
              const locality = r.city || r.subregion || r.district;
              label = [locality, region].filter(Boolean).join(', ');
            }
          }
        } catch {
          // Reverse geocoding failed (offline, no key, emulator) — still have coords.
        }

        if (!cancelled) setLocation({ latitude, longitude, label: label || 'Current Location' });
      } catch {
        // Permission/position request failed at the OS level.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { location, loading };
}
