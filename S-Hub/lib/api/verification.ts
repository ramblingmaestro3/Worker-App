import { supabase } from '../supabase';
import { WorkerVerificationStatus } from './workerProfiles';

export type WorkerVerification = {
  id: string;
  id_type: 'ghana_card' | 'voter_id' | 'passport' | 'drivers_licence' | null;
  id_number: string | null;
  id_document_url: string | null;
  selfie_url: string | null;
  status: WorkerVerificationStatus;
  submitted_at: string;
  reviewed_at: string | null;
};

export type SubmitVerificationInput = {
  id_type: WorkerVerification['id_type'];
  id_number: string;
  id_document_url: string;
  selfie_url?: string;
};

/** Submits (or resubmits) the signed-in worker's ID verification. */
export async function submitVerification(
  input: SubmitVerificationInput
): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('worker_verifications')
    .upsert(
      { id: auth.user.id, ...input, status: 'pending', submitted_at: new Date().toISOString(), reviewed_at: null },
      { onConflict: 'id' }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Flips the signed-in worker's verification to 'verified' via the
 * `finalize_verification` RPC, which enforces a minimum elapsed time
 * server-side since submission — see the migration for why.
 */
export async function finalizeVerification(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('finalize_verification');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** Fetches the signed-in worker's own verification record, if any. */
export async function getMyVerification(): Promise<{
  success: boolean;
  data?: WorkerVerification | null;
  error?: string;
}> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('worker_verifications')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as WorkerVerification | null };
}
