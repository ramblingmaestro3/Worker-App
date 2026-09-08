import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s } from '@/lib/scaling';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import type { CustomerTabParamList, RootStackParamList } from '@/navigation/types';
import { listMyServiceRequests, ServiceRequest } from '@/lib/api/serviceRequests';
import { listMyBookingsAsClient, ClientBookingView, BookingStatus } from '@/lib/api/bookings';

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, 'bookings'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'all' | 'upcoming' | 'completed';

type Entry =
  | { kind: 'request'; id: string; createdAt: string; request: ServiceRequest }
  | { kind: 'booking'; id: string; createdAt: string; booking: ClientBookingView };

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

const CATEGORY_ICON: Record<string, string> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  painting: 'color-palette-outline',
  cleaning: 'sparkles-outline',
  carpentry: 'hammer-outline',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function bookingStatusLabel(status: BookingStatus): string {
  return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BookingsScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [filter, setFilter] = useState<Filter>('all');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [clientBookings, setClientBookings] = useState<ClientBookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async (cancelledRef?: { current: boolean }) => {
    setLoading(true);
    setError(false);
    const [reqResult, bookingResult] = await Promise.all([listMyServiceRequests(), listMyBookingsAsClient()]);
    if (cancelledRef?.current) return;
    if (reqResult.success) setRequests(reqResult.data ?? []);
    if (bookingResult.success) setClientBookings(bookingResult.data ?? []);
    if (!reqResult.success || !bookingResult.success) setError(true);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      load(cancelledRef);
      return () => { cancelledRef.current = true; };
    }, [load])
  );

  const entries: Entry[] = useMemo(() => {
    const requestEntries: Entry[] = requests
      .filter((r) => r.status === 'seeking_bids' || r.status === 'cancelled')
      .map((r) => ({ kind: 'request', id: r.id, createdAt: r.created_at, request: r }));
    const bookingEntries: Entry[] = clientBookings.map((b) => ({ kind: 'booking', id: b.id, createdAt: b.created_at, booking: b }));
    return [...requestEntries, ...bookingEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, clientBookings]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'upcoming') {
      return entries.filter((e) =>
        e.kind === 'request' ? e.request.status === 'seeking_bids' : ACTIVE_BOOKING_STATUSES.includes(e.booking.status)
      );
    }
    return entries.filter((e) => e.kind === 'booking' && e.booking.status === 'completed');
  }, [entries, filter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.pageHeader}>
        <Text style={[styles.logo, { color: COLORS.primary }]}>AdwumaGo</Text>
        <View style={[styles.avatarSmall, { backgroundColor: T.inputBg }]} />
      </View>

      {/* Content capped and centered the same way as sign-up.tsx / sign-in.tsx */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: T.text }]}>My Bookings</Text>
            <Text style={[styles.subtitle, { color: T.subText }]}>Manage your scheduled services</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {(['all', 'upcoming', 'completed'] as Filter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, { backgroundColor: T.inputBg }, filter === f && { backgroundColor: COLORS.primary }]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.chipText, { color: T.subText }, filter === f && { color: '#fff' }]}>
                  {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Completed'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>Need more help?</Text>
            <Text style={styles.promoBody}>Book a trusted professional for your next home project in minutes.</Text>
            <TouchableOpacity style={styles.promoButton} onPress={() => navigation.navigate('PostAJob', {})} activeOpacity={0.85}>
              <Text style={styles.promoButtonText}>Post a Job</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load your bookings"
              body="Check your connection and try again."
              actionLabel="Retry"
              onAction={() => load()}
              tone="error"
            />
          ) : filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={36} color={T.subText} />
              <Text style={[styles.emptyText, { color: T.subText }]}>No {filter === 'all' ? '' : filter} jobs yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredEntries.map((entry) => {
                if (entry.kind === 'request') {
                  const req = entry.request;
                  const icon = CATEGORY_ICON[req.category] ?? 'briefcase-outline';
                  const cancelled = req.status === 'cancelled';
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      activeOpacity={0.85}
                      onPress={() => !cancelled && navigation.navigate('BidComparison', { requestId: req.id })}
                    >
                    <Card style={[styles.card, cancelled && { opacity: 0.7 }]}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.cardLeft}>
                          <View style={[styles.iconWrap, { backgroundColor: T.inputBg }]}>
                            <Ionicons name={icon as any} size={22} color={COLORS.primary} />
                          </View>
                          <View>
                            <Text style={[styles.serviceName, { color: T.text }]}>
                              {req.category.charAt(0).toUpperCase() + req.category.slice(1)}
                            </Text>
                            <Text style={[styles.workerName, { color: T.subText }]}>
                              {cancelled ? 'Cancelled' : 'Awaiting bids'}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: cancelled ? T.inputBg : COLORS.primaryLight }]}>
                          <Text style={[styles.statusPillText, { color: cancelled ? T.subText : COLORS.primary }]}>
                            {cancelled ? 'Cancelled' : 'Seeking Bids'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.cardBottomRow, { borderTopColor: T.border }]}>
                        <View>
                          <Text style={[styles.metaLabel, { color: T.subText }]}>Posted</Text>
                          <Text style={[styles.metaValue, { color: T.text }]}>{formatDate(req.created_at)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.metaLabel, { color: T.subText }]}>Budget</Text>
                          <Text style={styles.metaValuePrice}>
                            {req.initial_offer_price != null ? `GH₵ ${req.initial_offer_price}` : 'Open'}
                          </Text>
                        </View>
                      </View>
                    </Card>
                    </TouchableOpacity>
                  );
                }

                const booking = entry.booking;
                const icon = CATEGORY_ICON[booking.request?.category ?? ''] ?? 'briefcase-outline';
                const cancelled = booking.status === 'cancelled';
                const price = booking.bid?.counter_price ?? booking.bid?.proposed_price;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('JobDetail', { bookingId: booking.id })}
                  >
                  <Card style={[styles.card, cancelled && { opacity: 0.7 }]}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardLeft}>
                        <View style={[styles.iconWrap, { backgroundColor: T.inputBg }]}>
                          <Ionicons name={icon as any} size={22} color={COLORS.primary} />
                        </View>
                        <View>
                          <Text style={[styles.serviceName, { color: T.text }]}>
                            {(booking.request?.category ?? 'Service').replace(/^\w/, (c) => c.toUpperCase())}
                          </Text>
                          <Text style={[styles.workerName, { color: T.subText }]}>{booking.worker?.full_name ?? 'Worker'}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: booking.status === 'completed' ? COLORS.primaryLight : cancelled ? T.inputBg : COLORS.accentLight }]}>
                        <Text style={[styles.statusPillText, { color: booking.status === 'completed' || !cancelled ? (booking.status === 'completed' ? COLORS.primary : COLORS.accentDark) : T.subText }]}>
                          {bookingStatusLabel(booking.status)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.cardBottomRow, { borderTopColor: T.border }]}>
                      <View>
                        <Text style={[styles.metaLabel, { color: T.subText }]}>Date</Text>
                        <Text style={[styles.metaValue, { color: T.text }]}>{formatDate(booking.created_at)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.metaLabel, { color: T.subText }]}>Price</Text>
                        <Text
                          style={[
                            styles.metaValuePrice,
                            cancelled && { textDecorationLine: 'line-through', color: T.subText },
                          ]}
                        >
                          {price != null ? `GH₵ ${price}` : '—'}
                        </Text>
                      </View>
                    </View>
                  </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  logo: { fontSize: 20, fontWeight: '900' },
  avatarSmall: { width: 40, height: 40, borderRadius: 20 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, alignItems: 'center' },
  content: { width: '100%', maxWidth: s(544) },
  titleBlock: { marginTop: 4, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  chipRow: { marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  card: { gap: 12 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', gap: 12, flex: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 16, fontWeight: '700' },
  workerName: { fontSize: 14 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  metaLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
  metaValue: { fontSize: 14, fontWeight: '600' },
  metaValuePrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  promoCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 20, gap: 6, minHeight: 180, justifyContent: 'center', marginBottom: 20 },
  promoTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  promoBody: { fontSize: 14, color: '#fff', maxWidth: '80%' },
  promoButton: { backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, marginTop: 12 },
  promoButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
