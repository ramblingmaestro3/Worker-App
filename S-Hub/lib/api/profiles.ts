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
    .select('*, contact:profile_contact(phone,email)')
    .eq('id', auth.user.id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const { contact, ...rest } = data as any;
  return {
    success: true,
    data: { ...rest, phone: contact?.phone ?? null, email: contact?.email ?? null } as Profile,
  };
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

  // phone/email live in profile_contact (owner-only-readable) rather than the
  // broadly-readable profiles row — see 20260901140500_split_profile_contact_details.sql.
  const { full_name, avatar_url, phone, email } = patch;
  const profilePatch = {
    ...(full_name !== undefined && { full_name }),
    ...(avatar_url !== undefined && { avatar_url }),
  };
  const contactPatch = {
    ...(phone !== undefined && { phone }),
    ...(email !== undefined && { email }),
  };

  const [profileRes, contactRes] = await Promise.all([
    Object.keys(profilePatch).length
      ? supabase.from('profiles').update(profilePatch).eq('id', auth.user.id)
      : Promise.resolve({ error: null }),
    Object.keys(contactPatch).length
      ? supabase.from('profile_contact').update(contactPatch).eq('id', auth.user.id)
      : Promise.resolve({ error: null }),
  ]);

  const error = profileRes.error ?? contactRes.error;
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Permanently deletes the signed-in user's own account via the
 * `delete-account` Edge Function (auth.users deletion needs the service role
 * key, which the client never holds). Fails with a clear error, rather than
 * silently no-op'ing, for an account with booking/message history — see
 * that function's comment for why those aren't cascade-deleted.
 */
export async function deleteMyAccount(): Promise<{ success: boolean; error?: string; hasHistory?: boolean }> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string; code?: string }>(
    'delete-account'
  );

  if (error) {
    const ctx = (error as any).context;
    let payload: any = null;
    try {
      payload = await ctx?.json?.();
    } catch {
      /* body wasn't JSON */
    }
    return {
      success: false,
      error: payload?.error || error.message || 'Could not delete your account. Please try again.',
      hasHistory: payload?.code === 'has_history',
    };
  }

  if (!data?.success) {
    return { success: false, error: data?.error || 'Could not delete your account. Please try again.' };
  }

  return { success: true };
}
