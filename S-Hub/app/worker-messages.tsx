import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import WorkerNav from '@/components/WorkerNav';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';
import { listMyConversations, ConversationView } from '@/lib/api/bookings';
import { supabase } from '@/lib/supabase';

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

export default function WorkerMessagesScreen() {
  const T = useThemeColors();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [auth, result] = await Promise.all([supabase.auth.getUser(), listMyConversations()]);
        if (cancelled) return;
        setMyId(auth.data.user?.id ?? null);
        if (result.success) setConversations(result.data ?? []);
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [])
  );

  const filtered = conversations.filter((c) =>
    search.trim() === ''
      ? true
      : c.client.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.request_category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RequireVerifiedWorker>
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.pageInner}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: T.text }]}>Messages</Text>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: T.inputBg }]}
          activeOpacity={0.8}
          onPress={() => {
            setShowSearch(!showSearch);
            if (showSearch) setSearch('');
          }}
        >
          <Ionicons name={showSearch ? 'close' : 'search-outline'} size={wms(17)} color={T.text} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={[styles.searchWrap, { backgroundColor: T.inputBg, borderColor: T.border }]}>
          <Ionicons name="search-outline" size={wms(15)} color={T.subText} />
          <TextInput
            style={[styles.searchInput, { color: T.text }]}
            placeholder="Search conversations"
            placeholderTextColor={T.subText}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoFocus
          />
        </View>
      )}

      {/* Conversations */}
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={wms(44)} color={T.subText + '50'} />
          <Text style={[styles.emptyTitle, { color: T.text }]}>No messages yet</Text>
          <Text style={[styles.emptySub, { color: T.subText }]}>
            When clients contact you about jobs, conversations will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.booking_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: T.divider }]} />}
          renderItem={({ item: convo }) => {
            const unread = !!convo.last_message && convo.last_message.sender_id !== myId && !convo.last_message.is_read;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(`/chat?bookingId=${convo.booking_id}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, { backgroundColor: '#7C3AED18' }]}>
                    <Text style={[styles.initials, { color: '#7C3AED' }]}>{initialsOf(convo.client.full_name)}</Text>
                  </View>
                </View>

                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>{convo.client.full_name}</Text>
                    {convo.last_message && (
                      <Text style={[styles.time, { color: unread ? COLORS.primary : T.subText }]}>
                        {timeAgo(convo.last_message.created_at)}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.lastMsg,
                      { color: unread ? T.text : T.subText },
                      unread && { fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {convo.last_message?.message_text ?? 'No messages yet'}
                  </Text>
                </View>

                {unread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
      </View>

      <WorkerNav active="messages" />
    </SafeAreaView>
    </RequireVerifiedWorker>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: ws(20), paddingTop: wvs(6), paddingBottom: wvs(10),
  },
  title: { fontSize: wms(22), fontWeight: '800' },
  iconBtn: {
    width: ws(36), height: ws(36), borderRadius: ws(18),
    alignItems: 'center', justifyContent: 'center',
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: ws(8),
    marginHorizontal: ws(20), marginBottom: wvs(10),
    borderRadius: ws(12), paddingHorizontal: ws(12), paddingVertical: wvs(9),
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: wms(13.5) },

  /* List */
  list: { paddingBottom: wvs(100) },
  divider: { height: 1, marginLeft: ws(72) },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: ws(20), paddingVertical: wvs(12), gap: ws(12),
  },

  /* Avatar */
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: ws(46), height: ws(46), borderRadius: ws(23),
    alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontSize: wms(14.5), fontWeight: '800' },

  /* Content */
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: wvs(3), gap: ws(8),
  },
  name: { flex: 1, fontSize: wms(14.5), fontWeight: '700' },
  time: { fontSize: wms(11) },
  lastMsg: { fontSize: wms(12.5) },
  unreadDot: { width: ws(9), height: ws(9), borderRadius: ws(4.5), backgroundColor: COLORS.primary },

  /* Empty */
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: ws(40), gap: wvs(10),
  },
  emptyTitle: { fontSize: wms(16), fontWeight: '700' },
  emptySub: { fontSize: wms(12.5), textAlign: 'center', lineHeight: wms(18) },
});
