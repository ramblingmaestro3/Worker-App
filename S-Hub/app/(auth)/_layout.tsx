import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { routeSignedInUserByRole } from '@/lib/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

// Only the flow's actual entry points bounce an already-signed-in user
// onward — mid-flow screens (become-worker, otp-verification,
// verification-pending, verified, worker-gate, reset-password) are visited
// *while* signed in on purpose and manage their own redirects internally.
const ENTRY_SCREENS = ['/onboarding', '/sign-in', '/sign-up'];

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'signed-in' && ENTRY_SCREENS.includes(pathname)) {
      routeSignedInUserByRole();
    }
  }, [status, pathname]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
