import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { getMyProfile, type Profile } from '@/lib/api/profiles';
import { getMyWorkerProfile, type WorkerVerificationStatus } from '@/lib/api/workerProfiles';
import { supabase } from '@/lib/supabase';

export type WorkerGateStatus =
  | 'loading'
  | 'signed-out'
  | 'not-worker'
  | 'no-submission'
  | WorkerVerificationStatus; // 'pending' | 'verified' | 'rejected'

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  workerGateStatus: WorkerGateStatus;
  status: 'initializing' | 'signed-out' | 'signed-in';

  /** Subscribes to Supabase auth changes exactly once for the app's lifetime. Returns an unsubscribe fn. */
  init: () => () => void;
  /** Re-fetches profile + worker profile for the current session. */
  refreshProfile: () => Promise<void>;
};

let initialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  workerGateStatus: 'loading',
  status: 'initializing',

  init: () => {
    if (initialized) return () => {};
    initialized = true;

    const applySession = async (session: Session | null) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'signed-in' : 'signed-out',
      });

      if (!session) {
        set({ profile: null, workerGateStatus: 'signed-out' });
        return;
      }

      await get().refreshProfile();
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    // Re-checks the session directly rather than trusting the store's
    // cached `session` field, since callers may invoke this immediately
    // after sign-in/out, before the onAuthStateChange listener (which
    // updates that field) is guaranteed to have fired yet.
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    set({ session, user: session?.user ?? null, status: session ? 'signed-in' : 'signed-out' });

    if (!session) {
      set({ profile: null, workerGateStatus: 'signed-out' });
      return;
    }

    const profile = await getMyProfile();
    if (!profile.success || profile.data?.role !== 'worker') {
      set({ profile: profile.data ?? null, workerGateStatus: 'not-worker' });
      return;
    }

    const workerProfile = await getMyWorkerProfile();
    if (!workerProfile.success || !workerProfile.data) {
      set({ profile: profile.data, workerGateStatus: 'no-submission' });
      return;
    }

    set({ profile: profile.data, workerGateStatus: workerProfile.data.verification_status });
  },
}));

export const useIsSignedIn = () => useAuthStore((s) => s.status === 'signed-in');
export const useIsWorker = () => useAuthStore((s) => s.profile?.role === 'worker');
export const useIsVerifiedWorker = () => useAuthStore((s) => s.workerGateStatus === 'verified');
