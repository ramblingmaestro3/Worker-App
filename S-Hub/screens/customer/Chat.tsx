import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import EmptyState from '@/components/ui/EmptyState';
import { getBookingWithContext, BookingChatContext } from '@/lib/api/bookings';
import { blockUser, unblockUser, isBlockedWith } from '@/lib/api/blocking';
import { submitReport } from '@/lib/api/reports';
import { listMessages, sendMessage, markMessagesRead, Message } from '@/lib/api/messages';
import { subscribeToBookingMessages, unsubscribe } from '@/lib/api/realtime';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { RootStackParamList } from '@/navigation/types';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const CATEGORY_ICON: Record<string, string> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  painting: 'color-palette-outline',
  cleaning: 'sparkles-outline',
  carpentry: 'hammer-outline',
};

function statusLabel(status: string): string {
  return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: string): string {
  if (status === 'completed') return COLORS.accent;
  if (status === 'cancelled') return COLORS.muted;
  return COLORS.primary;
}

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

/** Consecutive same-sender messages within 5 minutes of each other render as one visually-grouped run — only the last bubble in a run shows the time/read-receipt, and the "tail" corner only appears on that last bubble. */
const GROUP_GAP_MS = 5 * 60 * 1000;
function isNewGroup(a: Message | undefined, b: Message): boolean {
  if (!a) return true;
  if (a.sender_id !== b.sender_id) return true;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() > GROUP_GAP_MS;
}

function DayDivider({ iso, T }: { iso: string; T: any }) {
  return (
    <View style={dd.wrap}>
      <View style={[dd.pill, { backgroundColor: T.inputBg }]}>
        <Text style={[dd.text, { color: T.subText }]}>{formatDayLabel(iso)}</Text>
      </View>
    </View>
  );
}
const dd = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  text: { fontSize: 11, fontWeight: '700' },
});

/** Marks where this viewing session's unread messages begin — shown once per chat open, based on each message's read state at load time. */
function UnreadDivider({ T }: { T: any }) {
  return (
    <View style={ud.wrap}>
      <View style={[ud.line, { backgroundColor: T.border }]} />
      <View style={[ud.pill, { backgroundColor: T.bg, borderColor: T.border }]}>
        <Text style={[ud.text, { color: COLORS.primary }]}>New messages</Text>
      </View>
      <View style={[ud.line, { backgroundColor: T.border }]} />
    </View>
  );
}
const ud = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  pill: { marginHorizontal: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 11, fontWeight: '700' },
});

function MessageBubble({ msg, mine, first, last, T }: { msg: Message; mine: boolean; first: boolean; last: boolean; T: any }) {
  const tailRadius = 4;
  const flatRadius = 6;
  const fullRadius = 18;
  const cornerStyle = mine
    ? { borderTopRightRadius: first ? fullRadius : flatRadius, borderBottomRightRadius: last ? tailRadius : flatRadius }
    : { borderTopLeftRadius: first ? fullRadius : flatRadius, borderBottomLeftRadius: last ? tailRadius : flatRadius };

  return (
    <View style={[mb.wrap, mine ? mb.mine : mb.theirs, { marginBottom: last ? 10 : 2 }]}>
      <View
        style={[
          mb.bubble,
          cornerStyle,
          mine ? mb.bubbleMine : [mb.bubbleTheirs, { backgroundColor: T.inputBg }],
        ]}
      >
        <Text style={[mb.text, mine ? mb.textMine : [mb.textTheirs, { color: T.text }]]}>{msg.message_text}</Text>
      </View>
      {last && (
        <View style={[mb.metaRow, mine && { justifyContent: 'flex-end' }]}>
          <Text style={[mb.time, { color: T.subText }]}>{formatTime(msg.created_at)}</Text>
          {mine && (
            <Ionicons
              name={msg.is_read ? 'checkmark-done' : 'checkmark-outline'}
              size={13}
              color={msg.is_read ? COLORS.primary : T.subText}
            />
          )}
        </View>
      )}
    </View>
  );
}

