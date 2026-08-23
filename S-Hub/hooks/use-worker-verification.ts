import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { getMyProfile } from '@/lib/api/profiles';
import { getMyWorkerProfile } from '@/lib/api/workerProfiles';

export type WorkerGateStatus =
  | 'loading'
  | 'signed-out'
  | 'not-worker'
  | 'no-submission'
  | 'pending'
  | 'verified'
  | 'rejected';

/**
 * Re-checks the signed-in user's worker verification state every time the
 * screen gains focus (not just on mount) — expo-router keeps stack screens
 * mounted, so a plain useEffect would miss a status change that happened
 * while the user was on a different screen (e.g. just got verified).
 */
export function useWorkerVerification() {
  const [status, setStatus] = useState<WorkerGateStatus>('loading');

  const check = useCallback(async () => {
    setStatus('loading');

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setStatus('signed-out');
      return;
    }

    const profile = await getMyProfile();
    if (!profile.success || profile.data?.role !== 'worker') {
      setStatus('not-worker');
      return;
    }

    const workerProfile = await getMyWorkerProfile();
    if (!workerProfile.success || !workerProfile.data) {
      setStatus('no-submission');
      return;
    }

    setStatus(workerProfile.data.verification_status);
  }, []);

  useFocusEffect(
    useCallback(() => {
      check();
    }, [check])
  );

  return { status, refresh: check };
}
