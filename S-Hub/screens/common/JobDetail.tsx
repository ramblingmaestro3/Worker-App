import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { getBookingWithContext, advanceBookingStatus, cancelBooking, BookingChatContext, BookingStatus } from '@/lib/api/bookings';
import { getMyReviewForBooking, submitReview, Review } from '@/lib/api/reviews';
import { useAuthStore } from '@/lib/stores/auth-store';
import { s, vs, ms } from '@/lib/scaling';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

const CATEGORY_ICON: Record<string, string> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  painting: 'color-palette-outline',
  cleaning: 'sparkles-outline',
  carpentry: 'hammer-outline',
};

const TIMELINE_STEPS: { key: 'accepted_at' | 'en_route_at' | 'arrived_at' | 'completed_at'; label: string }[] = [
  { key: 'accepted_at', label: 'Accepted' },
  { key: 'en_route_at', label: 'Worker en route' },
  { key: 'arrived_at', label: 'Worker arrived' },
  { key: 'completed_at', label: 'Completed' },
];

/** The worker's next forward step from each status, and the button label that advances it. */
const NEXT_STEP: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  accepted: { status: 'en_route', label: 'Mark En Route' },
  en_route: { status: 'arrived', label: 'Mark Arrived' },
  arrived: { status: 'in_progress', label: 'Start Job' },
  in_progress: { status: 'completed', label: 'Mark Completed' },
};

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function statusLabel(status: BookingStatus): string {
  return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: BookingStatus): string {
  if (status === 'completed') return COLORS.accent;
  if (status === 'cancelled') return COLORS.muted;
  return COLORS.primary;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function JobDetailScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const T = useThemeColors();
  const myId = useAuthStore((state) => state.user?.id ?? null);

  const [context, setContext] = useState<BookingChatContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [myReview, setMyReview] = useState<Review | null>(null);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, headerTitle: 'Job Details' });
  }, [navigation]);

  const load = useCallback(async (cancelledRef?: { current: boolean }) => {
    setLoading(true);
    setNotFound(false);
    const [bookingResult, reviewResult] = await Promise.all([
      getBookingWithContext(bookingId),
      getMyReviewForBooking(bookingId),
    ]);
    if (cancelledRef?.current) return;
    if (!bookingResult.success || !bookingResult.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setContext(bookingResult.data);
    if (reviewResult.success) setMyReview(reviewResult.data ?? null);
    setLoading(false);
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      load(cancelledRef);
      return () => { cancelledRef.current = true; };
    }, [load])
  );

  const handleSubmitReview = async (revieweeId: string) => {
    if (draftRating < 1) return;
    setSubmittingReview(true);
    const result = await submitReview({
      bookingId,
      revieweeId,
      rating: draftRating,
      comment: draftComment,
    });
    setSubmittingReview(false);
    if (!result.success) {
      Alert.alert('Could Not Submit Review', result.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setMyReview({
      id: 'local',
      booking_id: bookingId,
      reviewer_id: myId ?? '',
      reviewee_id: revieweeId,
      rating: draftRating,
      comment: draftComment.trim() || null,
      created_at: new Date().toISOString(),
    });
  };

  const handleAdvance = async (nextStatus: BookingStatus) => {
    setUpdatingStatus(true);
    const result = await advanceBookingStatus(bookingId, nextStatus);
    setUpdatingStatus(false);
    if (!result.success) {
      Alert.alert('Could Not Update Job', result.error ?? 'Something went wrong. Please try again.');
      return;
    }
    load();
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          const result = await cancelBooking(bookingId);
          setCancelling(false);
          if (!result.success) {
            Alert.alert('Could Not Cancel', result.error ?? 'Something went wrong. Please try again.');
            return;
          }
          load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (notFound || !context || !myId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load this job"
          body="It may not exist anymore, or the connection dropped — try again."
          actionLabel="Retry"
          onAction={() => load()}
          tone="error"
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'center', paddingVertical: 12 }}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isClientViewer = myId === context.client_id;
  const otherParty = isClientViewer ? context.worker : context.client;
  const request = context.request;
  const icon = CATEGORY_ICON[request?.category ?? ''] ?? 'briefcase-outline';
  const title = request ? request.category.charAt(0).toUpperCase() + request.category.slice(1) : 'Job';
  const price = context.bid?.counter_price ?? context.bid?.proposed_price;
  const cancelled = context.status === 'cancelled';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Card style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: T.inputBg }]}>
                <Ionicons name={icon as any} size={ms(24)} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: T.text }]}>{title}</Text>
                {!!request?.description && (
                  <Text style={[styles.description, { color: T.subText }]} numberOfLines={3}>{request.description}</Text>
                )}
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor(context.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor(context.status) }]} />
              <Text style={[styles.statusPillText, { color: statusColor(context.status) }]}>{statusLabel(context.status)}</Text>
            </View>
          </Card>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={ms(18)} color={T.subText} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: T.subText }]}>Location</Text>
                <Text style={[styles.infoValue, { color: T.text }]}>{request?.location_string ?? 'Not specified'}</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: T.divider }]} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={ms(18)} color={T.subText} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: T.subText }]}>Scheduled</Text>
                <Text style={[styles.infoValue, { color: T.text }]}>
                  {request?.scheduled_for ? formatDateTime(request.scheduled_for) : 'As soon as possible'}
                </Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: T.divider }]} />
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={ms(18)} color={T.subText} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: T.subText }]}>Price</Text>
                <Text style={[styles.infoValuePrice, cancelled && { textDecorationLine: 'line-through', color: T.subText }]}>
                  {price != null ? `GH₵ ${price}` : '—'}
                </Text>
              </View>
            </View>
          </Card>

          <Text style={[styles.sectionLabel, { color: T.subText }]}>{isClientViewer ? 'Your Worker' : 'Client'}</Text>
          <Card style={styles.partyCard}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.avatarInitials}>{initialsOf(otherParty?.full_name ?? '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.partyName, { color: T.text }]} numberOfLines={1}>{otherParty?.full_name ?? 'Unknown'}</Text>
              <Text style={[styles.partyRole, { color: T.subText }]}>{isClientViewer ? 'Worker' : 'Client'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.messageBtn, { backgroundColor: COLORS.primary }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Chat', { bookingId: context.id })}
              accessibilityRole="button"
              accessibilityLabel="Message"
            >
              <Ionicons name="chatbubble-outline" size={ms(16)} color="#fff" />
            </TouchableOpacity>
          </Card>
          {isClientViewer && (
            <TouchableOpacity
              style={styles.viewProfileRow}
              onPress={() => navigation.navigate('WorkerProfile', { id: context.worker_id, fromBooking: true })}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewProfileText, { color: COLORS.primary }]}>View Worker Profile</Text>
              <Ionicons name="chevron-forward" size={ms(14)} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionLabel, { color: T.subText }]}>Timeline</Text>
          <Card style={styles.timelineCard}>
            {cancelled ? (
              <View style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: COLORS.danger }]} />
                <Text style={[styles.timelineLabel, { color: T.text }]}>Cancelled</Text>
                {!!context.cancelled_at && (
                  <Text style={[styles.timelineTime, { color: T.subText }]}>{formatDate(context.cancelled_at)}</Text>
                )}
              </View>
            ) : (
              TIMELINE_STEPS.map((step) => {
                const reachedAt = context[step.key];
                return (
                  <View key={step.key} style={styles.timelineRow}>
                    <View style={[styles.timelineDot, { backgroundColor: reachedAt ? COLORS.accent : T.border }]} />
                    <Text style={[styles.timelineLabel, { color: reachedAt ? T.text : T.subText }]}>{step.label}</Text>
                    {!!reachedAt && <Text style={[styles.timelineTime, { color: T.subText }]}>{formatDateTime(reachedAt)}</Text>}
                  </View>
                );
              })
            )}
          </Card>

          {!isClientViewer && NEXT_STEP[context.status] && (
            <TouchableOpacity
              style={[styles.advanceBtn, { backgroundColor: COLORS.primary }, updatingStatus && { opacity: 0.7 }]}
              onPress={() => handleAdvance(NEXT_STEP[context.status]!.status)}
              disabled={updatingStatus}
              activeOpacity={0.85}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.advanceBtnText}>{NEXT_STEP[context.status]!.label}</Text>
              )}
            </TouchableOpacity>
          )}

          {isClientViewer && !cancelled && context.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: COLORS.danger }, cancelling && { opacity: 0.7 }]}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.85}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          )}

          {context.status === 'completed' && (
            <>
              <Text style={[styles.sectionLabel, { color: T.subText }]}>
                {isClientViewer ? 'Rate Your Worker' : 'Rate Your Client'}
              </Text>
              <Card style={styles.reviewCard}>
                {myReview ? (
                  <>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons key={n} name={n <= myReview.rating ? 'star' : 'star-outline'} size={ms(20)} color={COLORS.primary} />
                      ))}
                    </View>
                    {!!myReview.comment && (
                      <Text style={[styles.reviewSubmittedComment, { color: T.subText }]}>{myReview.comment}</Text>
                    )}
                    <Text style={[styles.reviewSubmittedNote, { color: T.subText }]}>You reviewed this job</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity key={n} onPress={() => setDraftRating(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                          <Ionicons name={n <= draftRating ? 'star' : 'star-outline'} size={ms(28)} color={COLORS.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={[styles.reviewInput, { borderColor: T.border, backgroundColor: T.inputBg, color: T.text }]}
                      placeholder="Add a comment (optional)"
                      placeholderTextColor={T.subText}
                      value={draftComment}
                      onChangeText={setDraftComment}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    <TouchableOpacity
                      style={[styles.submitReviewBtn, { backgroundColor: COLORS.primary }, draftRating < 1 && { opacity: 0.5 }]}
                      onPress={() => handleSubmitReview(otherParty?.id ?? '')}
                      disabled={draftRating < 1 || submittingReview}
                      activeOpacity={0.85}
                    >
                      {submittingReview ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitReviewText}>Submit Review</Text>}
                    </TouchableOpacity>
                  </>
                )}
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: s(20), paddingBottom: vs(40), alignItems: 'center' },
  content: { width: '100%', maxWidth: s(544) },

  headerCard: { marginTop: vs(16), gap: vs(14) },
  headerRow: { flexDirection: 'row', gap: s(12), alignItems: 'flex-start' },
  iconWrap: { width: s(48), height: s(48), borderRadius: s(14), alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: ms(19), fontWeight: '800', marginBottom: vs(4) },
  description: { fontSize: ms(13.5), lineHeight: ms(19) },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: s(6), alignSelf: 'flex-start', paddingHorizontal: s(12), paddingVertical: vs(6), borderRadius: RADIUS.full },
  statusDot: { width: s(6), height: s(6), borderRadius: s(3) },
  statusPillText: { fontSize: ms(12), fontWeight: '700', textTransform: 'capitalize' },

  infoCard: { marginTop: vs(14) },
  infoRow: { flexDirection: 'row', gap: s(12), alignItems: 'flex-start' },
  infoDivider: { height: 1, marginVertical: vs(12) },
  infoLabel: { fontSize: ms(11), fontWeight: '700', textTransform: 'uppercase', marginBottom: vs(2) },
  infoValue: { fontSize: ms(14.5), fontWeight: '600' },
  infoValuePrice: { fontSize: ms(14.5), fontWeight: '800', color: COLORS.primary },

  sectionLabel: { fontSize: ms(12), fontWeight: '700', textTransform: 'uppercase', marginTop: vs(20), marginBottom: vs(8) },

  partyCard: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  avatar: { width: s(44), height: s(44), borderRadius: s(22), alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: ms(14), fontWeight: '800', color: COLORS.primary },
  partyName: { fontSize: ms(15), fontWeight: '700' },
  partyRole: { fontSize: ms(12), marginTop: vs(1) },
  messageBtn: { width: s(38), height: s(38), borderRadius: s(19), alignItems: 'center', justifyContent: 'center' },

  viewProfileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(4), paddingVertical: vs(10) },
  viewProfileText: { fontSize: ms(13), fontWeight: '700' },

  timelineCard: { gap: vs(14) },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  timelineDot: { width: s(8), height: s(8), borderRadius: s(4) },
  timelineLabel: { flex: 1, fontSize: ms(13.5), fontWeight: '600' },
  timelineTime: { fontSize: ms(11.5) },

  advanceBtn: { marginTop: vs(20), paddingVertical: vs(14), borderRadius: RADIUS.full, alignItems: 'center' },
  advanceBtnText: { color: '#fff', fontSize: ms(14.5), fontWeight: '700' },
  cancelBtn: { marginTop: vs(14), paddingVertical: vs(13), borderRadius: RADIUS.full, alignItems: 'center', borderWidth: 1.5 },
  cancelBtnText: { color: COLORS.danger, fontSize: ms(14), fontWeight: '700' },

  reviewCard: { gap: vs(12), alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: s(6) },
  reviewInput: { width: '100%', borderWidth: 1, borderRadius: s(12), padding: s(12), fontSize: ms(13.5), minHeight: vs(70) },
  submitReviewBtn: { width: '100%', paddingVertical: vs(13), borderRadius: RADIUS.full, alignItems: 'center' },
  submitReviewText: { color: '#fff', fontSize: ms(14), fontWeight: '700' },
  reviewSubmittedComment: { fontSize: ms(13), textAlign: 'center', lineHeight: ms(19) },
  reviewSubmittedNote: { fontSize: ms(12), fontWeight: '600' },
});
