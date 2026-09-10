/**
 * Route guard: renders its children only for a verified worker; otherwise routes
 * to the matching step of the become-worker flow (become / pending / rejected).
 */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useWorkerVerification } from '@/hooks/use-worker-verification';
import { resetToBecomeWorker, resetToSignIn, resetToVerificationPending } from '@/navigation/navigationRef';

const REDIRECTS: Record<string, () => void> = {
  'signed-out': resetToSignIn,
  'not-worker': resetToBecomeWorker,
  'no-submission': resetToBecomeWorker,
  pending: resetToVerificationPending,
  rejected: resetToVerificationPending,
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
    const redirect = REDIRECTS[status];
    if (redirect) redirect();
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

/** Registers a screen component gated the same way RequireVerifiedWorker gates its children. */
export function withVerifiedWorker<P extends object>(Component: React.ComponentType<P>) {
  return function VerifiedWorkerScreen(props: P) {
    return (
      <RequireVerifiedWorker>
        <Component {...props} />
      </RequireVerifiedWorker>
    );
  };
}
