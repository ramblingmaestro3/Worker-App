import ScreenContent from '@/components/ScreenContent';
import EmptyState from '@/components/ui/EmptyState';
import HighlightedText from '@/components/ui/HighlightedText';
import SwipeableRow from '@/components/ui/SwipeableRow';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ConversationView, listMyConversations } from '@/lib/api/bookings';
import { usePinnedConversationsStore } from '@/lib/stores/pinned-conversations-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { CustomerTabParamList, RootStackParamList } from '@/navigation/types';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
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

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, 'messages'>,
  NativeStackScreenProps<RootStackParamList>
>;

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

export default function MessagesScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const T = useThemeColors();
  const pinnedIds = usePinnedConversationsStore((s) => s.pinnedIds);
  const togglePin = usePinnedConversationsStore((s) => s.togglePin);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Messages',
      headerRight: () => (
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.8}
          onPress={() => {
            setShowSearch((v) => !v);
            if (showSearch) setSearch('');
          }}
        >
          <Ionicons name={showSearch ? 'close' : 'search-outline'} size={20} color={COLORS.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, showSearch]);

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
        search.trim() === '' ? true :
          c.worker.full_name.toLowerCase().includes(search.toLowerCase()) ||
          (c.request_category ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (c.last_message?.message_text ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [conversations, search]
  );

  // Pinned conversations surface once, at the top, regardless of job status —
  // everything else buckets into Active (job still underway) or Archived
  // (completed/cancelled), same booking_status the bookings page filters on.
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
          style={[styles.row, { backgroundColor: T.card }, !isLast && [styles.rowDivider, { borderColor: T.divider }]]}
          onPress={() => navigation.navigate('Chat', { bookingId: convo.booking_id })}
          activeOpacity={0.78}
        >
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: COLORS.accent + '20' }]}>
              <Text style={[styles.initials, { color: COLORS.accent }]}>{initialsOf(convo.worker.full_name)}</Text>
            </View>
            {pinnedRow && (
              <View style={[styles.pinBadge, { borderColor: T.card }]}>
                <Ionicons name="pin" size={9} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.content}>
            <View style={styles.topRow}>
              <HighlightedText
                text={convo.worker.full_name}
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
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      {showSearch && (
        <View style={styles.searchWrapOuter}>
          <ScreenContent style={[styles.searchWrap, { backgroundColor: T.inputBg }]}>
            <Ionicons name="search-outline" size={17} color={T.subText} />
            <TextInput
              style={[styles.searchInput, { color: T.text }]}
              placeholder="Search by name, job, or message"
              placeholderTextColor={T.subText}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={17} color={T.subText} />
              </TouchableOpacity>
            )}
          </ScreenContent>
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
          <Ionicons name="chatbubbles-outline" size={54} color={COLORS.primary + '50'} />
          <Text style={[styles.emptyTitle, { color: T.text }]}>{search ? 'No matches' : 'No conversations'}</Text>
          <Text style={[styles.emptySub, { color: T.subText }]}>
            {search ? 'Try a different name, job, or message text.' : 'Post a job and connect with workers to start chatting.'}
          </Text>
          {!search && (
            <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('PostAJob', {})} activeOpacity={0.85}>
              <Text style={styles.emptyCtaText}>Post a Job</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.listWrapOuter}>
          <ScreenContent style={styles.listWrap}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {pinned.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: T.subText }]}>PINNED</Text>
                  <View style={[styles.section, { borderColor: T.border }]}>
                    {pinned.map((c, i) => renderRow(c, i === pinned.length - 1))}
                  </View>
                </>
              )}
              {active.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: T.subText }]}>ACTIVE</Text>
                  <View style={[styles.section, { borderColor: T.border }]}>
                    {active.map((c, i) => renderRow(c, i === active.length - 1))}
                  </View>
                </>
              )}
              {archived.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: T.subText }]}>ARCHIVED</Text>
                  <View style={[styles.section, { borderColor: T.border }]}>
                    {archived.map((c, i) => renderRow(c, i === archived.length - 1))}
                  </View>
                </>
              )}
            </ScrollView>
          </ScreenContent>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '12', borderRadius: 20 },
  searchWrapOuter: { width: '100%', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  listWrapOuter: { flex: 1, width: '100%', alignItems: 'center' },
  listWrap: { flex: 1 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  sectionLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowDivider: { borderBottomWidth: 1 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '800' },
  pinBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700' },
  nameUnread: { fontWeight: '800' },
  timeGroup: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  unreadDotSmall: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.primary },
  time: { fontSize: 11 },
  jobPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 5 },
  jobTitle: { fontSize: 11, fontWeight: '500', maxWidth: 180 },
  lastMsg: { fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyCta: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  emptyCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
