import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/lib/stores/auth-store';
import { resetToSignIn } from '@/navigation/navigationRef';

/** Wraps every customer-only screen. Only renders children once a session exists. */
export default function RequireSignedIn({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const T = useThemeColors();

  useEffect(() => {
    if (status === 'signed-out') resetToSignIn();
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

/** Registers a screen component gated the same way RequireSignedIn gates its children. */
export function withSignedIn<P extends object>(Component: React.ComponentType<P>) {
  return function SignedInScreen(props: P) {
    return (
      <RequireSignedIn>
        <Component {...props} />
      </RequireSignedIn>
    );
  };
}
