import { useEffect } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/lib/stores/auth-store';

/** Wraps every customer-only screen group. Only renders children once a session exists. */
export default function RequireSignedIn({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const T = useThemeColors();

  useEffect(() => {
    if (status === 'signed-out') router.replace('/sign-in');
  }, [status]);

  if (status !== 'signed-in') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator size="large" color={T.text} />
      </View>
    );
  }

  return <>{children}</>;
}
