/**
 * Opens the device's maps app pointed at a job's location so a worker can
 * actually navigate there. Prefers turn-by-turn directions when we have
 * coordinates; otherwise falls back to a plain address search. On the web
 * build it opens Google Maps in a new tab.
 *
 * Uses the platform-neutral `google.com/maps` URLs — on a phone these are
 * intercepted by the Google Maps / Apple Maps app when it's installed, and
 * open in the browser otherwise, so we don't need `canOpenURL` package
 * visibility declarations for a custom scheme.
 */
import { Linking, Platform } from 'react-native';
import { Alert } from '@/lib/Alert';

type MapsTarget = {
  latitude?: number | null;
  longitude?: number | null;
  /** Human-readable address, used when there are no coordinates. */
  label?: string | null;
};

export async function openInMaps({ latitude, longitude, label }: MapsTarget): Promise<void> {
  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);
  const query = (label ?? '').trim();

  if (!hasCoords && !query) {
    Alert.alert('No location', "This job doesn't have a location on file yet.");
    return;
  }

  const url = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Cannot open maps', "Couldn't open a maps app on this device.");
  }
}

/** True when a job has something we can point a maps app at. */
export function hasMappableLocation(target: MapsTarget): boolean {
  const hasCoords =
    typeof target.latitude === 'number' &&
    typeof target.longitude === 'number' &&
    !Number.isNaN(target.latitude) &&
    !Number.isNaN(target.longitude);
  return hasCoords || (target.label ?? '').trim().length > 0;
}
