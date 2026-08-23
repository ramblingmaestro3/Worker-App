import { supabase } from '../supabase';

export type Role = 'client' | 'worker' | 'admin';

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
};

/** Fetches the signed-in user's own profile row. */
export async function getMyProfile(): Promise<{ success: boolean; data?: Profile; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Profile };
}

/**
 * Flips the signed-in user's role to 'worker'. Used when a customer account
 * goes through the become-worker flow — the DB only sets role at initial
 * signup via metadata, so upgrading an existing customer needs an explicit
 * update. Safe to call even if the account was already created as a worker.
 */
export async function becomeWorker(): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase.from('profiles').update({ role: 'worker' }).eq('id', auth.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateProfile(
  patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'email'>>
): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', auth.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
