import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

/* ─── Sample available workers ─── */
const WORKERS = [
  { id: 'w1', name: 'Kofi Mensah',   initials: 'KM', color: COLORS.accent, rating: 4.9, jobs: 143, price: 450, distance: '1.2 km', eta: '12 min', skills: ['Plumbing', 'Pipe Repair', 'Drainage'], verified: true,  online: true  },
  { id: 'w2', name: 'Kwame Adjei',   initials: 'KA', color: '#1D6FBA', rating: 4.7, jobs: 98,  price: 400, distance: '2.0 km', eta: '18 min', skills: ['Plumbing', 'Bathroom Fix'],            verified: true,  online: true  },
  { id: 'w3', name: 'Yaw Boateng',   initials: 'YB', color: '#92400E', rating: 4.8, jobs: 210, price: 500, distance: '3.4 km', eta: '25 min', skills: ['Plumbing', 'Water Heater'],            verified: false, online: true  },
  { id: 'w4', name: 'Ama Owusu',     initials: 'AO', color: '#7C3AED', rating: 4.6, jobs: 62,  price: 380, distance: '4.1 km', eta: '30 min', skills: ['Plumbing', 'Leak Fix'],               verified: true,  online: false },
];

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
  }, []);

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

/* ─── Searching animation view ─── */
function SearchingView({ service }: { service: string }) {
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 3, duration: 900, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 0, duration: 0,   useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={sv.wrap}>
      {/* Pulse rings */}
      <View style={sv.radarWrap}>
        <PulseRing delay={0}    size={200} />
        <PulseRing delay={600}  size={200} />
        <PulseRing delay={1200} size={200} />
        {/* Centre icon */}
        <View style={sv.centerIcon}>
          <Text style={{ fontSize: 34 }}>🔍</Text>
        </View>
      </View>

      <Text style={sv.title}>Finding workers{dots}</Text>
      <Text style={sv.sub}>Searching for available {service} workers near you</Text>

      <View style={sv.statusRow}>
        <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
        <Text style={sv.statusText}>Kumasi, Ghana</Text>
      </View>
    </View>
  );
}

const sv = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
  radarWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  centerIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary + '30' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 10, paddingHorizontal: 30 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});

/* ─── Worker card ─── */
function WorkerCard({ worker, service, T }: { worker: typeof WORKERS[0]; service: string; T: any }) {
  return (
    <View style={[wc.card, { backgroundColor: T.card, borderColor: T.border }]}>
      {/* Avatar + online */}
      <View style={wc.avatarWrap}>
        <View style={[wc.avatar, { backgroundColor: worker.color + '20' }]}>
          <Text style={[wc.initials, { color: worker.color }]}>{worker.initials}</Text>
        </View>
        {worker.online && <View style={wc.onlineDot} />}
      </View>

      <View style={wc.info}>
        <View style={wc.nameRow}>
          <Text style={wc.name}>{worker.name}</Text>
          {worker.verified && (
            <View style={wc.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.primary} />
              <Text style={wc.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Rating + jobs */}
        <View style={wc.metaRow}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={wc.rating}>{worker.rating}</Text>
          <Text style={wc.dot}>·</Text>
          <Text style={wc.jobs}>{worker.jobs} jobs</Text>
          <Text style={wc.dot}>·</Text>
          <Ionicons name="location-outline" size={12} color={COLORS.muted} />
          <Text style={wc.dist}>{worker.distance}</Text>
        </View>

        {/* Skills */}
        <View style={wc.skillsRow}>
          {worker.skills.slice(0, 3).map(sk => (
            <View key={sk} style={wc.skill}>
              <Text style={wc.skillText}>{sk}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Right: price + ETA + button */}
      <View style={wc.right}>
        <Text style={wc.price}>GH₵ {worker.price}</Text>
        <View style={wc.etaRow}>
          <Ionicons name="time-outline" size={11} color={COLORS.muted} />
          <Text style={wc.eta}>{worker.eta}</Text>
        </View>
        <TouchableOpacity
          style={wc.hireBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/messages' as any)}
        >
          <Text style={wc.hireBtnText}>Hire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const wc = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 16, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: COLORS.card },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7 },
  rating: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  dot: { fontSize: 12, color: COLORS.muted },
  jobs: { fontSize: 11, color: COLORS.muted },
  dist: { fontSize: 11, color: COLORS.muted },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skill: { backgroundColor: COLORS.bgGrey, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  skillText: { fontSize: 10, color: COLORS.muted, fontWeight: '600' },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 },
  price: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eta: { fontSize: 10, color: COLORS.muted },
  hireBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  hireBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

/* ─── Filter chips ─── */
const FILTERS = ['Nearest', 'Highest Rated', 'Lowest Price', 'Most Jobs'];

/* ─── Main Screen ─── */
export default function FindingWorkerScreen() {
  const { service = 'Plumbing', jobTitle = 'Fix leaking bathroom pipe' } = useLocalSearchParams<{ service?: string; jobTitle?: string }>();

  const [phase, setPhase]         = useState<'searching' | 'found'>('searching');
  const [activeFilter, setFilter] = useState('Nearest');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const T = useThemeColors();

  /* Simulate a 3-second search before showing results */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('found');
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <View style={[s.headerOuter, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <View style={s.headerInfo}>
            <Text style={[s.headerTitle, { color: T.text }]}>Finding Workers</Text>
            <Text style={[s.headerSub, { color: T.subText }]} numberOfLines={1}>{service} · {jobTitle}</Text>
          </View>
          <TouchableOpacity
            style={s.myJobsBtn}
            onPress={() => router.push('/bookings' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="briefcase-outline" size={16} color={COLORS.primary} />
            <Text style={s.myJobsBtnText}>My Jobs</Text>
          </TouchableOpacity>
        </ScreenContent>
      </View>

      {/* ── JOB POSTED BANNER ── */}
      <View style={s.postedBannerOuter}>
        <ScreenContent style={s.postedBanner}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
          <Text style={s.postedBannerText}>Job posted! Workers are being notified near you.</Text>
        </ScreenContent>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollOuter}>
        <ScreenContent style={s.scroll}>

        {/* ── SEARCHING ANIMATION ── */}
        <SearchingView service={service} />

        {/* ── RESULTS (fade in after search) ── */}
        {phase === 'found' && (
          <Animated.View style={{ opacity: fadeAnim }}>
              {/* Found count */}
            <View style={s.foundRow}>
              <Text style={[s.foundText, { color: T.text }]}>{WORKERS.length} workers found nearby</Text>
              <View style={s.liveChip}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>Live</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterChip, { backgroundColor: T.card, borderColor: T.border }, activeFilter === f && s.filterChipActive]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.filterText, { color: T.subText }, activeFilter === f && s.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {WORKERS.map(w => (
              <WorkerCard key={w.id} worker={w} service={service} T={T} />
            ))}

            <View style={[s.tipBox, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={s.tipText}>
                More workers may become available over the next few hours. We&apos;ll notify you instantly when they respond.
              </Text>
            </View>
          </Animated.View>
        )}
        </ScreenContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  headerOuter: { alignItems: 'center', borderBottomWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
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

  filtersRow: { paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  filterText: { fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: COLORS.primary },

  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14, marginHorizontal: 16, marginTop: 8 },
  tipText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18, fontWeight: '500' },
});
