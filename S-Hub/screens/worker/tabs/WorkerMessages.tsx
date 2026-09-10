/**
 * Worker conversations list — same component shape as the customer Messages tab,
 * showing convo.other (the client) resolved by identity.
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import HighlightedText from '@/components/ui/HighlightedText';
import SwipeableRow from '@/components/ui/SwipeableRow';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { listMyConversations, ConversationView } from '@/lib/api/bookings';
import { usePinnedConversationsStore } from '@/lib/stores/pinned-conversations-store';
import { useUnreadStore } from '@/lib/stores/unread-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { RootStackParamList, WorkerTabParamList } from '@/navigation/types';

const ACTIVE_STATUSES = ['accepted', 'en_route', 'arrived', 'in_progress'];

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<WorkerTabParamList, 'worker-messages'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function WorkerMessagesScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pinnedIds = usePinnedConversationsStore((s) => s.pinnedIds);
  const togglePin = usePinnedConversationsStore((s) => s.togglePin);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async (cancelledRef?: { current: boolean }) => {
    setLoading(true);
    setError(false);
    const result = await listMyConversations();
    if (cancelledRef?.current) return;
    if (result.success) {
      setConversations(result.data ?? []);
    } else {
      setError(true);
    }
    setLoading(false);
    useUnreadStore.getState().refreshMessages();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      load(cancelledRef);
      return () => { cancelledRef.current = true; };
    }, [load])
  );

  const filtered = useMemo(
    () =>
      conversations.filter((c) =>
        search.trim() === ''
          ? true
          : c.other.full_name.toLowerCase().includes(search.toLowerCase()) ||
            (c.request_category ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (c.last_message?.message_text ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [conversations, search]
  );

  // Pinned conversations surface once, at the top, regardless of job status —
  // everything else buckets into Active (job still underway) or Archived
  // (completed/cancelled), same booking_status the worker-jobs page filters on.
  const { pinned, active, archived } = useMemo(() => {
    const pinnedList: ConversationView[] = [];
    const activeList: ConversationView[] = [];
    const archivedList: ConversationView[] = [];
    for (const c of filtered) {
      if (pinnedIds.includes(c.booking_id)) {
        pinnedList.push(c);
      } else if (ACTIVE_STATUSES.includes(c.booking_status)) {
        activeList.push(c);
      } else {
        archivedList.push(c);
      }
    }
    return { pinned: pinnedList, active: activeList, archived: archivedList };
  }, [filtered, pinnedIds]);

  const renderRow = (convo: ConversationView, isLast: boolean) => {
    const unread = !!convo.last_message && convo.last_message.sender_id !== myId && !convo.last_message.is_read;
    const pinnedRow = pinnedIds.includes(convo.booking_id);
    return (
      <SwipeableRow key={convo.booking_id} pinned={pinnedRow} onTogglePin={() => togglePin(convo.booking_id)}>
        <TouchableOpacity
          style={[styles.row, !isLast && [styles.rowDivider, { borderColor: T.divider }]]}
          onPress={() => navigation.navigate('Chat', { bookingId: convo.booking_id })}
          activeOpacity={0.75}
        >
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: COLORS.accent + '18' }]}>
              <Text style={[styles.initials, { color: COLORS.accent }]}>{initialsOf(convo.other.full_name)}</Text>
            </View>
            {pinnedRow && (
              <View style={[styles.pinBadge, { borderColor: T.card }]}>
                <Ionicons name="pin" size={wms(9)} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.topRow}>
              <HighlightedText
                text={convo.other.full_name}
                query={search}
                style={[styles.name, { color: T.text }, unread && styles.nameUnread]}
                numberOfLines={1}
              />
              <View style={styles.timeGroup}>
                {unread && <View style={styles.unreadDotSmall} />}
                {convo.last_message && (
                  <Text style={[styles.time, { color: unread ? COLORS.primary : T.subText }, unread && { fontWeight: '700' }]}>
                    {timeAgo(convo.last_message.created_at)}
                  </Text>
                )}
              </View>
            </View>
            {convo.request_category && (
              <View style={[styles.jobPill, { backgroundColor: T.inputBg }, unread && { backgroundColor: COLORS.primaryLight }]}>
                <Text style={[styles.jobTitle, { color: unread ? COLORS.primary : T.subText }, unread && { fontWeight: '700' }]} numberOfLines={1}>
                  {convo.request_category.charAt(0).toUpperCase() + convo.request_category.slice(1)}
                </Text>
              </View>
            )}
            <HighlightedText
              text={convo.last_message?.message_text ?? 'No messages yet'}
              query={search}
              style={[styles.lastMsg, { color: unread ? T.text : T.subText }, unread && { fontWeight: '600' }]}
              numberOfLines={1}
            />
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <ScreenHeader
        title="Messages"
        right={
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: T.inputBg }]}
            activeOpacity={0.8}
            onPress={() => {
              setShowSearch((v) => !v);
              setSearch('');
            }}
          >
            <Ionicons name={showSearch ? 'close' : 'search-outline'} size={wms(17)} color={T.text} />
          </TouchableOpacity>
        }
      />

      <View style={styles.pageInner}>
        {showSearch && (
          <View style={[styles.searchWrap, { backgroundColor: T.inputBg, borderColor: T.border }]}>
            <Ionicons name="search-outline" size={wms(15)} color={T.subText} />
            <TextInput
              style={[styles.searchInput, { color: T.text }]}
              placeholder="Search by name, job, or message"
              placeholderTextColor={T.subText}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load messages"
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => load()}
            tone="error"
          />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={wms(44)} color={T.subText + '50'} />
            <Text style={[styles.emptyTitle, { color: T.text }]}>{search ? 'No matches' : 'No messages yet'}</Text>
            <Text style={[styles.emptySub, { color: T.subText }]}>
              {search ? 'Try a different name, job, or message text.' : 'When clients contact you about jobs, conversations will appear here.'}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {pinned.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: T.subText }]}>PINNED</Text>
                <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                  {pinned.map((c, i) => renderRow(c, i === pinned.length - 1))}
                </View>
              </>
            )}
            {active.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: T.subText }]}>ACTIVE</Text>
                <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                  {active.map((c, i) => renderRow(c, i === active.length - 1))}
                </View>
              </>
            )}
            {archived.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: T.subText }]}>ARCHIVED</Text>
                <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                  {archived.map((c, i) => renderRow(c, i === archived.length - 1))}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  iconBtn: {
    width: ws(36), height: ws(36), borderRadius: ws(18),
    alignItems: 'center', justifyContent: 'center',
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: ws(8),
    marginHorizontal: ws(20), marginTop: wvs(10), marginBottom: wvs(10),
    borderRadius: ws(12), paddingHorizontal: ws(12), paddingVertical: wvs(9),
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: wms(13.5) },

  /* List */
  list: { paddingHorizontal: ws(20), paddingBottom: wvs(100) },
  section: { borderRadius: ws(16), borderWidth: 1, overflow: 'hidden', marginBottom: wvs(4) },
  sectionLabel: { fontSize: wms(11.5), fontWeight: '700', letterSpacing: 0.5, marginTop: wvs(14), marginBottom: wvs(8) },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: ws(14), paddingVertical: wvs(12), gap: ws(12),
  },
  rowDivider: { borderBottomWidth: 1 },

  /* Avatar */
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: ws(46), height: ws(46), borderRadius: ws(23),
    alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontSize: wms(14.5), fontWeight: '800' },
  pinBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: ws(16), height: ws(16), borderRadius: ws(8), borderWidth: 2,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },

  /* Content */
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: wvs(3), gap: ws(8),
  },
  name: { flex: 1, fontSize: wms(14.5), fontWeight: '700' },
  nameUnread: { fontWeight: '800' },
  timeGroup: { flexDirection: 'row', alignItems: 'center', gap: ws(5), flexShrink: 0 },
  unreadDotSmall: { width: ws(7), height: ws(7), borderRadius: ws(3.5), backgroundColor: COLORS.primary },
  time: { fontSize: wms(11) },
  jobPill: { flexDirection: 'row', alignItems: 'center', gap: ws(4), borderRadius: ws(6), paddingHorizontal: ws(7), paddingVertical: wvs(3), alignSelf: 'flex-start', marginBottom: wvs(4) },
  jobTitle: { fontSize: wms(11), fontWeight: '500', maxWidth: ws(180) },
  lastMsg: { fontSize: wms(12.5) },

  /* Empty */
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: ws(40), gap: wvs(10),
  },
  emptyTitle: { fontSize: wms(16), fontWeight: '700' },
  emptySub: { fontSize: wms(12.5), textAlign: 'center', lineHeight: wms(18) },
});
