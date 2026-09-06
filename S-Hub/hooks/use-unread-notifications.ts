import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { countMyUnreadNotifications } from '@/lib/api/notifications';
import { subscribeToMyNotifications, unsubscribe } from '@/lib/api/realtime';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * True while the signed-in user has at least one unread notification —
 * drives the notification bell's red dot on the home/dashboard screens.
 * Re-derives from a real count on focus (so returning from the
 * notifications screen after reading clears it) and again on any realtime
 * change to this user's notifications while focused.
 */
export function useHasUnreadNotifications(): boolean {
  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let channel: ReturnType<typeof subscribeToMyNotifications> | null = null;

      const refresh = async () => {
        const result = await countMyUnreadNotifications();
        if (!cancelled && result.success) setHasUnread((result.data ?? 0) > 0);
      };

      (async () => {
        await refresh();
        if (cancelled) return;

        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        channel = subscribeToMyNotifications(userId, refresh);
      })();

      return () => {
        cancelled = true;
        if (channel) unsubscribe(channel);
      };
    }, [])
  );

  return hasUnread;
}
