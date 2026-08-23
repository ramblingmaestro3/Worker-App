import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';

import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

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
      router.replace('/reset-password' as any);
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);
}

function AppNavigator() {
  const { colorScheme } = useAppTheme();
  useAuthDeepLinks();

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
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
