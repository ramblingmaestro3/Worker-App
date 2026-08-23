import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
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
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterCategory = 'all' | 'job' | 'message';

function categoryOf(type: NotificationType): 'job' | 'message' {
  return type === 'new_message' ? 'message' : 'job';
}

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

const TYPE_META: Record<NotificationType, { icon: string; bg: string; color: string }> = {
  bid_accepted: { icon: 'briefcase-outline', bg: COLORS.primary + '18', color: COLORS.primary },
  bid_declined: { icon: 'briefcase-outline', bg: COLORS.dangerLight, color: COLORS.danger },
  bid_countered: { icon: 'pricetag-outline', bg: COLORS.primary + '18', color: COLORS.primary },
  new_message: { icon: 'chatbubble-ellipses-outline', bg: '#E3F2FD', color: '#1565C0' },
};

const FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'job', label: 'Jobs' },
  { key: 'message', label: 'Messages' },
];

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [loading, setLoading] = useState(true);
  const T = useThemeColors();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let channel: ReturnType<typeof subscribeToMyNotifications> | null = null;

      (async () => {
        const [auth, result] = await Promise.all([supabase.auth.getUser(), listMyNotifications()]);
        if (cancelled) return;
        if (result.success) setNotifs(result.data ?? []);
        setLoading(false);

        if (auth.data.user) {
          channel = subscribeToMyNotifications(auth.data.user.id, (row) => {
            setNotifs((prev) => (prev.some((n) => n.id === row.id) ? prev.map((n) => (n.id === row.id ? row : n)) : [row, ...prev]));
          });
        }
      })();

      return () => {
        cancelled = true;
        if (channel) unsubscribe(channel);
      };
    }, [])
  );

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const visible = filter === 'all' ? notifs : notifs.filter((n) => categoryOf(n.type) === filter);

  const markRead = (id: string) => {
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    markNotificationRead(id);
  };
  const dismiss = (id: string) => {
    setNotifs((ns) => ns.filter((n) => n.id !== id));
    deleteNotification(id);
  };
  const markAllRead = () => {
    setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })));
    markAllNotificationsRead();
  };
  const clearAll = () => {
    setNotifs((ns) => ns.filter((n) => !n.is_read));
    deleteAllReadNotifications();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.headerInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={[s.title, { color: T.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View>
            )}
          </View>
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} disabled={unreadCount === 0}>
            <Text style={[s.markAllText, unreadCount === 0 && { opacity: 0.3 }]}>Mark all read</Text>
          </TouchableOpacity>
        </ScreenContent>
      </View>

      <View style={[s.filterOuter, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.filterRow, { alignItems: 'center' }]}>
            {FILTERS.map(f => (
              <Pressable
                key={f.key}
                style={({ pressed }) => [
                  s.filterChip,
                  { backgroundColor: T.card, borderColor: T.border },
                  filter === f.key && s.filterChipActive,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[s.filterText, { color: T.subText }, filter === f.key && s.filterTextActive]}>{f.label}</Text>
                {f.key !== 'all' && notifs.filter(n => categoryOf(n.type) === f.key && !n.is_read).length > 0 && (
                  <View style={s.chipBadge}>
                    <Text style={s.chipBadgeText}>{notifs.filter(n => categoryOf(n.type) === f.key && !n.is_read).length}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </ScreenContent>
      </View>

      {loading ? (
        <View style={s.empty}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : visible.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="notifications-off-outline" size={56} color={COLORS.primary + '50'} />
          <Text style={[s.emptyTitle, { color: T.text }]}>All caught up!</Text>
          <Text style={[s.emptySub, { color: T.subText }]}>No notifications in this category yet.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollOuter}>
        <ScreenContent style={s.list}>
          {(() => {
            const unread = visible.filter((n) => !n.is_read);
            const read = visible.filter((n) => n.is_read);
            const renderNotif = (notif: Notification, bordered: boolean) => {
              const meta = TYPE_META[notif.type];
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    s.row,
                    bordered
                      ? { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 14, marginBottom: 10 }
                      : { backgroundColor: COLORS.primary + '08', borderRadius: 14, marginBottom: 10 },
                  ]}
                  onPress={() => markRead(notif.id)}
                  activeOpacity={0.78}
                >
                  {!notif.is_read && <View style={s.unreadDot} />}
                  <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                  </View>
                  <View style={s.content}>
                    <Text style={[s.notifTitle, { color: T.text }]} numberOfLines={1}>{notif.title}</Text>
                    {!!notif.body && <Text style={[s.notifBody, { color: T.subText }]} numberOfLines={2}>{notif.body}</Text>}
                    <Text style={[s.notifTime, { color: T.subText }]}>{timeAgo(notif.created_at)}</Text>
                  </View>
                  <TouchableOpacity style={s.dismissBtn} onPress={() => dismiss(notif.id)} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
                    <Ionicons name="close-outline" size={18} color={T.subText} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            };
            return (
              <>
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
              </>
            );
          })()}
          {notifs.filter(n => n.is_read).length > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={clearAll} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={15} color={T.subText} />
              <Text style={[s.clearBtnText, { color: T.subText }]}>Clear read notifications</Text>
            </TouchableOpacity>
          )}
        </ScreenContent>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  badge: { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  markAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  filterOuter: { borderBottomWidth: 1 },
  scrollOuter: {},
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, flexShrink: 0, outlineStyle: 'none' } as any,
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  filterText: { fontSize: 13, fontWeight: '600', includeFontPadding: false, textAlign: 'center' },
  filterTextActive: { color: COLORS.primary, fontWeight: '600' },
  chipBadge: { backgroundColor: COLORS.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  list: { paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4, paddingHorizontal: 16 },
  divider: { height: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12, position: 'relative' },
  unreadDot: { position: 'absolute', left: 6, top: 20, width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 4 },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  notifBody: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  notifTime: { fontSize: 11, fontWeight: '500' },
  dismissBtn: { paddingTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 16, marginTop: 8 },
  clearBtnText: { fontSize: 13, fontWeight: '500' },
});
