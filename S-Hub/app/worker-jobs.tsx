import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import WorkerNav from '@/components/WorkerNav';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';
import { listMyBookingsAsWorker, WorkerBookingView } from '@/lib/api/bookings';
import { subscribeToTable, unsubscribe } from '@/lib/api/realtime';
import { supabase } from '@/lib/supabase';

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

export default function WorkerJobsScreen() {
  const T = useThemeColors();
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<WorkerBookingView[]>([]);

  const load = useCallback(async () => {
    const result = await listMyBookingsAsWorker();
    if (result.success) setBookings(result.data ?? []);
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

        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || cancelled) return;

        channel = subscribeToTable('bookings', `worker_id=eq.${auth.user.id}`, () => {
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
    <RequireVerifiedWorker>
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.pageInner}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: T.text }]}>My Jobs</Text>
      </View>

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
              <View key={booking.id} style={[styles.jobCard, { backgroundColor: T.card, borderColor: T.border }]}>
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
              </View>
            );
          })}
        </ScrollView>
      )}
      </View>

      <WorkerNav active="jobs" />
    </SafeAreaView>
    </RequireVerifiedWorker>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  /* Header */
  header: {
    paddingHorizontal: ws(20), paddingTop: wvs(6), paddingBottom: wvs(10),
  },
  title: { fontSize: wms(22), fontWeight: '800' },

  /* Tabs */
  tabRow: {
    flexDirection: 'row', paddingHorizontal: ws(20),
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
