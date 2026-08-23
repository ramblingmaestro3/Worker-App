import { supabase } from '../supabase';

export type WorkerVerificationStatus = 'pending' | 'verified' | 'rejected';

export type AvailabilityDay = { day: string; on: boolean };

export type PreferredTime = 'morning' | 'afternoon' | 'evening';

/** Single source of truth for the value/label/icon of each time-of-day option —
 * shared by become-worker.tsx (writes it), worker-availability.tsx (edits it),
 * and worker-profile.tsx (displays it), so the three never drift apart. */
export const PREFERRED_TIME_OPTIONS: { value: PreferredTime; label: string; shortLabel: string; icon: string }[] = [
  { value: 'morning', label: 'Morning (6am–12pm)', shortLabel: 'Morning', icon: 'sunny-outline' },
  { value: 'afternoon', label: 'Afternoon (12pm–6pm)', shortLabel: 'Afternoon', icon: 'partly-sunny-outline' },
  { value: 'evening', label: 'Evening (6pm–10pm)', shortLabel: 'Evening', icon: 'moon-outline' },
];

export function preferredTimeLabel(value: string): string {
  return PREFERRED_TIME_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function preferredTimeShortLabel(value: string): string {
  return PREFERRED_TIME_OPTIONS.find((o) => o.value === value)?.shortLabel ?? value;
}

export type WorkerProfile = {
  id: string;
  skills: string[];
  bio: string | null;
  years_experience: number | null;
  hourly_rate: number | null;
  per_job_rate: number | null;
  min_job_value: number | null;
  languages: string | null;
  availability: AvailabilityDay[];
  preferred_times: PreferredTime[];
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  verification_status: WorkerVerificationStatus;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateWorkerProfileInput = {
  skills: string[];
  bio?: string;
  years_experience?: number;
  hourly_rate?: number;
  per_job_rate?: number;
  min_job_value?: number;
  languages?: string;
  availability?: AvailabilityDay[];
  preferred_times?: PreferredTime[];
  latitude?: number;
  longitude?: number;
  address?: string;
};

/** Fetches the signed-in worker's own worker_profiles row, if any. */
export async function getMyWorkerProfile(): Promise<{
  success: boolean;
  data?: WorkerProfile | null;
  error?: string;
}> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as WorkerProfile | null };
}

export type PublicWorkerProfile = WorkerProfile & {
  full_name: string;
  avatar_url: string | null;
};

/** Fetches a worker's public profile (worker_profiles + name/avatar from profiles) by their id. */
export async function getWorkerProfile(
  workerId: string
): Promise<{ success: boolean; data?: PublicWorkerProfile; error?: string }> {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select('*, profile:profiles!worker_profiles_id_fkey(full_name,avatar_url)')
    .eq('id', workerId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const { profile, ...rest } = data as any;
  return {
    success: true,
    data: { ...rest, full_name: profile?.full_name ?? '', avatar_url: profile?.avatar_url ?? null },
  };
}

/** Creates the worker_profiles row for the signed-in user (upserts if it already exists). */
export async function createWorkerProfile(
  input: CreateWorkerProfileInput
): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('worker_profiles')
    .upsert({ id: auth.user.id, ...input }, { onConflict: 'id' });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateWorkerProfile(
  patch: Partial<CreateWorkerProfileInput>
): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase.from('worker_profiles').update(patch).eq('id', auth.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
