import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemeProvider, useAppTheme, useThemeColors } from '@/contexts/ThemeContext';
import { routeSignedInUserByRole } from '@/lib/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { navigateToResetPassword, navigationRef } from '@/navigation/navigationRef';
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

  useEffect(() => useAuthStore.getState().init(), []);

  const checkEntryScreenRedirect = useCallback(() => {
    if (status !== 'signed-in' || !navigationRef.isReady()) return;
    const name = navigationRef.getCurrentRoute()?.name;
    if (name && ENTRY_SCREENS.includes(name)) routeSignedInUserByRole();
  }, [status]);

  useEffect(() => {
    checkEntryScreenRedirect();
  }, [checkEntryScreenRedirect]);

  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  // Paint the area outside the centred column with the app's own background so
  // the letterboxing on wide screens reads as intentional, not a nav artefact.
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: T.bg },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onStateChange={checkEntryScreenRedirect}>
      <RootNavigator />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
