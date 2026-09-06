import { supabase } from '../supabase';

/** Registers (or refreshes) this device's Expo push token against the signed-in user. */
export async function registerPushToken(token: string): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: auth.user.id, token, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** Removes every push token registered for the signed-in user — called before sign-out so a shared/reset device stops receiving a signed-out account's notifications. */
export async function clearMyPushTokens(): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase.from('push_tokens').delete().eq('user_id', auth.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
