import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Booking } from './bookings';
import { Message } from './messages';
import { WorkerBid } from './workerBids';
import { Notification } from './notifications';

/**
 * Generic postgres_changes subscription. Call inside a screen's
 * useFocusEffect and pass the returned channel to unsubscribe() on blur —
 * expo-router keeps stack screens mounted, so a plain useEffect cleanup
 * alone isn't enough to stop a background screen from still listening.
 */
export function subscribeToTable<T>(
  table: string,
  filter: string,
  onChange: (row: T) => void
): RealtimeChannel {
  return supabase
    .channel(`${table}:${filter}`)
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

export function subscribeToBookingStatus(bookingId: string, onChange: (booking: Booking) => void): RealtimeChannel {
  return subscribeToTable<Booking>('bookings', `id=eq.${bookingId}`, onChange);
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
