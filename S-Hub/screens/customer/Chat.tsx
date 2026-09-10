/**
 * Booking-scoped 1:1 chat (the only place message bubbles render). Bubble side is
 * decided purely by sender_id === myId, never a role assumption. Header has a
 * tap-to-call button and a kebab (view profile / block / report). Realtime via
 * subscribeToBookingMessages.
 */
import { COLORS } from '@/constants/theme';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { useAppTheme, useThemeColors } from '@/contexts/ThemeContext';
import EmptyState from '@/components/ui/EmptyState';
import { getBookingWithContext, getBookingContactPhone, BookingChatContext } from '@/lib/api/bookings';
import { blockUser, unblockUser, isBlockedWith } from '@/lib/api/blocking';
import { submitReport } from '@/lib/api/reports';
import { listMessages, sendMessage, markMessagesRead, Message } from '@/lib/api/messages';
import { subscribeToBookingMessages, unsubscribe } from '@/lib/api/realtime';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUnreadStore } from '@/lib/stores/unread-store';
import type { RootStackParamList } from '@/navigation/types';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

// React Navigation renders every screen inside a centred column capped at this
// width (navigation/RootNavigator.tsx APP_MAX_WIDTH). A <Modal> portals to the
// raw window root, *outside* that column, so absolutely-positioned modal content
// drifts to the window edge on wide web/tablet windows unless it re-applies the
// cap. The kebab menu sidesteps this entirely by anchoring to the button's
// measured position instead.
const APP_MAX_WIDTH = 540;

/**
 * WhatsApp-style chat palette. The header green stays the AdwumaGo brand green
 * (near-identical to WhatsApp's #008069); everything else — the doodle-tinted
 * background, the pale-green outgoing bubble, white incoming bubble, blue read
 * ticks, the rounded input pill — mirrors WhatsApp.
 */
function waColors(isDark: boolean) {
  return {
    header: isDark ? '#1F2C34' : COLORS.primary,
    headerText: '#FFFFFF',
    headerSub: 'rgba(255,255,255,0.72)',
    // Slightly translucent so the app's tiled tool wallpaper still ghosts
    // through, the way WhatsApp's own doodle wallpaper does.
    bgWash: isDark ? 'rgba(11,20,26,0.92)' : 'rgba(233,223,211,0.92)',
    out: isDark ? '#005C4B' : '#DCF8C6',
    in: isDark ? '#1F2C34' : '#FFFFFF',
    bubbleText: isDark ? '#E9EDEF' : '#111B21',
    meta: isDark ? '#8FA1AC' : '#667781',
    tick: '#53BDEB',
    datePill: isDark ? '#1D282F' : '#FFFFFF',
    dateText: isDark ? '#9FB0BA' : '#54656F',
    inputPill: isDark ? '#2A3942' : '#FFFFFF',
    inputText: isDark ? '#E9EDEF' : '#111B21',
    inputIcon: isDark ? '#8696A0' : '#8A9AA3',
    send: COLORS.primary,
  };
}

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
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

function DayDivider({ iso, wa }: { iso: string; wa: ReturnType<typeof waColors> }) {
  return (
    <View style={dd.wrap}>
      <View style={[dd.pill, { backgroundColor: wa.datePill }]}>
        <Text style={[dd.text, { color: wa.dateText }]}>{formatDayLabel(iso).toUpperCase()}</Text>
      </View>
    </View>
  );
}
const dd = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 12 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

/** Marks where this viewing session's unread messages begin — shown once per chat open, based on each message's read state at load time. */
function UnreadDivider({ wa }: { wa: ReturnType<typeof waColors> }) {
  return (
    <View style={[ud.wrap, { backgroundColor: wa.datePill }]}>
      <Text style={[ud.text, { color: wa.meta }]}>UNREAD MESSAGES</Text>
    </View>
  );
}
const ud = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 6, marginVertical: 8 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
});

