import { supabase } from '../supabase';

/** Blocks a user — they can no longer message the signed-in user, or vice versa (enforced by RLS on messages, not just this table). */
export async function blockUser(blockedId: string): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase.from('blocked_users').insert({ blocker_id: auth.user.id, blocked_id: blockedId });

  if (error) {
    if (error.code === '23505') {
      // Already blocked — not an error from the caller's point of view.
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function unblockUser(blockedId: string): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', auth.user.id)
    .eq('blocked_id', blockedId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** True if the signed-in user has blocked, or been blocked by, the given user — checks both directions via the is_blocked_with RPC, since a plain SELECT on blocked_users can't see a block the OTHER party made. */
export async function isBlockedWith(otherUserId: string): Promise<{ success: boolean; data?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('is_blocked_with', { other_user_id: otherUserId });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: !!data };
}

/** Ids of everyone the signed-in user has blocked — for filtering them out of search/browse results. */
export async function listBlockedUserIds(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', auth.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []).map((row) => row.blocked_id as string) };
}
