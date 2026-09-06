import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from './api/pushTokens';

// Foreground behavior — without this, a notification that arrives while the
// app is open and focused is silently dropped instead of shown.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission and registers this device's Expo push
 * token against the signed-in user, so the events wired in
 * supabase/functions/send-push (new message, bid accepted/declined/countered,
 * booking status changes) can reach them even when the app isn't open.
 *
 * Meant to be called once per app session, after sign-in — see App.tsx.
 * No-ops (with a console warning, never a thrown error) if permission is
 * denied or the device has no EAS project id configured, so a fresh install
 * without push set up yet never crashes or blocks anything else.
 */
export async function registerForPushNotifications(): Promise<void> {
  // Remote push isn't supported on web via this API, and — as of Expo SDK
  // 53+ — no longer works in Expo Go on Android at all; a development build
  // is required there. iOS Expo Go still works. This still runs on Android
  // Expo Go so permission/channel setup is in place, but token registration
  // will simply fail quietly until the app is running from a dev build.
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    console.warn('[push] permission not granted — skipping token registration');
    return;
  }

  // No EAS project has ever been created for this app (checked: no eas.json,
  // no extra.eas.projectId in app.json) — getExpoPushTokenAsync needs one.
  // Falls back to reading it from app.json if it's ever added there instead.
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || (Constants.expoConfig?.extra as any)?.eas?.projectId;
  if (!projectId) {
    console.warn(
      '[push] no EAS project id configured — skipping token registration. ' +
      'Run `npx eas init` (or `eas project:init`) once under your Expo account, ' +
      'then set EXPO_PUBLIC_EAS_PROJECT_ID in .env to the id it prints.'
    );
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
  } catch (err) {
    console.warn('[push] failed to get/register push token', err);
  }
}
