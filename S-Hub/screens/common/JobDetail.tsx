/**
 * The full view of one booking, shared by client and worker (role-aware via
 * myId === context.client_id). A status band up top, the job facts, the other
 * party with call/message, a progress timeline, the worker's advance-status
 * action, the client's cancel link, and the post-completion review form.
 */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import {
  getBookingWithContext,
  getBookingContactPhone,
  advanceBookingStatus,
  cancelBooking,
  BookingChatContext,
  BookingStatus,
} from '@/lib/api/bookings';
import { subscribeToBooking, unsubscribe } from '@/lib/api/realtime';
import { getMyReviewForBooking, submitReview, Review } from '@/lib/api/reviews';
import { openInMaps, hasMappableLocation } from '@/lib/openInMaps';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { useAuthStore } from '@/lib/stores/auth-store';
import { s, vs, ms } from '@/lib/scaling';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;
type ThemeColors = ReturnType<typeof useThemeColors>;

const TIMELINE_STEPS: { key: 'accepted_at' | 'en_route_at' | 'arrived_at' | 'completed_at'; label: string }[] = [
  { key: 'accepted_at', label: 'Booking accepted' },
  { key: 'en_route_at', label: 'Worker en route' },
  { key: 'arrived_at', label: 'Worker arrived' },
  { key: 'completed_at', label: 'Job completed' },
];

/** Client-facing copy for the "live" phases of a booking. */
const LIVE_STATUS: Partial<Record<BookingStatus, { icon: string; title: string; body: (name: string) => string }>> = {
  en_route: { icon: 'navigate', title: 'Your worker is on the way', body: (n) => `${n} is heading to your location now.` },
  arrived: { icon: 'location', title: 'Your worker has arrived', body: (n) => `${n} is at your location.` },
  in_progress: { icon: 'construct', title: 'Work is underway', body: () => 'The job is currently in progress.' },
};

