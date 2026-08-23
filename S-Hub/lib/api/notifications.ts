import { supabase } from '../supabase';

export type NotificationType = 'bid_countered' | 'bid_accepted' | 'bid_declined' | 'new_message';

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export async function listMyNotifications(): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Notification[] };
}

export async function countUnreadNotifications(): Promise<{ success: boolean; data?: number; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('is_read', false);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: count ?? 0 };
}

export async function markNotificationRead(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', auth.user.id)
    .eq('is_read', false);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteNotification(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteAllReadNotifications(): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('is_read', true);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
