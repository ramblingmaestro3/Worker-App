import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

/**
 * Requests foreground location permission for an explicit user action ("use my
 * current location"). The OS only shows its permission dialog once ever — after
 * that `requestForegroundPermissionsAsync` resolves `granted: false` with no
 * prompt, so every location button in the app was silently doing nothing. When
 * that happens this explains why and offers to open the system settings.
 *
 * Returns true only when permission is granted. Pass `{ silent: true }` for
 * passive/background reads (a screen loading its own location) so it never
 * pops an alert the user didn't ask for.
 */
export async function ensureLocationPermission(opts?: { silent?: boolean }): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;

  if (existing.canAskAgain) {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.granted) return true;
    // User just dismissed the live prompt — don't stack an alert on top of it.
    if (requested.canAskAgain) return false;
  }

  if (!opts?.silent) {
    Alert.alert(
      'Location access is off',
      'AdwumaGo needs location permission to use your current position. Turn it on for AdwumaGo in your device settings, then try again.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }
  return false;
}
