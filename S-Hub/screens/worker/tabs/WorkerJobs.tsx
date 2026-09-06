import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import EmptyState from '@/components/ui/EmptyState';
import { ws, wvs, wms } from '@/lib/scaling';
import { listMyBookingsAsWorker, WorkerBookingView } from '@/lib/api/bookings';
import { subscribeToTable, unsubscribe } from '@/lib/api/realtime';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { RootStackParamList, WorkerTabParamList } from '@/navigation/types';

type Filter = 'active' | 'completed' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['accepted', 'en_route', 'arrived', 'in_progress'];

const AVATAR_PALETTE = ['#7C3AED', '#D97706', '#1D6FBA', '#DC2626', '#0891B2', '#2FAE60'];
function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function bookingAmount(booking: WorkerBookingView): number | null {
  if (!booking.bid) return null;
  return booking.bid.counter_price ?? booking.bid.proposed_price;
}

function statusColor(status: WorkerBookingView['status']): string {
  if (status === 'completed') return '#22C55E';
  if (status === 'cancelled') return '#94A3B8';
  return COLORS.primary;
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<WorkerTabParamList, 'worker-jobs'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function WorkerJobsScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bookings, setBookings] = useState<WorkerBookingView[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: 'My Jobs' });
  }, [navigation]);

  const load = useCallback(async () => {
    const result = await listMyBookingsAsWorker();
    if (result.success) {
      setBookings(result.data ?? []);
      setError(false);
    } else {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let channel: ReturnType<typeof subscribeToTable> | null = null;

      (async () => {
        setLoading(true);
        await load();
        if (cancelled) return;
        setLoading(false);

        const userId = useAuthStore.getState().user?.id;
        if (!userId || cancelled) return;

        channel = subscribeToTable('bookings', `worker_id=eq.${userId}`, () => {
          load();
        });
      })();

      return () => {
        cancelled = true;
        if (channel) unsubscribe(channel);
      };
    }, [load])
  );

  const filtered = useMemo(
    () =>
      bookings.filter((b) =>
        filter === 'active' ? ACTIVE_STATUSES.includes(b.status) : b.status === filter
      ),
    [bookings, filter]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={[]}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.pageInner}>
      {/* Tab Filters */}
      <View style={[styles.tabRow, { borderColor: T.border }]}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={styles.tab}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: isActive ? COLORS.primary : T.subText }, isActive && styles.tabTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.tabIndicator, isActive && { backgroundColor: COLORS.primary }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Jobs List */}
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your jobs"
          body="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => load()}
          tone="error"
        />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={wms(44)} color={T.subText + '50'} />
          <Text style={[styles.emptyTitle, { color: T.text }]}>No {filter} jobs</Text>
          <Text style={[styles.emptySub, { color: T.subText }]}>
            {filter === 'active' ? 'Accept a request from your home screen to get started.' : `You don't have any ${filter} jobs yet.`}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {filtered.map((booking) => {
            const clientName = booking.client?.full_name || 'Client';
            const color = colorForId(booking.client_id);
            const amount = bookingAmount(booking);
            const title = booking.request
              ? booking.request.category.charAt(0).toUpperCase() + booking.request.category.slice(1)
              : 'Job';
            const location = booking.request?.location_string ?? booking.request?.location_region ?? '';

            return (
              <TouchableOpacity
                key={booking.id}
                activeOpacity={0.85}
                style={[styles.jobCard, { backgroundColor: T.card, borderColor: T.border }]}
                onPress={() => navigation.navigate('JobDetail', { bookingId: booking.id })}
              >
                <View style={[styles.clientAvatar, { backgroundColor: color + '18' }]}>
                  <Text style={[styles.clientInitials, { color }]}>{initialsOf(clientName)}</Text>
                </View>

                <View style={styles.jobInfo}>
                  <Text style={[styles.jobTitle, { color: T.text }]} numberOfLines={1}>{title}</Text>
                  <Text style={[styles.jobMeta, { color: T.subText }]} numberOfLines={1}>
                    {clientName}{location ? ` · ${location}` : ''}
                  </Text>
                </View>

                <View style={styles.jobRight}>
                  <Text style={styles.jobAmount}>{amount != null ? `GH₵ ${amount}` : '—'}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor(booking.status) }]} />
                    <Text style={[styles.statusText, { color: statusColor(booking.status) }]}>
                      {booking.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  /* Tabs */
  tabRow: {
    flexDirection: 'row', paddingHorizontal: ws(20), paddingTop: wvs(10),
    borderBottomWidth: 1,
  },
  tab: { marginRight: ws(24), paddingBottom: wvs(10), alignItems: 'center' },
  tabText: { fontSize: wms(13.5), fontWeight: '600', marginBottom: wvs(8) },
  tabTextActive: { fontWeight: '800' },
  tabIndicator: { height: wvs(2.5), width: '100%', borderRadius: ws(2), backgroundColor: 'transparent' },

  /* List */
  list: { padding: ws(20), paddingBottom: wvs(100), gap: wvs(10) },

  /* Empty */
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: ws(40), gap: wvs(10),
  },
  emptyTitle: { fontSize: wms(16), fontWeight: '700' },
  emptySub: { fontSize: wms(12.5), textAlign: 'center', lineHeight: wms(18) },

  /* Job card */
  jobCard: {
    flexDirection: 'row', alignItems: 'center', gap: ws(12),
    borderWidth: 1, borderRadius: ws(16), padding: ws(14),
  },
  clientAvatar: {
    width: ws(42), height: ws(42), borderRadius: ws(21),
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  clientInitials: { fontSize: wms(13.5), fontWeight: '800' },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: wms(13.5), fontWeight: '700', marginBottom: wvs(3) },
  jobMeta: { fontSize: wms(11.5) },
  jobRight: { alignItems: 'flex-end', gap: wvs(4) },
  jobAmount: { fontSize: wms(14), fontWeight: '800', color: COLORS.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: ws(4) },
  statusDot: { width: ws(5), height: ws(5), borderRadius: ws(2.5) },
  statusText: { fontSize: wms(10.5), fontWeight: '700', textTransform: 'capitalize' },
});
