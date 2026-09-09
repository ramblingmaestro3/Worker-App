import { supabase } from '../supabase';

export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
};

export async function listMessages(bookingId: string): Promise<{ success: boolean; data?: Message[]; error?: string }> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Message[] };
}

export async function sendMessage(
  bookingId: string,
  messageText: string
): Promise<{ success: boolean; data?: Message; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ booking_id: bookingId, sender_id: auth.user.id, message_text: messageText })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Message };
}

/** Counts messages across all the signed-in user's bookings that were sent by the other party and haven't been read yet — drives the red dot on the Messages tab. */
export async function countMyUnreadMessages(): Promise<{ success: boolean; data?: number; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', auth.user.id)
    .eq('is_read', false);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: count ?? 0 };
}

/** Marks the other participant's messages in this booking as read. */
export async function markMessagesRead(bookingId: string): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('booking_id', bookingId)
    .neq('sender_id', auth.user.id)
    .eq('is_read', false);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
