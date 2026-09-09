import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { navigationRef } from '@/navigation/navigationRef';

/**
 * Sends the signed-in user to the right screen when they tap a push
 * notification — `new_message` opens that chat, booking-status updates open
 * the job, bid updates open the notifications list. Handles both a tap while
 * the app is running and a cold start from a notification.
 *
 * The notification `data` shape comes from the DB trigger functions
 * (supabase/migrations/…_notifications_schema.sql): `new_message` and
 * `booking_*` carry `booking_id`; `bid_*` carry `request_id`/`bid_id` only.
 */
function route(data: Record<string, unknown>, attempt = 0): void {
  if (!navigationRef.isReady()) {
    // Cold start: the container may not be mounted yet — retry for a few seconds.
    if (attempt < 40) setTimeout(() => route(data, attempt + 1), 200);
    return;
  }

  const type = String(data.type ?? '');
  const bookingId = data.booking_id ? String(data.booking_id) : null;

  if (type === 'new_message' && bookingId) {
    navigationRef.navigate('Chat', { bookingId });
  } else if (type.startsWith('booking_') && bookingId) {
    navigationRef.navigate('JobDetail', { bookingId });
  } else if (type.startsWith('bid_')) {
    navigationRef.navigate('WorkerNotifications');
  } else {
    navigationRef.navigate('Notifications');
  }
}

export function useNotificationRouting(enabled: boolean): void {
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const routedIdsRef = useRef<Set<string>>(new Set());

  const flush = useCallback(() => {
    if (!enabled || !pendingRef.current) return;
    const data = pendingRef.current;
    pendingRef.current = null;
    route(data);
  }, [enabled]);

  useEffect(() => {
    // expo-notifications' response APIs aren't implemented on web and throw
    // synchronously — nothing to route to there anyway.
    if (Platform.OS === 'web') return;

    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (routedIdsRef.current.has(id)) return;
      routedIdsRef.current.add(id);
      pendingRef.current = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      flush();
    };

    try {
      // The notification that cold-started the app (null if launched normally).
      Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
      // Taps while the app is already running or backgrounded.
      const sub = Notifications.addNotificationResponseReceivedListener(handle);
      return () => sub.remove();
    } catch {
      return undefined;
    }
  }, [flush]);

  // A cold-start tap resolves before sign-in + navigation are ready; run the
  // queued route once they are (and a beat after, so Splash's own post-sign-in
  // reset has already landed and we push onto it rather than get wiped).
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(flush, 600);
    return () => clearTimeout(t);
  }, [enabled, flush]);
}
