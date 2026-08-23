import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { getBookingWithContext, BookingChatContext } from '@/lib/api/bookings';
import { listMessages, sendMessage, markMessagesRead, Message } from '@/lib/api/messages';
import { subscribeToBookingMessages, unsubscribe } from '@/lib/api/realtime';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg, mine, T }: { msg: Message; mine: boolean; T: any }) {
  return (
    <View style={[mb.wrap, mine ? mb.mine : mb.theirs]}>
      <View style={[mb.bubble, mine ? mb.bubbleMine : [mb.bubbleTheirs, { backgroundColor: T.card, borderColor: T.border }]]}>
        <Text style={[mb.text, mine ? mb.textMine : [mb.textTheirs, { color: T.text }]]}>{msg.message_text}</Text>
      </View>
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
    </View>
  );
}

const mb = StyleSheet.create({
  wrap: { marginBottom: 10, maxWidth: '80%' },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4, borderWidth: 1 },
  text: { fontSize: 14, lineHeight: 21 },
  textMine: { color: '#fff' },
  textTheirs: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 4 },
  time: { fontSize: 10 },
});

const QUICK_REPLIES = ['On my way!', 'What time?', 'Sounds good', 'Can we reschedule?'];

export default function ChatScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const T = useThemeColors();

  const [myId, setMyId] = useState<string | null>(null);
  const [context, setContext] = useState<BookingChatContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let channel: ReturnType<typeof subscribeToBookingMessages> | null = null;

      (async () => {
        if (!bookingId) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const [auth, bookingResult, messagesResult] = await Promise.all([
          supabase.auth.getUser(),
          getBookingWithContext(bookingId),
          listMessages(bookingId),
        ]);
        if (cancelled) return;

        if (!bookingResult.success || !bookingResult.data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setMyId(auth.data.user?.id ?? null);
        setContext(bookingResult.data);
        setMessages(messagesResult.data ?? []);
        setLoading(false);
        markMessagesRead(bookingId);

        channel = subscribeToBookingMessages(bookingId, (message) => {
          setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
          markMessagesRead(bookingId);
        });
      })();

      return () => {
        cancelled = true;
        if (channel) unsubscribe(channel);
      };
    }, [bookingId])
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
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (notFound || !context || !myId) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'bottom']}>
        <Text style={{ color: T.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>Conversation not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isClientViewer = myId === context.client_id;
  const otherParty = isClientViewer ? context.worker : context.client;
  const otherColor = COLORS.accent;

  const handleViewProfile = () => {
    setMenuVisible(false);
    router.push(`/worker-profile?id=${context.worker_id}` as any);
  };

  const handleJobBannerPress = () => {
    router.push((isClientViewer ? '/bookings' : '/worker-jobs') as any);
  };

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert(`Block ${otherParty?.full_name ?? 'this user'}?`, 'They will no longer be able to message or contact you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert(`Report ${otherParty?.full_name ?? 'this user'}`, 'Our team will review this conversation. Are you sure you want to report this user?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => Alert.alert('Reported', "Thanks — our team will look into this within 24 hours.") },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.headerInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>

          <View style={[s.headerAvatar, { backgroundColor: otherColor + '20' }]}>
            <Text style={[s.headerInitials, { color: otherColor }]}>{initialsOf(otherParty?.full_name ?? '?')}</Text>
          </View>

          <View style={s.headerInfo}>
            <Text style={[s.headerName, { color: T.text }]} numberOfLines={1}>{otherParty?.full_name ?? 'Unknown'}</Text>
            <Text style={[s.headerStatus, { color: T.subText }]}>{context.status.replace('_', ' ')}</Text>
          </View>

          <TouchableOpacity style={s.headerActionBtn} activeOpacity={0.75} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color={T.subText} />
          </TouchableOpacity>
        </ScreenContent>
      </View>

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
            <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={17} color={COLORS.danger} />
              <Text style={[s.menuItemText, { color: COLORS.danger }]}>Block</Text>
            </TouchableOpacity>
            <View style={[s.menuDivider, { backgroundColor: T.divider }]} />
            <TouchableOpacity style={s.menuItem} activeOpacity={0.7} onPress={handleReport}>
              <Ionicons name="flag-outline" size={17} color={COLORS.danger} />
              <Text style={[s.menuItemText, { color: COLORS.danger }]}>Report</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {context.request && (
        <TouchableOpacity style={[s.jobBanner, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '25' }]} activeOpacity={0.8} onPress={handleJobBannerPress}>
          <Text style={s.jobBannerText} numberOfLines={1}>
            {context.request.category.charAt(0).toUpperCase() + context.request.category.slice(1)}
            {context.request.description ? ` · ${context.request.description}` : ''}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble msg={item} mine={item.sender_id === myId} T={T} />}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: { paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerInitials: { fontSize: 15, fontWeight: '800' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerStatus: { fontSize: 11, marginTop: 1, textTransform: 'capitalize' },
  headerActionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  menuBackdrop: { flex: 1 },
  menuCard: { position: 'absolute', top: 58, right: 12, minWidth: 190, borderRadius: 14, borderWidth: 1, paddingVertical: 4, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  menuItemText: { fontSize: 14, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 12 },

  jobBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1 },
  jobBannerText: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  msgList: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },

  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  quickChip: { borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6 },
  quickText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, maxHeight: 110, lineHeight: 20 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '50' },
});
