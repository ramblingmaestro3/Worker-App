import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import EmptyState from '@/components/ui/EmptyState';
import { ws, wvs, wms } from '@/lib/scaling';
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllReadNotifications,
  Notification,
  NotificationType,
} from '@/lib/api/notifications';
import { subscribeToMyNotifications, unsubscribe } from '@/lib/api/realtime';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import type { RootStackParamList } from '@/navigation/types';

const TYPE_META: Record<NotificationType, { icon: string; bg: string; color: string }> = {
  bid_accepted: { icon: 'checkmark-circle-outline', bg: COLORS.primaryLight, color: COLORS.primary },
  bid_declined: { icon: 'close-circle-outline', bg: COLORS.dangerLight, color: COLORS.danger },
  bid_countered: { icon: 'pricetag-outline', bg: COLORS.accentLight, color: COLORS.accentDark },
  new_message: { icon: 'chatbubble-ellipses-outline', bg: '#E3F2FD', color: '#1565C0' },
  booking_en_route: { icon: 'car-outline', bg: '#E3F2FD', color: '#1565C0' },
  booking_arrived: { icon: 'location-outline', bg: '#E3F2FD', color: '#1565C0' },
  booking_in_progress: { icon: 'construct-outline', bg: COLORS.primaryLight, color: COLORS.primary },
  booking_completed: { icon: 'checkmark-circle-outline', bg: COLORS.primaryLight, color: COLORS.primary },
  booking_cancelled: { icon: 'close-circle-outline', bg: COLORS.dangerLight, color: COLORS.danger },
};

const DEFAULT_META = { icon: 'notifications-outline', bg: COLORS.primaryLight, color: COLORS.primary };

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

type Props = NativeStackScreenProps<RootStackParamList, 'WorkerNotifications'>;