/** The worker's next forward step from each status, and its button label. */
const NEXT_STEP: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  accepted: { status: 'en_route', label: 'Mark en route' },
  en_route: { status: 'arrived', label: 'Mark arrived' },
  arrived: { status: 'in_progress', label: 'Start job' },
  in_progress: { status: 'completed', label: 'Mark completed' },
};

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Status band styling — colour is carried by the icon + tint; text stays ink for contrast. */
function statusBand(
  status: BookingStatus,
  isClientViewer: boolean,
  otherName: string,
  T: ThemeColors
): { accent: string; bg: string; icon: string; title: string; note: string | null } {
  const live = isClientViewer ? LIVE_STATUS[status] : undefined;
  if (status === 'completed') {
    return { accent: COLORS.accentDark, bg: '#FBF3D3', icon: 'checkmark-circle', title: 'Job completed', note: null };
  }
  if (status === 'cancelled') {
    return { accent: COLORS.muted, bg: T.inputBg, icon: 'close-circle', title: 'Booking cancelled', note: null };
  }
  if (live) {
    return { accent: COLORS.primary, bg: COLORS.primaryLight, icon: live.icon, title: live.title, note: live.body(otherName) };
  }
  return {
    accent: COLORS.primary,
    bg: COLORS.primaryLight,
    icon: 'checkmark-circle',
    title: 'Booking confirmed',
    note: isClientViewer ? 'Waiting for the worker to set off.' : 'Head to the client when you\'re ready.',
  };
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
  const [calling, setCalling] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleCall = async () => {
    if (calling) return;
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

  const load = useCallback(
    async (cancelledRef?: { current: boolean }, silent = false) => {
      if (!silent) setLoading(true);
      setNotFound(false);
      const [bookingResult, reviewResult] = await Promise.all([
        getBookingWithContext(bookingId),
        getMyReviewForBooking(bookingId),
      ]);
      if (cancelledRef?.current) return;
      if (!bookingResult.success || !bookingResult.data) {
        if (!silent) setNotFound(true);
        setLoading(false);
        return;
      }
      setContext(bookingResult.data);
      if (reviewResult.success) setMyReview(reviewResult.data ?? null);
      setLoading(false);
    },
    [bookingId]
  );

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      load(cancelledRef);
      const channel = subscribeToBooking(bookingId, () => load(cancelledRef, true));
      return () => {
        cancelledRef.current = true;
        unsubscribe(channel);
      };
    }, [load, bookingId])
  );

  const handleSubmitReview = async (revieweeId: string) => {
    if (draftRating < 1) return;
    setSubmittingReview(true);
    const result = await submitReview({ bookingId, revieweeId, rating: draftRating, comment: draftComment });
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
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel it',
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

  const shell = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} />
      <ScreenHeader title="Job Details" onBack={() => navigation.goBack()} />
      {children}
    </SafeAreaView>
  );

  if (loading) {
    return shell(
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (notFound || !context || !myId) {
    return shell(
      <View style={styles.content}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load this job"
          body="It may not exist anymore, or the connection dropped — try again."
          actionLabel="Retry"
          onAction={() => load()}
          tone="error"
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isClientViewer = myId === context.client_id;
  const otherParty = isClientViewer ? context.worker : context.client;
  const otherName = otherParty?.full_name ?? (isClientViewer ? 'Your worker' : 'The client');
  const request = context.request;
  const icon = categoryIcon(request?.category);
  const title = categoryLabel(request?.category);
  const price = context.bid?.counter_price ?? context.bid?.proposed_price;
  const cancelled = context.status === 'cancelled';
  const band = statusBand(context.status, isClientViewer, otherName, T);

  const mapsTarget = { latitude: request?.latitude, longitude: request?.longitude, label: request?.location_string };
  const canOpenMaps = hasMappableLocation(mapsTarget);

  const reachedIndex = TIMELINE_STEPS.reduce((acc, step, i) => (context[step.key] ? i : acc), -1);

  return shell(
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* ── Status band ── */}
        <View style={[styles.band, { backgroundColor: band.bg }]}>
          <Ionicons name={band.icon as any} size={ms(20)} color={band.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bandTitle, { color: T.text }]}>{band.title}</Text>
            {band.note && <Text style={[styles.bandNote, { color: T.subText }]}>{band.note}</Text>}
          </View>
        </View>

        {/* ── Job facts ── */}
        <Card style={styles.jobCard}>
          <View style={styles.jobHead}>
            <View style={[styles.iconWrap, { backgroundColor: T.inputBg }]}>
              <Ionicons name={icon as any} size={ms(22)} color={COLORS.primary} />
            </View>
            <Text style={[styles.jobTitle, { color: T.text }]}>{title}</Text>
          </View>

          {!!request?.description && (
            <Text style={[styles.jobDesc, { color: T.text }]}>{request.description}</Text>
          )}

          <View style={[styles.factDivider, { backgroundColor: T.divider }]} />

          {canOpenMaps ? (
            <TouchableOpacity
              style={styles.factRow}
              onPress={() => openInMaps(mapsTarget)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open job location in maps"
            >
              <Ionicons name="location-outline" size={ms(17)} color={COLORS.primary} />
              <View style={styles.factText}>
                <Text style={[styles.factLabel, { color: T.subText }]}>Location</Text>
                <Text style={[styles.factValue, { color: COLORS.primary }]} numberOfLines={2}>
                  {request?.location_string ?? 'Open in Maps'}
                </Text>
              </View>
              <View style={styles.factAction}>
                <Ionicons name="navigate-outline" size={ms(13)} color={COLORS.primary} />
                <Text style={styles.factActionText}>Directions</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.factRow}>
              <Ionicons name="location-outline" size={ms(17)} color={T.subText} />
              <View style={styles.factText}>
                <Text style={[styles.factLabel, { color: T.subText }]}>Location</Text>
                <Text style={[styles.factValue, { color: T.text }]}>{request?.location_string ?? 'Not specified'}</Text>
              </View>
            </View>
          )}

          <View style={styles.factRow}>
            <Ionicons name="calendar-outline" size={ms(17)} color={T.subText} />
            <View style={styles.factText}>
              <Text style={[styles.factLabel, { color: T.subText }]}>Scheduled</Text>
              <Text style={[styles.factValue, { color: T.text }]}>
                {request?.scheduled_for ? formatDateTime(request.scheduled_for) : 'As soon as possible'}
              </Text>
            </View>
          </View>

          <View style={styles.factRow}>
            <Ionicons name="cash-outline" size={ms(17)} color={T.subText} />
            <View style={styles.factText}>
              <Text style={[styles.factLabel, { color: T.subText }]}>Agreed price</Text>
              <Text style={[styles.factPrice, cancelled && styles.factPriceStruck]}>
                {price != null ? `GH₵ ${price}` : '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── The other party ── */}
        <Card style={styles.partyCard}>
          <View style={styles.partyRow}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.avatarInitials}>{initialsOf(otherName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.partyName, { color: T.text }]} numberOfLines={1}>{otherName}</Text>
              <Text style={[styles.partyRole, { color: T.subText }]}>{isClientViewer ? 'Worker on this job' : 'Client'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: T.border }]}
              activeOpacity={0.8}
              onPress={handleCall}
              disabled={calling}
              accessibilityRole="button"
              accessibilityLabel={`Call ${otherName}`}
            >
              {calling ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="call-outline" size={ms(17)} color={COLORS.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconBtnFilled]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Chat', { bookingId: context.id })}
              accessibilityRole="button"
              accessibilityLabel={`Message ${otherName}`}
            >
              <Ionicons name="chatbubble-outline" size={ms(17)} color="#fff" />
            </TouchableOpacity>
          </View>

          {isClientViewer && (
            <>
              <View style={[styles.factDivider, { backgroundColor: T.divider }]} />
              <TouchableOpacity
                style={styles.profileRow}
                onPress={() => navigation.navigate('WorkerProfile', { id: context.worker_id, fromBooking: true })}
                activeOpacity={0.7}
              >
                <Text style={styles.profileRowText}>View full worker profile</Text>
                <Ionicons name="chevron-forward" size={ms(15)} color={COLORS.primary} />
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* ── Progress ── */}
        <Card>
          <Text style={[styles.cardTitle, { color: T.text, marginBottom: vs(10) }]}>Progress</Text>
          {cancelled ? (
            <View style={styles.tlRow}>
              <View style={styles.tlGutter}>
                <View style={[styles.tlDot, { backgroundColor: COLORS.danger, borderColor: COLORS.danger }]} />
              </View>
              <View style={styles.tlBody}>
                <Text style={[styles.tlLabel, { color: T.text, fontWeight: '700' }]}>Cancelled</Text>
                {!!context.cancelled_at && (
                  <Text style={[styles.tlTime, { color: T.subText }]}>{formatDateTime(context.cancelled_at)}</Text>
                )}
              </View>
            </View>
          ) : (
            TIMELINE_STEPS.map((step, i) => {
              const reachedAt = context[step.key];
              const reached = !!reachedAt;
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <View key={step.key} style={styles.tlRow}>
                  <View style={styles.tlGutter}>
                    <View
                      style={[
                        styles.tlDot,
                        {
                          backgroundColor: reached ? COLORS.primary : T.card,
                          borderColor: reached ? COLORS.primary : T.border,
                        },
                      ]}
                    />
                    {!isLast && (
                      <View style={[styles.tlLine, { backgroundColor: i < reachedIndex ? COLORS.primary : T.border }]} />
                    )}
                  </View>
                  <View style={[styles.tlBody, isLast && { paddingBottom: 0 }]}>
                    <Text style={[styles.tlLabel, { color: reached ? T.text : T.subText, fontWeight: reached ? '700' : '600' }]}>
                      {step.label}
                    </Text>
                    {reachedAt && <Text style={[styles.tlTime, { color: T.subText }]}>{formatDateTime(reachedAt)}</Text>}
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* ── Worker action ── */}
        {!isClientViewer && NEXT_STEP[context.status] && (
          <Button
            label={NEXT_STEP[context.status]!.label}
            loading={updatingStatus}
            onPress={() => handleAdvance(NEXT_STEP[context.status]!.status)}
          />
        )}

        {/* ── Review ── */}
        {context.status === 'completed' && (
          <Card style={styles.reviewCard}>
            <Text style={[styles.cardTitle, { color: T.text }]}>
              {isClientViewer ? 'Rate your worker' : 'Rate your client'}
            </Text>
            {myReview ? (
              <View style={styles.reviewDone}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons key={n} name={n <= myReview.rating ? 'star' : 'star-outline'} size={ms(19)} color={COLORS.star} />
                  ))}
                </View>
                {!!myReview.comment && (
                  <Text style={[styles.reviewSubmittedComment, { color: T.subText }]}>&ldquo;{myReview.comment}&rdquo;</Text>
                )}
                <Text style={[styles.reviewSubmittedNote, { color: T.subText }]}>Thanks — your review is in.</Text>
              </View>
            ) : (
              <>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setDraftRating(n)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      <Ionicons name={n <= draftRating ? 'star' : 'star-outline'} size={ms(30)} color={COLORS.star} />
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
                <Button
                  label="Submit review"
                  disabled={draftRating < 1}
                  loading={submittingReview}
                  onPress={() => handleSubmitReview(otherParty?.id ?? '')}
                />
              </>
            )}
          </Card>
        )}

        {/* ── Client cancel (tertiary, destructive) ── */}
        {isClientViewer && !cancelled && context.status !== 'completed' && (
          <TouchableOpacity
            style={styles.cancelLink}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.7}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <Text style={styles.cancelLinkText}>Cancel this booking</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: s(20), paddingTop: vs(16), paddingBottom: vs(40), alignItems: 'center' },
  content: { width: '100%', maxWidth: s(544), gap: vs(14) },

  backLink: { alignSelf: 'center', paddingVertical: vs(12) },
  backLinkText: { fontSize: ms(14), fontWeight: '700', color: COLORS.primary },

  /* Status band */
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    borderRadius: RADIUS.lg,
    paddingVertical: vs(13),
    paddingHorizontal: s(15),
  },
  bandTitle: { fontSize: ms(14.5), fontWeight: '800' },
  bandNote: { fontSize: ms(12.5), lineHeight: ms(17), marginTop: vs(2) },

  /* Job facts card */
  jobCard: { gap: vs(12) },
  jobHead: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  iconWrap: { width: s(44), height: s(44), borderRadius: s(13), alignItems: 'center', justifyContent: 'center' },
  jobTitle: { flex: 1, fontSize: ms(18), fontWeight: '800', letterSpacing: -0.3 },
  jobDesc: { fontSize: ms(13.5), lineHeight: ms(20) },
  factDivider: { height: 1 },
  factRow: { flexDirection: 'row', gap: s(12), alignItems: 'center' },
  factText: { flex: 1 },
  factLabel: { fontSize: ms(11.5), fontWeight: '600', marginBottom: vs(1) },
  factValue: { fontSize: ms(14), fontWeight: '600' },
  factPrice: { fontSize: ms(15), fontWeight: '800', color: COLORS.primary },
  factPriceStruck: { textDecorationLine: 'line-through', color: COLORS.muted },
  factAction: { alignItems: 'center', flexDirection: 'row', gap: s(3) },
  factActionText: { fontSize: ms(12), fontWeight: '700', color: COLORS.primary },

  /* Party card */
  partyCard: { gap: vs(12) },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  avatar: { width: s(46), height: s(46), borderRadius: s(23), alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: ms(15), fontWeight: '800', color: COLORS.primary },
  partyName: { fontSize: ms(15), fontWeight: '700' },
  partyRole: { fontSize: ms(12), marginTop: vs(1) },
  iconBtn: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  profileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(2) },
  profileRowText: { fontSize: ms(13.5), fontWeight: '700', color: COLORS.primary },

  /* Timeline */
  cardTitle: { fontSize: ms(14.5), fontWeight: '800', letterSpacing: -0.2 },
  tlRow: { flexDirection: 'row', gap: s(12) },
  tlGutter: { width: s(14), alignItems: 'center' },
  tlDot: { width: s(13), height: s(13), borderRadius: s(6.5), borderWidth: 2, marginTop: vs(2) },
  tlLine: { flex: 1, width: 2, marginTop: vs(2), minHeight: vs(18) },
  tlBody: { flex: 1, paddingBottom: vs(16) },
  tlLabel: { fontSize: ms(13.5) },
  tlTime: { fontSize: ms(11.5), marginTop: vs(2) },

  /* Review */
  reviewCard: { gap: vs(12) },
  reviewDone: { alignItems: 'center', gap: vs(8) },
  starsRow: { flexDirection: 'row', gap: s(8), alignSelf: 'center' },
  reviewInput: { borderWidth: 1, borderRadius: s(12), padding: s(12), fontSize: ms(13.5), minHeight: vs(72) },
  reviewSubmittedComment: { fontSize: ms(13), textAlign: 'center', lineHeight: ms(19), fontStyle: 'italic' },
  reviewSubmittedNote: { fontSize: ms(12), fontWeight: '600' },

  /* Cancel */
  cancelLink: { alignSelf: 'center', paddingVertical: vs(12), paddingHorizontal: s(16), minHeight: vs(44), justifyContent: 'center' },
  cancelLinkText: { fontSize: ms(13.5), fontWeight: '700', color: COLORS.danger },
});
