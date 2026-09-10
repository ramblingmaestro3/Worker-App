/**
 * Worker home tab: online toggle + stats, the job feed
 * (listOpenServiceRequestsForCategories — only jobs whose category is in the
 * worker's skills, refreshed live), and the worker's own active bids with
 * counter-offer / withdraw actions.
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { categoryLabel } from '@/constants/categories';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { distanceKm } from '@/lib/geo';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Toast, { ToastState, ToastVariant } from '@/components/Toast';
import { getMyProfile } from '@/lib/api/profiles';
import { getMyWorkerProfile, updateWorkerProfile } from '@/lib/api/workerProfiles';
import { listOpenServiceRequestsForCategories, ServiceRequest } from '@/lib/api/serviceRequests';
import { listMyBids, matchCounterOffer, withdrawBid, WorkerBid } from '@/lib/api/workerBids';
import { countMyCompletedBookings } from '@/lib/api/bookings';
import { subscribeToTable, unsubscribe } from '@/lib/api/realtime';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useHasUnreadNotifications } from '@/hooks/use-unread-notifications';
import type { RootStackParamList, WorkerTabParamList } from '@/navigation/types';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatSchedule(scheduledFor: string | null): string | null {
  if (!scheduledFor) return null;
  try {
    const d = new Date(scheduledFor);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch { return null; }
}

/** Only the most recent active-or-terminal bid per request matters for display. */
function latestBidByRequest(bids: WorkerBid[]): Map<string, WorkerBid> {
  const map = new Map<string, WorkerBid>();
  for (const bid of bids) {
    const existing = map.get(bid.request_id);
    if (!existing || new Date(bid.updated_at) > new Date(existing.updated_at)) {
      map.set(bid.request_id, bid);
    }
  }
  return map;
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<WorkerTabParamList, 'worker-dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function WorkerDashboardScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [jobsDone, setJobsDone] = useState(0);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [feedError, setFeedError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [myBids, setMyBids] = useState<Map<string, WorkerBid>>(new Map());
  const [respondingBidId, setRespondingBidId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  // State, not a ref: it's written once from the async profile load and read
  // during render to compute per-request distances, so its landing must trigger
  // a re-render (and reading a ref in render is a react-hooks/refs error).
  const [workerCoords, setWorkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const toastKey = useRef(0);
  const hasUnread = useHasUnreadNotifications();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const showToast = useCallback((message: string, variant: ToastVariant) => {
    toastKey.current += 1;
    setToast({ message, variant, key: toastKey.current });
  }, []);

  const loadFeed = useCallback(async (skills: string[]) => {
    const result = await listOpenServiceRequestsForCategories(skills);
    if (result.success) {
      setRequests(result.data ?? []);
      setFeedError(false);
    } else {
      setFeedError(true);
    }
  }, []);

  const loadMyBids = useCallback(async () => {
    const result = await listMyBids();
    if (result.success) setMyBids(latestBidByRequest(result.data ?? []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let requestsChannel: ReturnType<typeof subscribeToTable> | null = null;
      let bidsChannel: ReturnType<typeof subscribeToTable> | null = null;
      let skills: string[] = [];

      (async () => {
        setLoading(true);
        const [profileResult, workerProfileResult, jobsDoneResult] = await Promise.all([
          getMyProfile(),
          getMyWorkerProfile(),
          countMyCompletedBookings(),
        ]);
        if (cancelled) return;

        // Worker-facing name: the worker_profiles.display_name override, else the personal profile name.
        setFullName(
          (workerProfileResult.success && workerProfileResult.data?.display_name) ||
            (profileResult.success && profileResult.data?.full_name) ||
            ''
        );
        if (workerProfileResult.success && workerProfileResult.data) {
          skills = workerProfileResult.data.skills;
          setRatingAvg(workerProfileResult.data.rating_avg);
          setRatingCount(workerProfileResult.data.rating_count);
          setOnline(workerProfileResult.data.is_online);
          if (workerProfileResult.data.latitude != null && workerProfileResult.data.longitude != null) {
            setWorkerCoords({
              latitude: workerProfileResult.data.latitude,
              longitude: workerProfileResult.data.longitude,
            });
          }
        }
        if (jobsDoneResult.success) setJobsDone(jobsDoneResult.data ?? 0);

        await Promise.all([loadFeed(skills), loadMyBids()]);
        if (cancelled) return;
        setLoading(false);

        const userId = useAuthStore.getState().user?.id;
        if (!userId || cancelled) return;

        // New/changed open requests — client-filtered to this worker's skills,
        // since postgres_changes filters can't express "category in (...)".
        requestsChannel = subscribeToTable<ServiceRequest>(
          'service_requests',
          'status=eq.seeking_bids',
          (row) => {
            setRequests((prev) => {
              if (!skills.includes(row.category)) {
                return prev.filter((r) => r.id !== row.id);
              }
              const withoutRow = prev.filter((r) => r.id !== row.id);
              return [row, ...withoutRow];
            });
          }
        );

        // The worker's own bid status changes — this is the assignment handshake.
        bidsChannel = subscribeToTable<WorkerBid>('worker_bids', `worker_id=eq.${userId}`, (bid) => {
          setMyBids((prev) => {
            const next = new Map(prev);
            next.set(bid.request_id, bid);
            return next;
          });

          if (bid.status === 'accepted') {
            showToast('🎉 Offer accepted! Job assigned.', 'success');
            setRequests((prev) => prev.filter((r) => r.id !== bid.request_id));
            setTimeout(() => navigation.navigate('worker-jobs'), 1200);
          } else if (bid.status === 'declined') {
            showToast('Offer expired — job taken by another worker.', 'warning');
            setRequests((prev) => prev.filter((r) => r.id !== bid.request_id));
          } else if (bid.status === 'countered') {
            showToast(`Client countered: GH₵${bid.counter_price ?? bid.proposed_price}`, 'info');
          }
        });
      })();

      return () => {
        cancelled = true;
        if (requestsChannel) unsubscribe(requestsChannel);
        if (bidsChannel) unsubscribe(bidsChannel);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadFeed, loadMyBids, showToast, navigation, reloadKey])
  );

  const handlePlaceBid = (requestId: string) => {
    navigation.navigate('SubmitBid', { requestId });
  };

  const handleMatchCounter = async (bid: WorkerBid) => {
    if (bid.counter_price == null) return;
    setRespondingBidId(bid.id);
    const result = await matchCounterOffer(bid.id, bid.counter_price);
    setRespondingBidId(null);
    if (!result.success) {
      showToast(result.error ?? 'Could not respond to counter-offer.', 'warning');
      return;
    }
    showToast('Matched — waiting for client to confirm.', 'info');
  };

  const handleWithdraw = async (bid: WorkerBid) => {
    setRespondingBidId(bid.id);
    const result = await withdrawBid(bid.id);
    setRespondingBidId(null);
    if (!result.success) {
      showToast(result.error ?? 'Could not withdraw bid.', 'warning');
    }
  };

  const activeBidCount = Array.from(myBids.values()).filter((b) => b.status === 'pending' || b.status === 'countered').length;

  const enrichedRequests = requests
    .map((req) => {
      const dist =
        workerCoords && req.latitude != null && req.longitude != null
          ? distanceKm(workerCoords.latitude, workerCoords.longitude, req.latitude, req.longitude)
          : null;
      return { req, dist, bid: myBids.get(req.id) };
    })
    .sort((a, b) => {
      if (a.dist != null && b.dist != null) return a.dist - b.dist;
      if (a.dist != null) return -1;
      if (b.dist != null) return 1;
      return new Date(b.req.created_at).getTime() - new Date(a.req.created_at).getTime();
    });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.dashHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarSmall, { backgroundColor: COLORS.primary + '20' }]}>
            <Text style={styles.avatarInitials}>
              {fullName ? fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '?'}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: T.subText }]}>Welcome back</Text>
            <Text style={[styles.userName, { color: T.text }]} numberOfLines={1}>{fullName || 'Worker'}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.notifBtn, { backgroundColor: T.inputBg }]} onPress={() => navigation.navigate('WorkerNotifications')}>
          <Ionicons name="notifications-outline" size={wms(19)} color={T.text} />
          {hasUnread && <View style={styles.notifDot} />}
        </TouchableOpacity>
      </View>

      <View style={styles.pageInner}>
      {/* ── Online status ── */}
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: online ? COLORS.accent : T.subText }]} />
          <Text style={[styles.statusText, { color: T.text }]}>
            {online ? "You're online" : "You're offline"}
          </Text>
        </View>
        <Switch
          value={online}
          onValueChange={(next) => {
            setOnline(next);
            updateWorkerProfile({ is_online: next }).then((result) => {
              if (!result.success) {
                // Revert on failure so the UI doesn't claim a status that isn't real.
                setOnline(!next);
                showToast(result.error ?? 'Could not update your status.', 'warning');
              }
            });
          }}
          trackColor={{ false: T.border, true: COLORS.primaryLight }}
          thumbColor={online ? COLORS.primary : '#ccc'}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Quick Stats ── */}
        <Card style={styles.statsStrip}>
          {[
            { label: 'Active Bids', value: String(activeBidCount) },
            { label: 'Jobs Done', value: String(jobsDone) },
            { label: 'Rating', value: ratingCount > 0 ? `${ratingAvg.toFixed(1)} ★` : 'New' },
          ].map((stat, i, arr) => (
            <View key={stat.label} style={[styles.statCol, i < arr.length - 1 && [styles.statBorder, { borderColor: T.border }]]}>
              <Text style={[styles.statValue, { color: T.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: T.subText }]}>{stat.label}</Text>
            </View>
          ))}
        </Card>

        {/* ── Nearby Requests ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            {online ? 'Requests Matching Your Skills' : 'Go online to see requests'}
          </Text>
        </View>

        {!online ? null : loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : feedError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load requests"
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => setReloadKey((k) => k + 1)}
            tone="error"
          />
        ) : enrichedRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={wms(36)} color={T.subText} />
            <Text style={[styles.emptyText, { color: T.subText }]}>
              No open requests match your skills right now. New ones will appear here instantly.
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {enrichedRequests.map(({ req, dist, bid }) => {
              const isResponding = respondingBidId === bid?.id;
              const hasActiveBid = bid && (bid.status === 'pending' || bid.status === 'countered');

              return (
                <TouchableOpacity
                  key={req.id}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('JobPosting', { requestId: req.id })}
                >
                <Card style={styles.reqCard}>
                  <View style={styles.reqTop}>
                    <Text style={[styles.reqTitle, { color: T.text }]} numberOfLines={1}>
                      {categoryLabel(req.category)}
                    </Text>
                  </View>
                  {!!req.description && (
                    <Text style={[styles.reqDesc, { color: T.subText }]} numberOfLines={2}>{req.description}</Text>
                  )}
                  <Text style={[styles.reqMeta, { color: T.subText }]}>
                    {dist != null ? `${dist.toFixed(1)} km away` : req.location_region ?? 'Location unknown'} · {timeAgo(req.created_at)}
                  </Text>
                  <View style={styles.reqScheduleRow}>
                    <Ionicons name="calendar-outline" size={wms(13)} color={T.subText} />
                    <Text style={[styles.reqScheduleText, { color: T.subText }]}>
                      {formatSchedule(req.scheduled_for) ?? 'Schedule flexible'}
                    </Text>
                  </View>

                  <View style={styles.reqBottom}>
                    <Text style={styles.budgetValue}>
                      {req.initial_offer_price != null ? `GH₵ ${req.initial_offer_price}` : 'Open budget'}
                    </Text>

                    {!bid || (bid.status !== 'pending' && bid.status !== 'countered') ? (
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => handlePlaceBid(req.id)} activeOpacity={0.85}>
                        <Text style={styles.acceptBtnText}>Place Bid</Text>
                      </TouchableOpacity>
                    ) : bid.status === 'pending' ? (
                      <View style={[styles.pendingPill, { backgroundColor: T.inputBg }]}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={[styles.pendingPillText, { color: T.text }]}>
                          Offer Sent · GH₵{bid.proposed_price} · Waiting
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {hasActiveBid && bid!.status === 'countered' && (
                    <View style={[styles.counterBox, { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent }]}>
                      <Text style={[styles.counterText, { color: T.text }]}>
                        Client countered: <Text style={{ fontWeight: '800' }}>GH₵{bid!.counter_price}</Text>
                        {bid!.counter_message ? ` — "${bid!.counter_message}"` : ''}
                      </Text>
                      <View style={styles.counterActions}>
                        <TouchableOpacity
                          style={[styles.counterBtn, { backgroundColor: COLORS.primary }]}
                          disabled={isResponding}
                          onPress={() => handleMatchCounter(bid!)}
                        >
                          {isResponding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.counterBtnText}>Match & Send</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.counterBtn, styles.counterBtnGhost, { borderColor: T.border }]}
                          disabled={isResponding}
                          onPress={() => handleWithdraw(bid!)}
                        >
                          <Text style={[styles.counterBtnGhostText, { color: T.subText }]}>Withdraw</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      </View>

      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  /* Header */
  dashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ws(20), paddingTop: wvs(12), paddingBottom: wvs(4) },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: ws(12), flex: 1, marginRight: ws(12) },
  avatarSmall: {
    width: ws(42), height: ws(42), borderRadius: ws(21),
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: wms(15), fontWeight: '800', color: COLORS.primary },
  greeting: { fontSize: wms(11.5), fontWeight: '500' },
  userName: { fontSize: wms(16), fontWeight: '700' },
  notifBtn: {
    width: ws(38), height: ws(38), borderRadius: ws(19),
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: wvs(8), right: ws(9),
    width: ws(6), height: ws(6), borderRadius: ws(3),
    backgroundColor: COLORS.danger,
  },

  /* Status row */
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: ws(20), paddingTop: wvs(10), paddingBottom: wvs(12),
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: ws(8) },
  statusDot: { width: ws(8), height: ws(8), borderRadius: ws(4) },
  statusText: { fontSize: wms(13.5), fontWeight: '600' },

  /* Scroll */
  scroll: { paddingHorizontal: ws(20), paddingBottom: wvs(120), gap: wvs(20) },

  /* Stats */
  statsStrip: {
    flexDirection: 'row', padding: 0,
  },
  statCol: { flex: 1, alignItems: 'center', paddingVertical: wvs(14) },
  statBorder: { borderRightWidth: 1 },
  statValue: { fontSize: wms(15), fontWeight: '800', marginBottom: wvs(2) },
  statLabel: { fontSize: wms(10.5), fontWeight: '500' },

  /* Section */
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTitle: { fontSize: wms(16), fontWeight: '800' },

  /* Empty */
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: wvs(10), paddingVertical: wvs(30), marginTop: wvs(-8) },
  emptyText: { fontSize: wms(13), textAlign: 'center', lineHeight: wms(19), paddingHorizontal: ws(20) },

  /* Requests */
  requestsList: { gap: wvs(10), marginTop: wvs(-8) },
  reqCard: { gap: wvs(4) },
  reqTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ws(8) },
  reqTitle: { flex: 1, fontSize: wms(14.5), fontWeight: '700' },
  reqDesc: { fontSize: wms(12.5) },
  reqMeta: { fontSize: wms(12) },
  reqScheduleRow: { flexDirection: 'row', alignItems: 'center', gap: ws(5) },
  reqScheduleText: { fontSize: wms(12) },
  reqBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: wvs(8),
  },
  budgetValue: { fontSize: wms(14.5), fontWeight: '800', color: COLORS.primary },
  acceptBtn: {
    backgroundColor: COLORS.primary, borderRadius: ws(10),
    paddingHorizontal: ws(16), paddingVertical: wvs(9),
  },
  acceptBtnText: { fontSize: wms(12.5), fontWeight: '700', color: '#fff' },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: ws(6),
    borderRadius: ws(10), paddingHorizontal: ws(12), paddingVertical: wvs(7),
  },
  pendingPillText: { fontSize: wms(11.5), fontWeight: '700' },

  /* Counter offer */
  counterBox: { marginTop: wvs(10), borderWidth: 1, borderRadius: ws(12), padding: ws(12), gap: wvs(8) },
  counterText: { fontSize: wms(12.5), lineHeight: wms(18) },
  counterActions: { flexDirection: 'row', gap: ws(8) },
  counterBtn: { flex: 1, borderRadius: ws(10), paddingVertical: wvs(9), alignItems: 'center' },
  counterBtnText: { fontSize: wms(12.5), fontWeight: '700', color: '#fff' },
  counterBtnGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  counterBtnGhostText: { fontSize: wms(12.5), fontWeight: '700' },
});
