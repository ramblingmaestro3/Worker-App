import { supabase } from '../supabase';
import { identityCols, stripIdentityKeys, withIdentityFallback } from './workerIdentity';

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

export function preferredTimeShortLabel(value: string): string {
  return PREFERRED_TIME_OPTIONS.find((o) => o.value === value)?.shortLabel ?? value;
}

export type WorkerProfile = {
  id: string;
  /** Worker-facing name override; NULL → use the profiles.full_name fallback. */
  display_name: string | null;
  /** Worker-facing avatar override; NULL → use the profiles.avatar_url fallback. */
  photo_url: string | null;
  skills: string[];
  bio: string | null;
  years_experience: number | null;
  hourly_rate: number | null;
  per_job_rate: number | null;
  min_job_value: number | null;
  languages: string | null;
  availability: AvailabilityDay[];
  preferred_times: PreferredTime[];
  is_online: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  verification_status: WorkerVerificationStatus;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
};

export type VerifiedWorkerSummary = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  skills: string[];
  hourly_rate: number | null;
  per_job_rate: number | null;
  rating_avg: number;
  rating_count: number;
  latitude: number | null;
  longitude: number | null;
  availability: AvailabilityDay[];
  is_online: boolean;
};

/** Every verified worker — the real backing for the client-side browse/search screens (home's "nearby workers", Search.tsx's list/map). No location/skill filter server-side; these screens filter client-side over the full list, same as the mock data they replace. */
export async function listVerifiedWorkers(): Promise<{ success: boolean; data?: VerifiedWorkerSummary[]; error?: string }> {
  const { data, error } = await withIdentityFallback(() =>
    supabase
      .from('worker_profiles')
      .select(
        `id, ${identityCols()}skills, hourly_rate, per_job_rate, rating_avg, rating_count, latitude, longitude, availability, is_online, profile:profiles!worker_profiles_id_fkey(full_name,avatar_url)`
      )
      .eq('verification_status', 'verified')
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data ?? []).map((w: any) => ({
      id: w.id,
      full_name: w.display_name || w.profile?.full_name || 'Worker',
      avatar_url: w.photo_url ?? w.profile?.avatar_url ?? null,
      skills: w.skills ?? [],
      hourly_rate: w.hourly_rate,
      per_job_rate: w.per_job_rate,
      rating_avg: w.rating_avg,
      rating_count: w.rating_count,
      latitude: w.latitude,
      longitude: w.longitude,
      // The DB column defaults to '{}'::jsonb (an object) until a worker
      // saves real availability via worker-availability.tsx, which writes
      // an array — so a plain `?? []` doesn't catch the pre-save shape.
      availability: Array.isArray(w.availability) ? w.availability : [],
      is_online: w.is_online ?? true,
    })),
  };
}

/**
 * Verified workers whose skills include a given job category slug
 * (`worker_profiles.skills` @> ['plumbing']). Backs the skill-matched worker
 * list a client sees right after posting a job. Workers onboarded via
 * BecomeWorker store category slugs here; a worker who only ever set free-text
 * skills via WorkerSkills won't match (known gap).
 */
export async function listVerifiedWorkersForCategory(
  category: string
): Promise<{ success: boolean; data?: VerifiedWorkerSummary[]; error?: string }> {
  const { data, error } = await withIdentityFallback(() =>
    supabase
      .from('worker_profiles')
      .select(
        `id, ${identityCols()}skills, hourly_rate, per_job_rate, rating_avg, rating_count, latitude, longitude, availability, is_online, profile:profiles!worker_profiles_id_fkey(full_name,avatar_url)`
      )
      .eq('verification_status', 'verified')
      .contains('skills', [category])
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data ?? []).map((w: any) => ({
      id: w.id,
      full_name: w.display_name || w.profile?.full_name || 'Worker',
      avatar_url: w.photo_url ?? w.profile?.avatar_url ?? null,
      skills: w.skills ?? [],
      hourly_rate: w.hourly_rate,
      per_job_rate: w.per_job_rate,
      rating_avg: w.rating_avg,
      rating_count: w.rating_count,
      latitude: w.latitude,
      longitude: w.longitude,
      availability: Array.isArray(w.availability) ? w.availability : [],
      is_online: w.is_online ?? true,
    })),
  };
}

export type CreateWorkerProfileInput = {
  skills: string[];
  display_name?: string;
  photo_url?: string;
  bio?: string;
  years_experience?: number;
  hourly_rate?: number;
  per_job_rate?: number;
  min_job_value?: number;
  languages?: string;
  availability?: AvailabilityDay[];
  preferred_times?: PreferredTime[];
  is_online?: boolean;
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
    data: {
      ...rest,
      // Worker-facing identity: the worker_profiles override wins, else the
      // personal profiles values.
      full_name: rest.display_name || profile?.full_name || '',
      avatar_url: rest.photo_url ?? profile?.avatar_url ?? null,
    },
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

  const { error } = await withIdentityFallback(() =>
    supabase
      .from('worker_profiles')
      .upsert({ id: auth.user.id, ...stripIdentityKeys(input as Record<string, unknown>) }, { onConflict: 'id' })
      .select('id')
  );

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

  // .select() so a write that matches no row (RLS denial, or the worker_profiles
  // row was never created) comes back empty instead of a false success — see
  // cancelServiceRequest for the same guard.
  const { data, error } = await withIdentityFallback(() =>
    supabase
      .from('worker_profiles')
      .update(stripIdentityKeys(patch as Record<string, unknown>))
      .eq('id', auth.user.id)
      .select('id')
  );

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: "Couldn't save — your worker profile isn't set up yet. Finish the become-a-worker steps first.",
    };
  }

  return { success: true };
}
