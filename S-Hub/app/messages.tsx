import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import CustomerNav from '@/components/CustomerNav';
import { listMyConversations, ConversationView } from '@/lib/api/bookings';
import { supabase } from '@/lib/supabase';
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

export default function MessagesScreen() {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [loading, setLoading] = useState(true);
  const T = useThemeColors();

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
    search.trim() === '' ? true :
      c.worker.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.request_category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <View style={[styles.header, { backgroundColor: T.header }]}>
        <ScreenContent style={styles.headerInner}>
          <Text style={[styles.title, { color: T.text }]}>Messages</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearch('');
            }}
          >
            <Ionicons name={showSearch ? 'close' : 'search-outline'} size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </ScreenContent>
      </View>

      {showSearch && (
        <View style={styles.searchWrapOuter}>
          <ScreenContent style={[styles.searchWrap, { backgroundColor: T.inputBg }]}>
            <Ionicons name="search-outline" size={17} color={T.subText} />
            <TextInput
              style={[styles.searchInput, { color: T.text }]}
              placeholder="Search"
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
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={54} color={COLORS.primary + '50'} />
          <Text style={[styles.emptyTitle, { color: T.text }]}>No conversations</Text>
          <Text style={[styles.emptySub, { color: T.subText }]}>Post a job and connect with workers to start chatting.</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/post-a-job' as any)} activeOpacity={0.85}>
            <Text style={styles.emptyCtaText}>Post a Job</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listWrapOuter}>
          <ScreenContent style={styles.listWrap}>
            <FlatList
              style={styles.listBox}
              data={filtered}
              keyExtractor={(item) => item.booking_id}
              renderItem={({ item: convo, index }) => {
                const unread = !!convo.last_message && convo.last_message.sender_id !== myId && !convo.last_message.is_read;
                return (
                  <View>
                    {index > 0 && <View style={[styles.divider, { backgroundColor: T.divider }]} />}
                    <TouchableOpacity
                      style={[styles.row, { backgroundColor: T.card }]}
                      onPress={() => router.push(`/chat?bookingId=${convo.booking_id}` as any)}
                      activeOpacity={0.78}
                    >
                      <View style={styles.avatarWrap}>
                        <View style={[styles.avatar, { backgroundColor: COLORS.accent + '20' }]}>
                          <Text style={[styles.initials, { color: COLORS.accent }]}>{initialsOf(convo.worker.full_name)}</Text>
                        </View>
                      </View>
                      <View style={styles.content}>
                        <View style={styles.topRow}>
                          <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>{convo.worker.full_name}</Text>
                          {convo.last_message && (
                            <Text style={[styles.time, { color: unread ? COLORS.primary : T.subText }, unread && { fontWeight: '700' }]}>
                              {timeAgo(convo.last_message.created_at)}
                            </Text>
                          )}
                        </View>
                        {convo.request_category && (
                          <View style={[styles.jobPill, { backgroundColor: T.inputBg }]}>
                            <Text style={[styles.jobTitle, { color: T.subText }]} numberOfLines={1}>
                              {convo.request_category.charAt(0).toUpperCase() + convo.request_category.slice(1)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.bottomRow}>
                          <Text style={[styles.lastMsg, { color: unread ? T.text : T.subText }, unread && { fontWeight: '600' }]} numberOfLines={1}>
                            {convo.last_message?.message_text ?? 'No messages yet'}
                          </Text>
                          {unread && <View style={styles.unreadDot} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
            />
          </ScreenContent>
        </View>
      )}

      <CustomerNav active="messages" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '800' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '12', borderRadius: 20 },
  searchWrapOuter: { width: '100%', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  list: { paddingBottom: 100 },
  listWrapOuter: { flex: 1, width: '100%', alignItems: 'center' },
  listWrap: { flex: 1 },
  listBox: { width: '100%' },
  divider: { height: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '800' },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700' },
  time: { fontSize: 11 },
  jobPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 5 },
  jobTitle: { fontSize: 11, fontWeight: '500', maxWidth: 180 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastMsg: { flex: 1, fontSize: 13 },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: COLORS.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyCta: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 6 },
  emptyCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