function MessageBubble({
  msg,
  mine,
  first,
  last,
  wa,
}: {
  msg: Message;
  mine: boolean;
  first: boolean;
  last: boolean;
  wa: ReturnType<typeof waColors>;
}) {
  const bubbleColor = mine ? wa.out : wa.in;
  // WhatsApp only draws the little tail on the first bubble of a run; the rest
  // are fully rounded on the tail side.
  const R = 8;
  const cornerStyle = mine
    ? { borderTopRightRadius: first ? 2 : R }
    : { borderTopLeftRadius: first ? 2 : R };

  return (
    <View style={[mb.row, mine ? mb.rowMine : mb.rowTheirs, { marginBottom: last ? 8 : 2, marginTop: first ? 6 : 0 }]}>
      {first && (
        <View style={[mb.tail, mine ? mb.tailMine : mb.tailTheirs, { borderTopColor: bubbleColor }]} />
      )}
      <View style={[mb.bubble, cornerStyle, { backgroundColor: bubbleColor }]}>
        <Text style={[mb.text, { color: wa.bubbleText }]}>
          {msg.message_text}
          {/* Transparent spacer reserves room on the last text line so the
              absolutely-positioned time/ticks never overlap the words —
              WhatsApp's own inline-timestamp trick. */}
          <Text style={mb.spacer}>{mine ? '     ' : '   '}</Text>
        </Text>
        <View style={mb.metaRow}>
          <Text style={[mb.time, { color: wa.meta }]}>{formatTime(msg.created_at)}</Text>
          {mine && (
            <Ionicons
              name={msg.is_read ? 'checkmark-done' : 'checkmark'}
              size={15}
              color={msg.is_read ? wa.tick : wa.meta}
              style={{ marginLeft: 2 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const mb = StyleSheet.create({
  row: { maxWidth: '82%', flexDirection: 'row' },
  rowMine: { alignSelf: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingTop: 6,
    paddingBottom: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.13,
    shadowRadius: 0.6,
    elevation: 1,
  },
  text: { fontSize: 14.5, lineHeight: 20 },
  spacer: { fontSize: 14.5 },
  metaRow: { position: 'absolute', right: 8, bottom: 6, flexDirection: 'row', alignItems: 'center' },
  time: { fontSize: 11 },
  // Tail: a small triangle butting against the top corner of the first bubble
  // in a run — the colored top border is the fill, the side border is clear.
  tail: { position: 'absolute', top: 0, width: 0, height: 0, borderTopWidth: 10, borderStyle: 'solid' },
  tailTheirs: { left: -7, borderLeftWidth: 9, borderLeftColor: 'transparent' },
  tailMine: { right: -7, borderRightWidth: 9, borderRightColor: 'transparent' },
});

const QUICK_REPLIES = ['On my way!', 'What time?', 'Sounds good', 'Can we reschedule?'];

export default function ChatScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const T = useThemeColors();
  const { isDark } = useAppTheme();
  const wa = waColors(isDark);
  const insets = useSafeAreaInsets();

  const myId = useAuthStore((s) => s.user?.id ?? null);
  const [context, setContext] = useState<BookingChatContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  // Screen-coordinate anchor for the kebab dropdown, measured off the button
  // when it's tapped. Null until the first open (falls back to the header-corner
  // offsets in s.menuCard).
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<View>(null);
  const [blocked, setBlocked] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [calling, setCalling] = useState(false);
  const listRef = useRef<FlatList>(null);
  const firstUnreadIdRef = useRef<string | null>(null);

  const isClientViewer = myId != null && context != null && myId === context.client_id;
  const otherParty = context ? (isClientViewer ? context.worker : context.client) : null;

  const openMenu = () => {
    const node = menuBtnRef.current;
    if (!node) {
      setMenuVisible(true);
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      const winW = Dimensions.get('window').width;
      // Right-align the menu's edge to the button's edge, drop it just below.
      setMenuAnchor({ top: y + h + 6, right: Math.max(8, winW - (x + w)) });
      setMenuVisible(true);
    });
  };

  const handleViewProfile = () => {
    setMenuVisible(false);
    if (context) navigation.navigate('WorkerProfile', { id: context.worker_id, fromBooking: true });
  };

  const handleCall = async () => {
    if (calling || !bookingId) return;
    setCalling(true);
    const result = await getBookingContactPhone(bookingId);
    setCalling(false);
    if (!result.success) {
      Alert.alert('Could Not Get Number', result.error ?? 'Please try again.');
      return;
    }
    const phone = (result.data ?? '').replace(/[^\d+]/g, '');
    if (!phone) {
      Alert.alert('No Phone Number', "There's no phone number on file for this person.");
      return;
    }
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (!canOpen) {
      Alert.alert('Cannot Call', "This device can't place phone calls.");
      return;
    }
    Linking.openURL(url);
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
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const chatHeader = (
    <View style={[s.chatHeader, { backgroundColor: wa.header }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} activeOpacity={0.7} style={s.headerBack}>
        <Ionicons name="arrow-back" size={24} color={wa.headerText} />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.headerIdentity}
        activeOpacity={0.7}
        onPress={handleJobBannerPress}
      >
        <View style={[s.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          {otherParty?.avatar_url ? (
            <Image source={{ uri: otherParty.avatar_url }} style={s.headerAvatarImg} />
          ) : (
            <Text style={[s.headerInitials, { color: wa.headerText }]}>
              {initialsOf(otherParty?.full_name ?? '?')}
            </Text>
          )}
        </View>
        <View style={s.headerTextGroup}>
          <Text style={[s.headerName, { color: wa.headerText }]} numberOfLines={1}>
            {otherParty?.full_name ?? 'Unknown'}
          </Text>
          {context && (
            <Text style={[s.headerStatus, { color: wa.headerSub }]} numberOfLines={1}>
              {statusLabel(context.status)} · tap here for job info
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={s.headerActionBtn} activeOpacity={0.6} onPress={handleCall} disabled={calling}>
        {calling ? (
          <ActivityIndicator size="small" color={wa.headerText} />
        ) : (
          <Ionicons name="call" size={20} color={wa.headerText} />
        )}
      </TouchableOpacity>
      <View ref={menuBtnRef} collapsable={false}>
        <TouchableOpacity style={s.headerActionBtn} activeOpacity={0.6} onPress={openMenu}>
          <Ionicons name="ellipsis-vertical" size={20} color={wa.headerText} />
        </TouchableOpacity>
      </View>
    </View>
  );

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
    markMessagesRead(bookingId).then(() => useUnreadStore.getState().refreshMessages());

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
          markMessagesRead(bookingId).then(() => useUnreadStore.getState().refreshMessages());
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
      <SafeAreaView style={[s.safe, { backgroundColor: wa.header }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={wa.header} />
        {chatHeader}
        <View style={[s.body, { backgroundColor: wa.bgWash, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !context || !myId) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: wa.header }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={wa.header} />
        {chatHeader}
        <View style={[s.body, { backgroundColor: wa.bgWash }]}>
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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: wa.header }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={wa.header} />
      {chatHeader}
      <View style={[s.body, { backgroundColor: wa.bgWash }]}>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              s.menuCard,
              menuAnchor && { top: menuAnchor.top, right: menuAnchor.right },
              { backgroundColor: T.card, borderColor: T.border },
            ]}
          >
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
          <View style={s.modalColumn} pointerEvents="box-none">
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
          </View>
        </Pressable>
      </Modal>

      {context.request && (
        <TouchableOpacity
          style={[s.jobBanner, { backgroundColor: wa.datePill }]}
          activeOpacity={0.8}
          onPress={handleJobBannerPress}
        >
          <View style={[s.jobBannerIcon, { backgroundColor: COLORS.primary + '18' }]}>
            <Ionicons name={categoryIcon(context.request.category) as any} size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.jobBannerTitle, { color: wa.bubbleText }]} numberOfLines={1}>
              {categoryLabel(context.request.category)}
            </Text>
            {!!context.request.description && (
              <Text style={[s.jobBannerDesc, { color: wa.meta }]} numberOfLines={1}>{context.request.description}</Text>
            )}
          </View>
          <View style={[s.jobBannerStatusPill, { backgroundColor: statusColor(context.status) + '20' }]}>
            <Text style={[s.jobBannerStatusText, { color: statusColor(context.status) }]}>{statusLabel(context.status)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={wa.meta} />
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
                {showDayDivider && <DayDivider iso={item.created_at} wa={wa} />}
                {showUnreadDivider && <UnreadDivider wa={wa} />}
                <MessageBubble msg={item} mine={item.sender_id === myId} first={first} last={last} wa={wa} />
              </>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <View style={[s.emptyChatPill, { backgroundColor: wa.datePill }]}>
                <Ionicons name="lock-closed" size={12} color={wa.meta} />
                <Text style={[s.emptyChatText, { color: wa.meta }]}>
                  Messages are between you and {otherParty?.full_name?.split(' ')[0] ?? 'this person'}. Say hello!
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {showQuick && messages.length === 0 && (
          <View style={s.quickWrap}>
            {QUICK_REPLIES.map((qr) => (
              <TouchableOpacity key={qr} style={[s.quickChip, { backgroundColor: wa.datePill }]} onPress={() => send(qr)} activeOpacity={0.75}>
                <Text style={[s.quickText, { color: COLORS.primary }]}>{qr}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {blocked ? (
          <View style={[s.blockedBar, { paddingBottom: 14 + insets.bottom }]}>
            <Ionicons name="ban-outline" size={16} color={wa.meta} />
            <Text style={[s.blockedText, { color: wa.meta }]}>You can&apos;t message this person.</Text>
          </View>
        ) : (
          <View style={[s.inputBar, { paddingBottom: 6 + insets.bottom }]}>
            <View style={[s.inputPill, { backgroundColor: wa.inputPill }]}>
              <Ionicons name="happy-outline" size={22} color={wa.inputIcon} style={s.inputEmoji} />
              <TextInput
                style={[s.input, { color: wa.inputText }]}
                placeholder="Message"
                placeholderTextColor={wa.inputIcon}
                value={input}
                onChangeText={(v) => { setInput(v); setShowQuick(false); }}
                multiline
                maxLength={500}
                returnKeyType="default"
              />
            </View>
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: wa.send }, input.trim().length === 0 && s.sendBtnDisabled]}
              onPress={() => send(input)}
              activeOpacity={0.8}
              disabled={input.trim().length === 0}
            >
              <Ionicons name="send" size={19} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },

  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 7, minHeight: 56 },
  headerBack: { paddingHorizontal: 8, paddingVertical: 4 },
  headerIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  headerTextGroup: { flex: 1 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerAvatarImg: { width: '100%', height: '100%' },
  headerInitials: { fontSize: 14, fontWeight: '800' },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 12, marginTop: 1 },
  headerActionBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },

  menuBackdrop: { flex: 1 },
  // Re-caps <Modal> content to the same centred column every screen sits in, so
  // dialogs don't stretch to the window edge on wide web/tablet windows.
  modalColumn: { flex: 1, width: '100%', maxWidth: APP_MAX_WIDTH, alignSelf: 'center' },
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

  blockedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 14 },
  blockedText: { fontSize: 13, fontWeight: '600' },

  jobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  jobBannerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  jobBannerTitle: { fontSize: 13, fontWeight: '700' },
  jobBannerDesc: { fontSize: 11, marginTop: 1 },
  jobBannerStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  jobBannerStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  msgList: { paddingHorizontal: 8, paddingBottom: 10, paddingTop: 6, flexGrow: 1 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingHorizontal: 30 },
  emptyChatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  emptyChatText: { fontSize: 12.5, flexShrink: 1, textAlign: 'center' },

  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  quickChip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
    elevation: 1,
  },
  quickText: { fontSize: 12.5, fontWeight: '600' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 6, gap: 7 },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: 12,
    paddingRight: 14,
    minHeight: 46,
  },
  inputEmoji: { marginBottom: 11 },
  input: { flex: 1, paddingHorizontal: 8, paddingVertical: 11, fontSize: 15.5, maxHeight: 110, lineHeight: 20 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.55 },
});
