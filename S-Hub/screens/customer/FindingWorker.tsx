import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import type { RootStackParamList } from '@/navigation/types';
import { listBidsForRequest, BidWithWorker } from '@/lib/api/workerBids';
import { getServiceRequest } from '@/lib/api/serviceRequests';
import { listVerifiedWorkersForCategory, VerifiedWorkerSummary } from '@/lib/api/workerProfiles';
import { subscribeToRequestBids, unsubscribe } from '@/lib/api/realtime';
import { distanceKm } from '@/lib/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'FindingWorker'>;

function effectivePrice(bid: BidWithWorker): number {
  return bid.status === 'countered' && bid.counter_price != null ? bid.counter_price : bid.proposed_price;
}

/* ─── Animated pulse ring ─── */
function PulseRing({ delay, size }: { delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: COLORS.primary,
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }],
      }}
    />
  );
}

/* ─── Searching animation view — shown until the first real bid arrives ─── */
function SearchingView({ service }: { service: string }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={sv.wrap}>
      <View style={sv.radarWrap}>
        <PulseRing delay={0} size={200} />
        <PulseRing delay={600} size={200} />
        <PulseRing delay={1200} size={200} />
        <View style={sv.centerIcon}>
          <Text style={{ fontSize: 34 }}>🔍</Text>
        </View>
      </View>

      <Text style={sv.title}>Finding workers{dots}</Text>
      <Text style={sv.sub}>Searching for available {service} workers near you</Text>
    </View>
  );
}

const sv = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
  radarWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  centerIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary + '30' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 10, paddingHorizontal: 30 },
});

/* ─── Shown when no worker matches the job's category (yet) ─── */
function NoMatchView({
  service,
  T,
  onBrowse,
  onPostAnother,
}: {
  service: string;
  T: any;
  onBrowse: () => void;
  onPostAnother: () => void;
}) {
  const tips = [
    'Raise your budget — a better offer gets more workers to take the job on.',
    'Add detail to the description so workers can see it’s a good fit.',
    `Try the "Handyman / Other" category — many workers cover general ${service.toLowerCase()} tasks.`,
  ];
  return (
    <View style={nm.wrap}>
      <View style={nm.iconCircle}>
        <Ionicons name="search-outline" size={30} color={COLORS.primary} />
      </View>
      <Text style={[nm.title, { color: T.text }]}>No {service.toLowerCase()} workers matched yet</Text>
      <Text style={[nm.body, { color: T.subText }]}>
        Your job is still live — any worker browsing open jobs can bid on it, and we&apos;ll notify you
        the moment someone does.
      </Text>

      <View style={[nm.tipCard, { backgroundColor: T.card, borderColor: T.border }]}>
        <Text style={[nm.tipHeading, { color: T.text }]}>Get more workers to see it</Text>
        {tips.map((tip) => (
          <View key={tip} style={nm.tipRow}>
            <Ionicons name="bulb-outline" size={15} color={COLORS.primary} style={{ marginTop: 1 }} />
            <Text style={[nm.tipText, { color: T.subText }]}>{tip}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={nm.primaryBtn} activeOpacity={0.85} onPress={onBrowse}>
        <Ionicons name="people-outline" size={16} color="#fff" />
        <Text style={nm.primaryBtnText}>Browse all verified workers</Text>
      </TouchableOpacity>
      <TouchableOpacity style={nm.linkBtn} activeOpacity={0.7} onPress={onPostAnother}>
        <Text style={nm.linkText}>Post a different job</Text>
      </TouchableOpacity>
    </View>
  );
}

const nm = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  body: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  tipCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 16, gap: 10, marginBottom: 18 },
  tipHeading: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignSelf: 'stretch' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  linkBtn: { paddingVertical: 14 },
  linkText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});

