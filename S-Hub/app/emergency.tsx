import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ─── Emergency service types ─── */
const EMERGENCY_SERVICES = [
  { id: 'plumbing', label: 'Burst Pipe', icon: '💧', color: '#1D6FBA', desc: 'Flooding, burst pipes, water shut-off' },
  { id: 'electrical', label: 'Power Outage', icon: '⚡', color: '#F59E0B', desc: 'Electrical faults, sparks, no power' },
  { id: 'locksmith', label: 'Locked Out', icon: '🔐', color: '#7C3AED', desc: 'Door, car, or safe lockout' },
  { id: 'generator', label: 'Generator Fault', icon: '🔋', color: '#92400E', desc: 'Generator won\'t start or tripped' },
  { id: 'roofing', label: 'Roof Leak', icon: '🏚️', color: '#DC2626', desc: 'Storm damage, active water leak' },
  { id: 'gas', label: 'Gas Leak', icon: '🔴', color: COLORS.danger, desc: 'Smell gas? Evacuate & call now' },
];

/* ─── Nearby on-call workers ─── */
const ON_CALL_WORKERS = [
  { id: 'w1', name: 'Kofi Mensah', initials: 'KM', color: COLORS.accent, rating: 4.9, jobs: 143, eta: '8 min', distance: '1.2 km', price: 600, verified: true },
  { id: 'w2', name: 'Kwame Adjei', initials: 'KA', color: '#1D6FBA', rating: 4.7, jobs: 98, eta: '12 min', distance: '2.0 km', price: 550, verified: true },
  { id: 'w3', name: 'Yaw Boateng', initials: 'YB', color: '#92400E', rating: 4.8, jobs: 210, eta: '15 min', distance: '3.4 km', price: 500, verified: false },
];

/* ─── Animated pulsing ring (danger colour) ─── */
function DangerPulse({ delay, size }: { delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
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
        borderColor: COLORS.danger,
        opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.7, 0.3, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.55] }) }],
      }}
    />
  );
}

/* ─── Hero banner ─── */
function HeroBanner() {
  return (
    <View style={hero.wrap}>
      {/* Pulse rings */}
      <View style={hero.pulseWrap}>
        <DangerPulse delay={0} size={160} />
        <DangerPulse delay={600} size={160} />
        <DangerPulse delay={1200} size={160} />
        <View style={hero.iconCircle}>
          <MaterialCommunityIcons name="alarm-light-outline" size={38} color="#fff" />
        </View>
      </View>

      <Text style={hero.title}>Emergency Hire</Text>
      <Text style={hero.sub}>
        Connect with an available worker in minutes — available 24 / 7
      </Text>

      {/* Live badge */}
      <View style={hero.liveBadge}>
        <View style={hero.liveDot} />
        <Text style={hero.liveText}>47 workers on-call near Kumasi</Text>
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 24, paddingBottom: 28, paddingHorizontal: 24 },
  pulseWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.danger, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 19, marginBottom: 14 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { fontSize: 12, color: '#fff', fontWeight: '700' },
});

/* ─── Service chip ─── */
function ServiceChip({
  svc,
  selected,
  onPress,
}: {
  svc: typeof EMERGENCY_SERVICES[0];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sc.chip, selected && { borderColor: svc.color, backgroundColor: svc.color + '14' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={sc.icon}>{svc.icon}</Text>
      <Text style={[sc.label, selected && { color: svc.color }]}>{svc.label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={14} color={svc.color} />}
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, marginRight: 8, marginBottom: 8 },
  icon: { fontSize: 16 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.text },
});

