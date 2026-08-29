import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ThemeProvider, useAppTheme, useThemeColors } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';

// Every screen renders inside one centred column of this width — the same size
// the home screen caps its content at — so the app looks identical on phones
// (where it's a no-op) and on wide web/tablet windows (where it would otherwise
// stretch edge-to-edge). Screens that also cap their own content stay unaffected;
// this only reins in the ones that don't.
const APP_MAX_WIDTH = 540;

export const unstable_settings = {
  anchor: 'index',
};

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
      router.replace('/reset-password');
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);
}

function AppNavigator() {
  const { colorScheme } = useAppTheme();
  const T = useThemeColors();
  useAuthDeepLinks();

  useEffect(() => useAuthStore.getState().init(), []);

  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  // Paint the area outside the centred column with the app's own background so
  // the letterboxing on wide screens reads as intentional, not a nav artefact.
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: T.bg },
  };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          contentStyle: { flex: 1, width: '100%', maxWidth: APP_MAX_WIDTH, alignSelf: 'center' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