/* ─── Real bid preview card ─── */
function BidPreviewCard({ bid, T, onPress }: { bid: BidWithWorker; T: any; onPress: () => void }) {
  const initials = (bid.worker?.full_name ?? 'Worker')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity style={[wc.card, { backgroundColor: T.card, borderColor: T.border }]} onPress={onPress} activeOpacity={0.85}>
      <View style={wc.avatar}>
        <Text style={wc.initials}>{initials}</Text>
      </View>

      <View style={wc.info}>
        <Text style={wc.name}>{bid.worker?.full_name ?? 'Worker'}</Text>
        {bid.worker && (
          <View style={wc.metaRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={wc.rating}>{bid.worker.rating_avg.toFixed(1)}</Text>
            <Text style={wc.dot}>·</Text>
            <Text style={wc.jobs}>{bid.worker.rating_count} reviews</Text>
          </View>
        )}
        {!!bid.message && (
          <Text style={wc.message} numberOfLines={1}>{bid.message}</Text>
        )}
      </View>

      <View style={wc.right}>
        <Text style={wc.price}>GH₵ {effectivePrice(bid)}</Text>
        <Text style={wc.viewText}>View</Text>
      </View>
    </TouchableOpacity>
  );
}

const wc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '15', flexShrink: 0 },
  initials: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  rating: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  dot: { fontSize: 12, color: COLORS.muted },
  jobs: { fontSize: 11, color: COLORS.muted },
  message: { fontSize: 11, color: COLORS.muted },
  right: { alignItems: 'flex-end', flexShrink: 0 },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  viewText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
});