/* ─── On-call worker card ─── */
function WorkerCard({
  worker,
  onHire,
}: {
  worker: typeof ON_CALL_WORKERS[0];
  onHire: () => void;
}) {
  return (
    <View style={wc.card}>
      {/* Avatar */}
      <View style={wc.avatarWrap}>
        <View style={[wc.avatar, { backgroundColor: worker.color + '20' }]}>
          <Text style={[wc.initials, { color: worker.color }]}>{worker.initials}</Text>
        </View>
        <View style={wc.onlineDot} />
      </View>

      <View style={wc.info}>
        <View style={wc.nameRow}>
          <Text style={wc.name}>{worker.name}</Text>
          {worker.verified && (
            <View style={wc.badge}>
              <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
              <Text style={wc.badgeText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={wc.metaRow}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={wc.rating}>{worker.rating}</Text>
          <Text style={wc.dot}>·</Text>
          <Text style={wc.jobs}>{worker.jobs} jobs</Text>
          <Text style={wc.dot}>·</Text>
          <Ionicons name="location-outline" size={12} color={COLORS.muted} />
          <Text style={wc.dist}>{worker.distance}</Text>
        </View>
      </View>

      <View style={wc.right}>
        {/* ETA chip */}
        <View style={wc.etaChip}>
          <Ionicons name="flash" size={10} color={COLORS.danger} />
          <Text style={wc.etaText}>{worker.eta}</Text>
        </View>
        <Text style={wc.price}>GH₵ {worker.price}</Text>
        <TouchableOpacity style={wc.hireBtn} onPress={onHire} activeOpacity={0.85}>
          <Text style={wc.hireBtnText}>Dispatch</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const wc = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 16, padding: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, gap: 10, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 16, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: COLORS.card },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  dot: { fontSize: 12, color: COLORS.muted },
  jobs: { fontSize: 11, color: COLORS.muted },
  dist: { fontSize: 11, color: COLORS.muted },
  right: { alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0, gap: 4 },
  etaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.dangerLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  etaText: { fontSize: 10, color: COLORS.danger, fontWeight: '800' },
  price: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  hireBtn: { backgroundColor: COLORS.danger, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  hireBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});

/* ─── Main Screen ─── */
export default function EmergencyScreen() {
  const [selectedService, setService] = useState('plumbing');
  const [desc, setDesc] = useState('');
  const T = useThemeColors();

  const selectedSvc = EMERGENCY_SERVICES.find(s => s.id === selectedService)!;

  const handleDispatch = (worker: typeof ON_CALL_WORKERS[0]) => {
    Alert.alert(
      '🚨 Worker Dispatched!',
      `${worker.name} is on the way — ETA ${worker.eta}.\n\nYou'll receive SMS & in-app updates.`,
      [
        { text: 'Track Worker', onPress: () => router.push('/finding-worker' as any) },
        { text: 'OK' },
      ]
    );
  };

  const handleSOSAll = () => {
    Alert.alert(
      '🚨 SOS — Notify All Workers',
      'All available emergency workers near you will be alerted immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm SOS',
          style: 'destructive',
          onPress: () => router.push('/finding-worker' as any),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.danger} />

      {/* ── HEADER ── */}
      <View style={s.headerOuter}>
        <ScreenContent style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Emergency Hire</Text>
          {/* SOS pill */}
          <TouchableOpacity style={s.sosBtn} onPress={handleSOSAll} activeOpacity={0.85}>
            <Text style={s.sosBtnText}>SOS</Text>
          </TouchableOpacity>
        </ScreenContent>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── HERO BANNER (red background) ── */}
          <View style={s.heroBg}>
            <ScreenContent style={{ alignItems: 'center' }}>
              <HeroBanner />
            </ScreenContent>
          </View>

          {/* ── URGENCY NOTICE ── */}
          <View style={[s.urgencyBannerOuter, { backgroundColor: COLORS.dangerLight }]}>
            <ScreenContent style={s.urgencyBanner}>
              <Ionicons name="warning" size={16} color={COLORS.danger} />
              <Text style={s.urgencyText}>
                Emergency workers charge a premium rate. Standard jobs are available via{' '}
                <Text style={s.urgencyLink} onPress={() => router.push('/post-a-job' as any)}>Post a Job</Text>.
              </Text>
            </ScreenContent>
          </View>

          <ScreenContent style={s.body}>

            {/* ── SERVICE SELECTOR ── */}
            <Text style={[s.sectionTitle, { color: T.text }]}>What&apos;s the emergency?</Text>
            <View style={s.chipsGrid}>
              {EMERGENCY_SERVICES.map(svc => (
                <ServiceChip
                  key={svc.id}
                  svc={svc}
                  selected={selectedService === svc.id}
                  onPress={() => setService(svc.id)}
                />
              ))}
            </View>

            {/* Selected service detail card */}
            <View style={[s.svcDetail, { backgroundColor: selectedSvc.color + '10', borderColor: selectedSvc.color + '40' }]}>
              <Text style={s.svcDetailEmoji}>{selectedSvc.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.svcDetailLabel, { color: selectedSvc.color }]}>{selectedSvc.label}</Text>
                <Text style={[s.svcDetailDesc, { color: T.subText }]}>{selectedSvc.desc}</Text>
              </View>
            </View>

            {/* ── DESCRIBE THE ISSUE ── */}
            <Text style={[s.sectionTitle, { color: T.text }]}>Briefly describe the issue</Text>
            <TextInput
              style={[s.descInput, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
              placeholder="e.g. Water is gushing from under the sink…"
              placeholderTextColor={T.subText}
              multiline
              numberOfLines={3}
              value={desc}
              onChangeText={setDesc}
              textAlignVertical="top"
            />

            {/* ── LOCATION ── */}
            <Text style={[s.sectionTitle, { color: T.text }]}>Your location</Text>
            <TouchableOpacity
              style={[s.locationCard, { backgroundColor: T.card, borderColor: T.border }]}
              activeOpacity={0.8}
            >
              <View style={s.locationIconWrap}>
                <Ionicons name="location" size={18} color={COLORS.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.locationPrimary, { color: T.text }]}>Speedsaf Ayeduase, Kumasi</Text>
                <Text style={[s.locationSub, { color: T.subText }]}>Ashanti Region, Ghana</Text>
              </View>
              <View style={s.gpsChip}>
                <Ionicons name="navigate-circle-outline" size={13} color={COLORS.primary} />
                <Text style={s.gpsText}>GPS</Text>
              </View>
            </TouchableOpacity>

            {/* ── ON-CALL WORKERS ── */}
            <View style={s.workerHeader}>
              <Text style={[s.sectionTitle, { color: T.text, marginBottom: 0 }]}>
                On-call workers near you
              </Text>
              <View style={s.liveChip}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>Live</Text>
              </View>
            </View>
            <Text style={[s.workerSub, { color: T.subText }]}>
              These workers are currently available and ready to respond immediately.
            </Text>

            {ON_CALL_WORKERS.map(w => (
              <WorkerCard key={w.id} worker={w} onHire={() => handleDispatch(w)} />
            ))}

            {/* ── INFO / GUARANTEE BOX ── */}
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={s.infoText}>
                Emergency hire guarantees a response within 20 minutes or your booking fee is refunded.
              </Text>
            </View>

            {/* ── BOTTOM CTA ── */}
            <TouchableOpacity style={s.sosAllBtn} onPress={handleSOSAll} activeOpacity={0.88}>
              <MaterialCommunityIcons name="alarm-light-outline" size={20} color="#fff" />
              <Text style={s.sosAllText}>Notify All Nearby Workers Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.cancelBtn, { borderColor: T.border }]}
              onPress={() => router.back()}
              activeOpacity={0.75}
            >
              <Text style={[s.cancelText, { color: T.subText }]}>Cancel — Go Back</Text>
            </TouchableOpacity>

          </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  safe: { flex: 1 },

  /* Header */
  headerOuter: { alignItems: 'center', backgroundColor: COLORS.danger },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },
  sosBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  sosBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.danger },

  /* Hero */
  heroBg: { backgroundColor: COLORS.danger, paddingBottom: 4, alignItems: 'center' },

  /* Urgency banner */
  urgencyBannerOuter: { alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.border },
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  urgencyText: { flex: 1, fontSize: 12, color: COLORS.danger, lineHeight: 18, fontWeight: '500' },
  urgencyLink: { fontWeight: '700', textDecorationLine: 'underline' },

  /* Body */
  body: { padding: 16, paddingBottom: 36 },
  scroll: { paddingBottom: 16 },

  /* Section titles */
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, marginTop: 4 },

  /* Service chips grid */
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  /* Selected service detail */
  svcDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  svcDetailEmoji: { fontSize: 24 },
  svcDetailLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  svcDetailDesc: { fontSize: 12, lineHeight: 17 },

  /* Description input */
  descInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    marginBottom: 20,
    lineHeight: 21,
  },

  /* Location card */
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  locationIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.dangerLight, alignItems: 'center', justifyContent: 'center' },
  locationPrimary: { fontSize: 14, fontWeight: '600' },
  locationSub: { fontSize: 11, marginTop: 2 },
  gpsChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  gpsText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },

  /* Worker list header */
  workerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.dangerLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.danger },
  liveText: { fontSize: 11, color: COLORS.danger, fontWeight: '800' },
  workerSub: { fontSize: 12, lineHeight: 17, marginBottom: 14 },

  /* Info box */
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18, fontWeight: '500' },

  /* SOS all button */
  sosAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: COLORS.danger,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  sosAllText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  /* Cancel */
  cancelBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: '600' },
});
