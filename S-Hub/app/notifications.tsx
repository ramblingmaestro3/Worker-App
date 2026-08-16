import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { api } from '../lib/api';
import { messagingSocket } from '../lib/messaging';

/* ─── Types ─── */
type NotifType = 'job' | 'payment' | 'message' | 'system';

interface Notif {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  relatedType?: string | null;
}

function mapType(notificationType?: string): NotifType {
  if (notificationType === 'booking') return 'job';
  if (notificationType === 'message') return 'message';
  if (notificationType === 'payment') return 'payment';
  return 'system';
}

function relativeTime(iso?: string) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function mapNotification(n: any): Notif {
  return {
    id: n.id,
    type: mapType(n.notification_type),
    title: n.title || 'Notification',
    body: n.message || '',
    time: relativeTime(n.created_at),
    read: Boolean(n.is_read),
    relatedType: n.related_entity_type ?? null,
  };
}

/* ─── Icon + color per type ─── */
const TYPE_META: Record<NotifType, { icon: string; bg: string; color: string }> = {
  job:     { icon: 'briefcase-outline',         bg: COLORS.primary + '18', color: COLORS.primary },
  payment: { icon: 'card-outline',              bg: '#E8F5E9',              color: '#2E7D32'      },
  message: { icon: 'chatbubble-ellipses-outline', bg: '#E3F2FD',            color: '#1565C0'      },
  system:  { icon: 'information-circle-outline', bg: '#FFF8E1',             color: '#F57F17'      },
};

/* ─── Single notification row ─── */
function NotifRow({ notif, onPress, onDismiss }: {
  notif: Notif;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const meta = TYPE_META[notif.type];
  return (
    <TouchableOpacity
      style={[nr.row, !notif.read && nr.rowUnread]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {/* Unread dot */}
      {!notif.read && <View style={nr.unreadDot} />}

      {/* Icon */}
      <View style={[nr.iconWrap, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
      </View>

      {/* Content */}
      <View style={nr.content}>
        <Text style={nr.title} numberOfLines={1}>{notif.title}</Text>
        <Text style={nr.body} numberOfLines={2}>{notif.body}</Text>
        <Text style={nr.time}>{notif.time}</Text>
      </View>

      {/* Dismiss */}
      <TouchableOpacity style={nr.dismissBtn} onPress={onDismiss} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
        <Ionicons name="close-outline" size={18} color={COLORS.muted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const nr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: 12,
    position: 'relative',
  },
  rowUnread: { backgroundColor: COLORS.primary + '06' },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: 20,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 4,
  },
  content: { flex: 1 },
  title:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  body:    { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 4 },
  time:    { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  dismissBtn: { paddingTop: 2 },
});

/* ─── Filter tabs ─── */
const FILTERS: { key: 'all' | NotifType; label: string }[] = [
  { key: 'all',     label: 'All'      },
  { key: 'job',     label: 'Jobs'     },
  { key: 'message', label: 'Messages' },
  { key: 'payment', label: 'Payments' },
];

/* ─── Main Screen ─── */
export default function NotificationsScreen() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | NotifType>('all');

  const load = useCallback(() => {
    setLoading(true);
    api.getNotifications({ per_page: 50 })
      .then(result => setNotifs((result.items || []).map(mapNotification)))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = messagingSocket();
    if (!socket) return;
    const handleNew = (payload: any) => {
      setNotifs(ns => ns.some(n => n.id === payload.id) ? ns : [mapNotification(payload), ...ns]);
    };
    socket.on('notification:new', handleNew);
    return () => { socket.off('notification:new', handleNew); };
  }, []);

  const unreadCount = notifs.filter(n => !n.read).length;

  const visible = filter === 'all'
    ? notifs
    : notifs.filter(n => n.type === filter);

  const markRead = (id: number) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    api.markNotificationRead(id).catch(() => {});
  };

  const openNotif = (notif: Notif) => {
    markRead(notif.id);
    if (notif.relatedType === 'booking') router.push('/bookings' as any);
    else if (notif.relatedType === 'message') router.push('/messages' as any);
    else if (notif.relatedType === 'payment') router.push('/payment' as any);
  };

  const dismiss = (id: number) =>
    setNotifs(ns => ns.filter(n => n.id !== id));

  const markAllRead = () => {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    api.markAllNotificationsRead().catch(() => {});
  };

  const clearAll = () =>
    setNotifs(ns => ns.filter(n => !n.read)); // keep only unread on clear

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} disabled={unreadCount === 0}>
          <Text style={[s.markAllText, unreadCount === 0 && { opacity: 0.3 }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* ── FILTER TABS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
            {/* unread count badge per type */}
            {f.key !== 'all' && notifs.filter(n => n.type === f.key && !n.read).length > 0 && (
              <View style={s.chipBadge}>
                <Text style={s.chipBadgeText}>
                  {notifs.filter(n => n.type === f.key && !n.read).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── NOTIFICATION LIST ── */}
      {loading ? (
        <View style={s.empty}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : visible.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="notifications-off-outline" size={56} color={COLORS.primary + '50'} />
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptySub}>No notifications in this category yet.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
        >
          {visible.map((notif, i) => (
            <View key={notif.id}>
              {i > 0 && <View style={s.divider} />}
              <NotifRow
                notif={notif}
                onPress={() => openNotif(notif)}
                onDismiss={() => dismiss(notif.id)}
              />
            </View>
          ))}

          {notifs.filter(n => n.read).length > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={clearAll} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={15} color={COLORS.muted} />
              <Text style={s.clearBtnText}>Clear read notifications</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  markAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  /* Filter row */
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  filterText:       { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  filterTextActive: { color: COLORS.primary },
  chipBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  /* List */
  list: { paddingBottom: 40 },
  divider: { height: 1, backgroundColor: '#F2F2F2' },

  /* Empty */
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptySub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },

  /* Clear button */
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 16,
    marginTop: 8,
  },
  clearBtnText: { fontSize: 13, color: COLORS.muted, fontWeight: '500' },
});