/* ─── Main Screen ─── */
export default function FindingWorkerScreen({ route, navigation }: Props) {
  const { requestId, service = 'a', jobTitle } = route.params ?? ({} as Props['route']['params']);
  const T = useThemeColors();

  const [bids, setBids] = useState<BidWithWorker[]>([]);
  const [matched, setMatched] = useState<VerifiedWorkerSummary[]>([]);
  const [jobCoords, setJobCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [matchedLoaded, setMatchedLoaded] = useState(false);
  const [elapsed, setElapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wasEmpty = useRef(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!requestId) {
        setLoading(false);
        return;
      }
      let cancelled = false;
      let channel: ReturnType<typeof subscribeToRequestBids> | null = null;
      // Hold the "no matches" advice back for a few seconds so it doesn't flash
      // the instant the client lands here straight from posting the job.
      const elapsedTimer = setTimeout(() => !cancelled && setElapsed(true), 6000);

      (async () => {
        setLoading(true);
        const [result, reqResult] = await Promise.all([
          listBidsForRequest(requestId),
          getServiceRequest(requestId),
        ]);
        if (cancelled) return;
        const initial = result.success ? result.data ?? [] : [];
        setBids(initial);
        setLoading(false);
        if (initial.length > 0) {
          wasEmpty.current = false;
          fadeAnim.setValue(1);
        }

        const req = reqResult.success ? reqResult.data : undefined;
        if (req?.latitude != null && req?.longitude != null) {
          setJobCoords({ lat: req.latitude, lng: req.longitude });
        }

        // Skill-matched verified workers for this job's category — gives the
        // client someone to look at before bids arrive.
        if (req?.category) {
          const r = await listVerifiedWorkersForCategory(req.category);
          if (!cancelled && r.success) setMatched(r.data ?? []);
        }
        if (!cancelled) setMatchedLoaded(true);

        channel = subscribeToRequestBids(requestId, () => {
          listBidsForRequest(requestId).then((r) => {
            if (cancelled || !r.success) return;
            setBids(r.data ?? []);
          });
        });
      })();

      return () => {
        cancelled = true;
        clearTimeout(elapsedTimer);
        if (channel) unsubscribe(channel);
      };
    }, [requestId, fadeAnim])
  );

  useEffect(() => {
    if (bids.length > 0 && wasEmpty.current) {
      wasEmpty.current = false;
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [bids.length, fadeAnim]);

  const found = bids.length > 0;
  const topBids = [...bids]
    .filter((b) => b.status === 'pending' || b.status === 'countered')
    .sort((a, b) => effectivePrice(a) - effectivePrice(b))
    .slice(0, 3);

  // Skill-matched workers, each annotated with distance from the job and
  // sorted nearest-first (workers with no coords sink to the bottom).
  const matchedNearby = matched
    .map((w) => ({
      w,
      dist:
        jobCoords && w.latitude != null && w.longitude != null
          ? distanceKm(jobCoords.lat, jobCoords.lng, w.latitude, w.longitude)
          : null,
    }))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));

  // No bids, no skill-matched verified workers, and we've waited a beat.
  const showNoMatch = !found && matchedLoaded && matched.length === 0 && elapsed;

  const goToBids = () => {
    if (requestId) navigation.navigate('BidComparison', { requestId });
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <ScreenHeader
        title="Finding Workers"
        subtitle={service || jobTitle ? [service, jobTitle].filter(Boolean).join(' · ') : undefined}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            style={s.myJobsBtn}
            onPress={() => navigation.navigate('CustomerTabs', { screen: 'bookings' })}
            activeOpacity={0.8}
          >
            <Ionicons name="briefcase-outline" size={16} color={COLORS.primary} />
            <Text style={s.myJobsBtnText}>My Jobs</Text>
          </TouchableOpacity>
        }
      />

      <View style={s.postedBannerOuter}>
        <ScreenContent style={s.postedBanner}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
          <Text style={s.postedBannerText}>Job posted! Workers are being notified near you.</Text>
        </ScreenContent>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollOuter}>
        <ScreenContent style={s.scroll}>
          {!found && !showNoMatch && matched.length === 0 && <SearchingView service={service} />}

          {showNoMatch && (
            <NoMatchView
              service={service}
              T={T}
              onBrowse={() => navigation.navigate('Search', {})}
              onPostAnother={() => navigation.navigate('PostAJob', {})}
            />
          )}

          {found && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={s.foundRow}>
                <Text style={[s.foundText, { color: T.text }]}>
                  {bids.length} {bids.length === 1 ? 'bid' : 'bids'} received
                </Text>
                <View style={s.liveChip}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>Live</Text>
                </View>
              </View>

              {topBids.map((bid) => (
                <BidPreviewCard key={bid.id} bid={bid} T={T} onPress={goToBids} />
              ))}

              <TouchableOpacity style={s.viewAllBtn} activeOpacity={0.85} onPress={goToBids}>
                <Text style={s.viewAllBtnText}>
                  {bids.length > topBids.length ? 'View All Bids' : 'Review & Respond'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>

              <View style={[s.tipBox, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                <Text style={s.tipText}>
                  More workers may bid over the next few hours. We&apos;ll keep this updated live.
                </Text>
              </View>
            </Animated.View>
          )}

          {matchedNearby.length > 0 && (
            <View style={mws.section}>
              <Text style={[mws.heading, { color: T.text }]}>
                {matchedNearby.length} verified {service.toLowerCase()} {matchedNearby.length === 1 ? 'worker' : 'workers'} nearby
              </Text>
              <Text style={[mws.sub, { color: T.subText }]}>
                Matched to your job, closest first. They&apos;ll be notified — you can also view a profile now.
              </Text>
              {matchedNearby.slice(0, 6).map(({ w, dist }) => (
                <TouchableOpacity
                  key={w.id}
                  style={[mws.row, { backgroundColor: T.card, borderColor: T.border }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('WorkerProfile', { id: w.id })}
                >
                  <View style={mws.avatar}>
                    <Text style={mws.avatarText}>
                      {(w.full_name || 'W').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[mws.name, { color: T.text }]} numberOfLines={1}>{w.full_name}</Text>
                    <View style={mws.metaRow}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={[mws.meta, { color: T.subText }]}>
                        {w.rating_avg.toFixed(1)} ({w.rating_count})
                      </Text>
                      {w.hourly_rate != null && (
                        <Text style={[mws.meta, { color: T.subText }]}>· GH₵ {w.hourly_rate}/hr</Text>
                      )}
                      {dist != null && (
                        <Text style={[mws.meta, { color: COLORS.primary }]}>
                          · {dist < 1 ? '<1' : dist.toFixed(1)} km away
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={T.subText} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScreenContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  myJobsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary },
  myJobsBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  postedBannerOuter: { alignItems: 'center', backgroundColor: COLORS.primaryLight, borderBottomWidth: 1, borderColor: COLORS.border },
  postedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  postedBannerText: { fontSize: 12, color: COLORS.primary, fontWeight: '600', flex: 1 },

  scrollOuter: { alignItems: 'center' },
  scroll: { width: '100%', paddingBottom: 40 },

  foundRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  foundText: { fontSize: 15, fontWeight: '700' },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.dangerLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.danger },
  liveText: { fontSize: 11, color: COLORS.danger, fontWeight: '800' },

  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginHorizontal: 16, marginTop: 4 },
  viewAllBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14, marginHorizontal: 16, marginTop: 16 },
  tipText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18, fontWeight: '500' },
});

const mws = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 20 },
  heading: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 3, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  meta: { fontSize: 11.5, fontWeight: '600' },
});
