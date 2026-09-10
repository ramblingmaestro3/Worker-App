import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

/**
 * Requests a camera / photo-library permission for an explicit user action.
 * The OS only shows its permission dialog once — after a denial,
 * `request*PermissionsAsync` resolves `granted: false` with no prompt, so the
 * "Take Photo" / "Choose from Gallery" buttons were silently doing nothing.
 * When that happens this explains why and offers to open the system settings.
 * Returns true only when permission is granted.
 */
async function ensure(
  get: () => Promise<ImagePicker.PermissionResponse>,
  request: () => Promise<ImagePicker.PermissionResponse>,
  label: string,
): Promise<boolean> {
  const existing = await get();
  if (existing.granted) return true;

  if (existing.canAskAgain) {
    const requested = await request();
    if (requested.granted) return true;
    if (requested.canAskAgain) return false; // user dismissed the live prompt
  }

  Alert.alert(
    `${label} access is off`,
    `Turn on ${label.toLowerCase()} access for AdwumaGo in your device settings, then try again.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

export const ensureCameraPermission = () =>
  ensure(
    ImagePicker.getCameraPermissionsAsync,
    ImagePicker.requestCameraPermissionsAsync,
    'Camera',
  );

export const ensureMediaLibraryPermission = () =>
  ensure(
    ImagePicker.getMediaLibraryPermissionsAsync,
    ImagePicker.requestMediaLibraryPermissionsAsync,
    'Photos',
  );
