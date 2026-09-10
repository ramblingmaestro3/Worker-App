import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ThemeProvider, useAppTheme, useThemeColors } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import OfflineBanner from '@/components/OfflineBanner';
import { useNotificationRouting } from '@/hooks/use-notification-routing';
import { routeSignedInUserByRole, signOutIntent } from '@/lib/auth';
import { subscribeToMyNotifications, unsubscribe } from '@/lib/api/realtime';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUnreadStore } from '@/lib/stores/unread-store';
import { supabase } from '@/lib/supabase';
import { navigateToResetPassword, navigationRef, resetToSignIn } from '@/navigation/navigationRef';
import RootNavigator from '@/navigation/RootNavigator';

/**
 * Password-recovery emails link back into the app with the session tokens
 * in the URL (fragment on web, query on native). The Supabase client has
 * detectSessionInUrl disabled (the OAuth flow already handles its own
 * tokens manually), so nothing picks this up automatically — this listens
 * for the incoming URL from a cold start or while the app is already open,
 * and on a `type=recovery` link, establishes the session and routes to the
 * reset-password screen so it can pick up from there.
 */
function useAuthDeepLinks() {
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      let params: URLSearchParams;
      try {
        const parsed = new URL(url);
        const raw = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.search.slice(1);
        params = new URLSearchParams(raw);
      } catch {
        return;
      }

      if (params.get('type') !== 'recovery') return;

      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) return;

      await supabase.auth.setSession({ access_token, refresh_token });
      navigateToResetPassword();
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);
}

// Only the flow's actual entry points bounce an already-signed-in user
// onward — mid-flow screens (become-worker, otp-verification,
// verification-pending, verified, worker-gate, reset-password) are visited
// *while* signed in on purpose and manage their own redirects internally.
const ENTRY_SCREENS = ['Onboarding', 'SignIn', 'SignUp'];

function AppNavigator() {
  const { colorScheme } = useAppTheme();
  const T = useThemeColors();
  const status = useAuthStore((s) => s.status);
  useAuthDeepLinks();
  useNotificationRouting(status === 'signed-in');

  useEffect(() => useAuthStore.getState().init(), []);

  // Keep the Messages-tab unread red dot live app-wide: refresh the count on
  // sign-in, and again whenever a notification row lands for this user (every
  // new message writes one — see notify_new_message), so the dot appears even
  // when the user isn't on the Messages screen. The Chat screen refreshes it
  // back down after marking a thread read.
  useEffect(() => {
    if (status !== 'signed-in') {
      useUnreadStore.getState().reset();
      return;
    }
    useUnreadStore.getState().refreshMessages();
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const channel = subscribeToMyNotifications(userId, () => {
      useUnreadStore.getState().refreshMessages();
    });
    return () => unsubscribe(channel);
  }, [status]);

  // Global session-expiry handler: if the user was signed in and the store
  // flips to signed-out WITHOUT signOutIntent having been set (i.e. nobody
  // called signOut()), the refresh token died out from under them — expired,
  // revoked, or the device was offline past its expiry — so every screen's
  // next request would otherwise just fail silently (indistinguishable from
  // the read/write failures Issue 4 already handles). Redirect to sign-in
  // with an explanation instead of leaving them stranded on a dead session.
  // An intentional sign-out already handles its own redirect at the call
  // site, so this skips it there via the consumed flag.
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prevStatus === 'signed-in' && status === 'signed-out') {
      if (signOutIntent.current) {
        signOutIntent.current = false;
      } else {
        resetToSignIn();
        Alert.alert('Session Expired', 'Please sign in again to continue.');
      }
    }
  }, [status]);

  // Request permission and (re-)register this device's push token whenever
  // the user is signed in — covers first sign-in, a relaunch with an
  // existing session, and switching accounts. registerForPushNotifications
  // never throws; it just skips quietly if permission is denied or push
  // isn't configured for this build (see its own docstring).
  useEffect(() => {
    if (status === 'signed-in') registerForPushNotifications();
  }, [status]);

  const checkEntryScreenRedirect = useCallback(() => {
    if (status !== 'signed-in' || !navigationRef.isReady()) return;
    const name = navigationRef.getCurrentRoute()?.name;
    if (name && ENTRY_SCREENS.includes(name)) routeSignedInUserByRole();
  }, [status]);

  useEffect(() => {
    checkEntryScreenRedirect();
  }, [checkEntryScreenRedirect]);

  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  // Transparent so RootNavigator's per-screen wallpaper layer (screenLayout)
  // is what's visible; the app-root View below fills the wide-screen letterbox
  // margins with a plain solid.
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: 'transparent' },
  };

  return (
    <View style={[styles.appRoot, { backgroundColor: T.bgSolid }]}>
      <NavigationContainer ref={navigationRef} theme={navTheme} onStateChange={checkEntryScreenRedirect}>
        <RootNavigator />
        <OfflineBanner />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({ appRoot: { flex: 1 } });

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
