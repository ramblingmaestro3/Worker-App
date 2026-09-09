import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Message } from './messages';
import { WorkerBid } from './workerBids';
import { Notification } from './notifications';

/**
 * Generic postgres_changes subscription. Call inside a screen's
 * useFocusEffect and pass the returned channel to unsubscribe() on blur —
 * the stack navigator keeps pushed-under screens mounted, so a plain
 * useEffect cleanup alone isn't enough to stop a background screen from
 * still listening.
 */

// supabase.channel(topic) returns the EXISTING channel when the topic string
// already matches a live one — and adding a postgres_changes binding to an
// already-subscribed channel throws. Two places can legitimately watch the
// same table+filter at once (e.g. the app-wide unread poller in App.tsx and a
// screen's own hook), so every call gets its own uniquely-named channel; the
// real server-side scoping lives in the `filter` passed to `.on()`, not the name.
let channelSeq = 0;

export function subscribeToTable<T>(
  table: string,
  filter: string,
  onChange: (row: T) => void
): RealtimeChannel {
  channelSeq += 1;
  return supabase
    .channel(`${table}:${filter}:${channelSeq}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => onChange(payload.new as T)
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

export function subscribeToBookingMessages(bookingId: string, onChange: (message: Message) => void): RealtimeChannel {
  return subscribeToTable<Message>('messages', `booking_id=eq.${bookingId}`, onChange);
}

export function subscribeToRequestBids(requestId: string, onChange: (bid: WorkerBid) => void): RealtimeChannel {
  return subscribeToTable<WorkerBid>('worker_bids', `request_id=eq.${requestId}`, onChange);
}

export function subscribeToMyNotifications(userId: string, onChange: (notification: Notification) => void): RealtimeChannel {
  return subscribeToTable<Notification>('notifications', `user_id=eq.${userId}`, onChange);
}

/** Fires whenever a single booking row changes — e.g. the worker advances its status. */
export function subscribeToBooking(bookingId: string, onChange: () => void): RealtimeChannel {
  return subscribeToTable<unknown>('bookings', `id=eq.${bookingId}`, onChange);
}
