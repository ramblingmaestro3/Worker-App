import { useAuthStore, type WorkerGateStatus } from '@/lib/stores/auth-store';

export type { WorkerGateStatus };

/**
 * Reads the signed-in user's worker verification state from the global auth
 * store (kept fresh by its own onAuthStateChange subscription — see
 * lib/stores/auth-store.ts) instead of re-fetching per screen.
 */
export function useWorkerVerification() {
  const status = useAuthStore((s) => (s.status === 'initializing' ? 'loading' : s.workerGateStatus));
  const refresh = useAuthStore((s) => s.refreshProfile);

  return { status, refresh };
}