export default function WorkerNotificationsScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let channel: ReturnType<typeof subscribeToMyNotifications> | null = null;

      (async () => {
        setLoading(true);
        setError(false);
        const userId = useAuthStore.getState().user?.id;
        const result = await listMyNotifications();
        if (cancelled) return;
        if (result.success) {
          setNotifs(result.data ?? []);
        } else {
          setError(true);
        }
        setLoading(false);

        if (userId) {
          channel = subscribeToMyNotifications(userId, (row) => {
            setNotifs((prev) => (prev.some((n) => n.id === row.id) ? prev.map((n) => (n.id === row.id ? row : n)) : [row, ...prev]));
          });
        }
      })();

      return () => {
        cancelled = true;
        if (channel) unsubscribe(channel);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadKey])
  );

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  const markRead = (id: string) => {
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    markNotificationRead(id);
  };
  const openNotif = (notif: Notification) => {
    markRead(notif.id);
    const bookingId = notif.data?.booking_id ? String(notif.data.booking_id) : null;
    if (notif.type === 'new_message' && bookingId) {
      navigation.navigate('Chat', { bookingId });
    } else if (bookingId) {
      navigation.navigate('JobDetail', { bookingId });
    } else if (notif.type.startsWith('bid_')) {
      navigation.navigate('WorkerTabs', { screen: 'worker-jobs' });
    }
  };
  const dismiss = (id: string) => {
    setNotifs((ns) => ns.filter((n) => n.id !== id));
    deleteNotification(id);
  };
  const markAllRead = () => {
    setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })));
    markAllNotificationsRead();
  };
  const clearRead = () => {
    setNotifs((ns) => ns.filter((n) => !n.is_read));
    deleteAllReadNotifications();
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const unread = notifs.filter((n) => !n.is_read);
  const read = notifs.filter((n) => n.is_read);

  const renderNotif = (notif: Notification, bordered: boolean) => {
    const meta = TYPE_META[notif.type] ?? DEFAULT_META;
    return (
      <TouchableOpacity
        key={notif.id}
        style={[
          s.row,
          bordered
            ? { backgroundColor: T.card, borderWidth: 1, borderColor: T.border }
            : { backgroundColor: COLORS.primary + '08' },
        ]}
        onPress={() => openNotif(notif)}
        activeOpacity={0.78}
      >
        {!notif.is_read && <View style={s.unreadDot} />}
        <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={wms(20)} color={meta.color} />
        </View>
        <View style={s.content}>
          <Text style={[s.notifTitle, { color: T.text }]} numberOfLines={1}>{notif.title}</Text>
          {!!notif.body && <Text style={[s.notifBody, { color: T.subText }]} numberOfLines={2}>{notif.body}</Text>}
          <Text style={[s.notifTime, { color: T.subText }]}>{timeAgo(notif.created_at)}</Text>
        </View>
        <TouchableOpacity style={s.dismissBtn} onPress={() => dismiss(notif.id)} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="close-outline" size={wms(18)} color={T.subText} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} />

      <ScreenHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        titleRight={unreadCount > 0 ? <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View> : null}
        right={
          <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0}>
            <Text style={[s.markAllText, unreadCount === 0 && { opacity: 0.3 }]}>Mark all read</Text>
          </TouchableOpacity>
        }
      />

      <View style={s.pageInner}>
        {loading ? (
          <View style={s.empty}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load notifications"
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => setReloadKey((k) => k + 1)}
            tone="error"
          />
        ) : notifs.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={wms(52)} color={COLORS.primary + '50'} />
            <Text style={[s.emptyTitle, { color: T.text }]}>All caught up!</Text>
            <Text style={[s.emptySub, { color: T.subText }]}>Bid updates and new messages will show up here.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {unread.length > 0 && (
              <>
                <Text style={s.sectionLabel}>NEW</Text>
                {unread.map((n) => renderNotif(n, false))}
              </>
            )}
            {read.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: T.subText }]}>EARLIER</Text>
                {read.map((n) => renderNotif(n, true))}
              </>
            )}
            {read.length > 0 && (
              <TouchableOpacity style={s.clearBtn} onPress={clearRead} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={wms(15)} color={T.subText} />
                <Text style={[s.clearBtnText, { color: T.subText }]}>Clear read notifications</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  badge: { backgroundColor: COLORS.danger, borderRadius: ws(10), minWidth: ws(20), height: ws(20), alignItems: 'center', justifyContent: 'center', paddingHorizontal: ws(5) },
  badgeText: { fontSize: wms(11), fontWeight: '800', color: '#fff' },
  markAllText: { fontSize: wms(13), color: COLORS.primary, fontWeight: '600' },

  list: { paddingHorizontal: ws(20), paddingTop: wvs(10), paddingBottom: wvs(100) },
  sectionLabel: { fontSize: wms(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: wvs(8), marginTop: wvs(4) },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: ws(14), paddingVertical: wvs(14), gap: ws(12), borderRadius: ws(14), marginBottom: wvs(10), position: 'relative' },
  unreadDot: { position: 'absolute', left: ws(6), top: wvs(20), width: ws(7), height: ws(7), borderRadius: ws(4), backgroundColor: COLORS.primary },
  iconWrap: { width: ws(40), height: ws(40), borderRadius: ws(12), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content: { flex: 1 },
  notifTitle: { fontSize: wms(13.5), fontWeight: '700', marginBottom: wvs(3) },
  notifBody: { fontSize: wms(12.5), lineHeight: wms(18), marginBottom: wvs(4) },
  notifTime: { fontSize: wms(11), fontWeight: '500' },
  dismissBtn: { paddingTop: wvs(2) },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: wvs(10), paddingHorizontal: ws(40) },
  emptyTitle: { fontSize: wms(16), fontWeight: '700' },
  emptySub: { fontSize: wms(12.5), textAlign: 'center', lineHeight: wms(18) },

  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ws(7), paddingVertical: wvs(16), marginTop: wvs(4) },
  clearBtnText: { fontSize: wms(12.5), fontWeight: '500' },
});