const mb = StyleSheet.create({
  wrap: { maxWidth: '80%' },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: COLORS.primary },
  bubbleTheirs: {},
  text: { fontSize: 14, lineHeight: 21 },
  textMine: { color: '#fff' },
  textTheirs: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 4 },
  time: { fontSize: 10 },
});

const QUICK_REPLIES = ['On my way!', 'What time?', 'Sounds good', 'Can we reschedule?'];

export default function ChatScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const T = useThemeColors();

  const myId = useAuthStore((s) => s.user?.id ?? null);
  const [context, setContext] = useState<BookingChatContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const listRef = useRef<FlatList>(null);
  const firstUnreadIdRef = useRef<string | null>(null);

  const isClientViewer = myId != null && context != null && myId === context.client_id;
  const otherParty = context ? (isClientViewer ? context.worker : context.client) : null;
  const otherColor = COLORS.accent;

  const handleViewProfile = () => {
    setMenuVisible(false);
    if (context) navigation.navigate('WorkerProfile', { id: context.worker_id, fromBooking: true });
  };

  const handleJobBannerPress = () => {
    if (bookingId) navigation.navigate('JobDetail', { bookingId });
  };

  const handleBlock = () => {
    setMenuVisible(false);
    if (!otherParty) return;
    Alert.alert(`Block ${otherParty.full_name}?`, 'They will no longer be able to message or contact you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          const result = await blockUser(otherParty.id);
          if (!result.success) {
            Alert.alert('Could Not Block', result.error ?? 'Something went wrong. Please try again.');
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  };

  const handleUnblock = () => {
    setMenuVisible(false);
    if (!otherParty) return;
    Alert.alert(`Unblock ${otherParty.full_name}?`, 'They will be able to message and contact you again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          const result = await unblockUser(otherParty.id);
          if (!result.success) {
            Alert.alert('Could Not Unblock', result.error ?? 'Something went wrong. Please try again.');
            return;
          }
          setBlocked(false);
        },
      },
    ]);
  };

  const handleReport = () => {
    setMenuVisible(false);
    setReportReason('');
    setReportVisible(true);
  };

  const submitReportHandler = async () => {
    if (!otherParty || !reportReason.trim()) return;
    setSubmittingReport(true);
    const result = await submitReport({ reportedId: otherParty.id, reason: reportReason, bookingId });
    setSubmittingReport(false);
    if (!result.success) {
      Alert.alert('Could Not Submit Report', result.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setReportVisible(false);
    Alert.alert('Reported', "Thanks — our team will look into this within 24 hours.");
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View>
          <Text style={[s.headerName, { color: T.text }]} numberOfLines={1}>{otherParty?.full_name ?? 'Unknown'}</Text>
          {context && <Text style={[s.headerStatus, { color: T.subText }]}>{context.status.replace('_', ' ')}</Text>}
        </View>
      ),
      headerLeft: (props: any) => (
        <View style={s.headerLeftRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <View style={[s.headerAvatar, { backgroundColor: otherColor + '20' }]}>
            <Text style={[s.headerInitials, { color: otherColor }]}>{initialsOf(otherParty?.full_name ?? '?')}</Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity style={s.headerActionBtn} activeOpacity={0.75} onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color={T.subText} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, T, otherParty, context]);

  const load = useCallback(async (cancelledRef: { current: boolean }): Promise<string | null> => {
    setLoading(true);
    setNotFound(false);
    if (!bookingId) {
      setNotFound(true);
      setLoading(false);
      return null;
    }
    const [bookingResult, messagesResult] = await Promise.all([
      getBookingWithContext(bookingId),
      listMessages(bookingId),
    ]);
    if (cancelledRef.current) return null;

    if (!bookingResult.success || !bookingResult.data) {
      setNotFound(true);
      setLoading(false);
      return null;
    }

    const fetchedMessages = messagesResult.data ?? [];
    const firstUnread = fetchedMessages.find((m) => m.sender_id !== myId && !m.is_read);
    firstUnreadIdRef.current = firstUnread?.id ?? null;

    setContext(bookingResult.data);
    setMessages(fetchedMessages);
    setLoading(false);
    markMessagesRead(bookingId);

    const otherId = myId === bookingResult.data.client_id ? bookingResult.data.worker_id : bookingResult.data.client_id;
    isBlockedWith(otherId).then((result) => {
      if (!cancelledRef.current && result.success) setBlocked(!!result.data);
    });

    return otherId;
  }, [bookingId, myId]);

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      let channel: ReturnType<typeof subscribeToBookingMessages> | null = null;

      load(cancelledRef).then((otherId) => {
        if (cancelledRef.current || !bookingId || otherId === null) return;
        channel = subscribeToBookingMessages(bookingId, (message) => {
          setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
          markMessagesRead(bookingId);
        });
      });

      return () => {
        cancelledRef.current = true;
        if (channel) unsubscribe(channel);
      };
    }, [load, bookingId])
  );

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 150);
  }, [loading]);

  const send = async (text: string) => {
    if (!text.trim() || !bookingId) return;
    setInput('');
    setShowQuick(false);
    const result = await sendMessage(bookingId, text.trim());
    if (result.success && result.data) {
      setMessages((prev) => (prev.some((m) => m.id === result.data!.id) ? prev : [...prev, result.data!]));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } else {
      Alert.alert('Could Not Send', result.error ?? 'Something went wrong sending your message.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (notFound || !context || !myId) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load this conversation"
          body="It may not exist anymore, or the connection dropped — try again."
          actionLabel="Retry"
          onAction={() => load({ current: false })}
          tone="error"
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'center', paddingVertical: 12 }}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[s.menuCard, { backgroundColor: T.card, borderColor: T.border }]}>
            {isClientViewer && (
              <>
                <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={handleViewProfile}>
                  <Ionicons name="person-outline" size={17} color={T.text} />
                  <Text style={[s.menuItemText, { color: T.text }]}>View Profile</Text>
                </TouchableOpacity>
                <View style={[s.menuDivider, { backgroundColor: T.divider }]} />
              </>
            )}
            <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={blocked ? handleUnblock : handleBlock}>
              <Ionicons name="ban-outline" size={17} color={COLORS.danger} />
              <Text style={[s.menuItemText, { color: COLORS.danger }]}>{blocked ? 'Unblock' : 'Block'}</Text>
            </TouchableOpacity>
            <View style={[s.menuDivider, { backgroundColor: T.divider }]} />
            <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={handleReport}>
              <Ionicons name="flag-outline" size={17} color={COLORS.danger} />
              <Text style={[s.menuItemText, { color: COLORS.danger }]}>Report</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setReportVisible(false)}>
          <Pressable style={[s.reportCard, { backgroundColor: T.card, borderColor: T.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[s.reportTitle, { color: T.text }]}>Report {otherParty?.full_name ?? 'this user'}</Text>
            <Text style={[s.reportSub, { color: T.subText }]}>Tell us what happened — our team will review it.</Text>
            <TextInput
              style={[s.reportInput, { borderColor: T.border, backgroundColor: T.inputBg, color: T.text }]}
              placeholder="What's the issue?"
              placeholderTextColor={T.subText}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />
            <View style={s.reportActions}>
              <TouchableOpacity style={s.reportCancelBtn} onPress={() => setReportVisible(false)} activeOpacity={0.7}>
                <Text style={[s.reportCancelText, { color: T.subText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.reportSubmitBtn, { backgroundColor: COLORS.danger }, !reportReason.trim() && { opacity: 0.5 }]}
                onPress={submitReportHandler}
                disabled={!reportReason.trim() || submittingReport}
                activeOpacity={0.85}
              >
                {submittingReport ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.reportSubmitText}>Submit Report</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {context.request && (
        <TouchableOpacity
          style={[s.jobBanner, { backgroundColor: COLORS.primary + '08', borderColor: T.border }]}
          activeOpacity={0.8}
          onPress={handleJobBannerPress}
        >
          <View style={[s.jobBannerIcon, { backgroundColor: T.card }]}>
            <Ionicons name={(CATEGORY_ICON[context.request.category] ?? 'briefcase-outline') as any} size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.jobBannerTitle, { color: T.text }]} numberOfLines={1}>
              {context.request.category.charAt(0).toUpperCase() + context.request.category.slice(1)}
            </Text>
            {!!context.request.description && (
              <Text style={[s.jobBannerDesc, { color: T.subText }]} numberOfLines={1}>{context.request.description}</Text>
            )}
          </View>
          <View style={[s.jobBannerStatusPill, { backgroundColor: statusColor(context.status) + '20' }]}>
            <Text style={[s.jobBannerStatusText, { color: statusColor(context.status) }]}>{statusLabel(context.status)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={T.subText} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const next = messages[index + 1];
            const first = isNewGroup(prev, item);
            const last = !next || isNewGroup(item, next);
            const showDayDivider = !prev || new Date(prev.created_at).toDateString() !== new Date(item.created_at).toDateString();
            const showUnreadDivider = item.id === firstUnreadIdRef.current;
            return (
              <>
                {showDayDivider && <DayDivider iso={item.created_at} T={T} />}
                {showUnreadDivider && <UnreadDivider T={T} />}
                <MessageBubble msg={item} mine={item.sender_id === myId} first={first} last={last} T={T} />
              </>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: 'center' }}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={T.subText + '60'} />
              <Text style={{ color: T.subText, marginTop: 10 }}>No messages yet — say hello!</Text>
            </View>
          }
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {showQuick && messages.length === 0 && (
          <View style={[s.quickWrap, { backgroundColor: T.card, borderColor: T.border }]}>
            {QUICK_REPLIES.map((qr) => (
              <TouchableOpacity key={qr} style={s.quickChip} onPress={() => send(qr)} activeOpacity={0.75}>
                <Text style={s.quickText}>{qr}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {blocked ? (
          <View style={[s.blockedBar, { backgroundColor: T.card, borderColor: T.border }]}>
            <Ionicons name="ban-outline" size={16} color={T.subText} />
            <Text style={[s.blockedText, { color: T.subText }]}>You can&apos;t message this person.</Text>
          </View>
        ) : (
          <View style={[s.inputBar, { backgroundColor: T.card, borderColor: T.border }]}>
            <TextInput
              style={[s.input, { backgroundColor: T.inputBg, color: T.text }]}
              placeholder="Type a message..."
              placeholderTextColor={T.subText}
              value={input}
              onChangeText={(v) => { setInput(v); setShowQuick(false); }}
              multiline
              maxLength={500}
              returnKeyType="default"
            />
            <TouchableOpacity style={[s.sendBtn, input.trim().length === 0 && s.sendBtnDisabled]} onPress={() => send(input)} activeOpacity={0.8} disabled={input.trim().length === 0}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  headerLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerInitials: { fontSize: 13, fontWeight: '800' },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerStatus: { fontSize: 11, marginTop: 1, textTransform: 'capitalize' },
  headerActionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  menuBackdrop: { flex: 1 },
  menuCard: { position: 'absolute', top: 58, right: 12, minWidth: 190, borderRadius: 14, borderWidth: 1, paddingVertical: 4, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  menuItemText: { fontSize: 14, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 12 },

  reportCard: { marginHorizontal: 24, borderRadius: 16, borderWidth: 1, padding: 18, gap: 4 },
  reportTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  reportSub: { fontSize: 12.5, marginBottom: 12 },
  reportInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13.5, minHeight: 80, marginBottom: 14 },
  reportActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  reportCancelBtn: { paddingVertical: 12, paddingHorizontal: 8 },
  reportCancelText: { fontSize: 13.5, fontWeight: '600' },
  reportSubmitBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 130 },
  reportSubmitText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },

  blockedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderTopWidth: 1 },
  blockedText: { fontSize: 13, fontWeight: '600' },

  jobBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  jobBannerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  jobBannerTitle: { fontSize: 13, fontWeight: '700' },
  jobBannerDesc: { fontSize: 11, marginTop: 1 },
  jobBannerStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  jobBannerStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  msgList: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },

  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  quickChip: { borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6 },
  quickText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, maxHeight: 110, lineHeight: 20 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '50' },
});
