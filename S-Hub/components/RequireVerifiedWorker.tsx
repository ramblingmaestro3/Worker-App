import { useEffect } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { useWorkerVerification } from '@/hooks/use-worker-verification';

const REDIRECTS: Record<string, string> = {
  'signed-out': '/sign-in',
  'not-worker': '/become-worker',
  'no-submission': '/become-worker',
  pending: '/verification-pending',
  rejected: '/verification-pending',
};

/**
 * Wraps every worker-only screen. Only renders children once the signed-in
 * user's account is role='worker' AND their worker_profiles.verification_status
 * is 'verified' — anything else redirects into the flow that gets them there,
 * closing the two previously-unchecked entry points into the worker side
 * (sign-in's worker branch and worker-gate.tsx's "Start Earning" button both
 * just land here now, and this owns the actual gating).
 */
export default function RequireVerifiedWorker({ children }: { children: React.ReactNode }) {
  const { status } = useWorkerVerification();
  const T = useThemeColors();

  useEffect(() => {
    const target = REDIRECTS[status];
    if (target) router.replace(target as any);
  }, [status]);

  if (status !== 'verified') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator size="large" color={T.text} />
      </View>
    );
  }

  return <>{children}</>;
}
