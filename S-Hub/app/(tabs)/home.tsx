import { COLORS } from '@/constants/theme';
import { useUnreadMessages } from '@/contexts/unread-messages';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../lib/api';

const SERVICES = [
  { name: 'Plumbing', icon: '🔧' },
  { name: 'Electrical', icon: '⚡' },
  { name: 'Carpentry', icon: '🪚' },
  { name: 'Painting', icon: '🖌️' },
  { name: 'Cleaning', icon: '🧹' },
];

function initialsFromName(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'WK';
}

function mapTopWorker(worker: any) {
  const name = worker.display_name || worker.user?.full_name || 'Worker';
  return {
    id: worker.id,
    name,
    skill: worker.occupation || 'Skilled Worker',
    rating: worker.rating ?? 0,
    reviews: worker.total_reviews ?? 0,
    distance: [worker.city, worker.region].filter(Boolean).join(', ') || 'Nearby',
    price: worker.hourly_rate ?? 0,
    initials: initialsFromName(name),
    color: COLORS.primary,
  };
}

/* ─── AI Help button ─── */
function AIHelpButton() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <TouchableOpacity
      style={styles.aiWrap}
      activeOpacity={0.85}
      onPress={() => router.push('/ai-assistant' as any)}
    >
      <View style={styles.aiGlowOuter}>
        <Animated.View
          style={[
            styles.aiPulseRing,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
            },
          ]}
        />
        <View style={styles.aiGlowInner}>
          <Text style={styles.aiButtonText}>AI</Text>
          <View style={styles.aiSparkleBadge}>
            <Ionicons name="sparkles" size={11} color="#fff" />
          </View>
        </View>
      </View>
      <Text style={styles.aiLabel}>AI Help</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { unreadCount } = useUnreadMessages();
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<number[]>([]);
  const [recommended, setRecommended] = useState<ReturnType<typeof mapTopWorker>[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getTopWorkers({ limit: 5 })
      .then(result => { if (mounted) setRecommended((result.workers || []).map(mapTopWorker)); })
      .catch(() => {})
      .finally(() => mounted && setLoadingWorkers(false));
    return () => { mounted = false; };
  }, []);

  const toggleSave = (id: number) =>
    setSaved((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        {/* Brand row */}
        <View style={styles.brandRow}>
          <View style={styles.logoGroup}>
            {/* Small lightning mark */}
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>⚡</Text>
            </View>
            <Text style={styles.brandName}>Vaker</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7} onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
            {/* Notification dot */}
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Location row */}
        <TouchableOpacity style={styles.locationRow} activeOpacity={0.7}>
          <Ionicons name="location-sharp" size={15} color={COLORS.primary} />
          <Text style={styles.locationText}>Kumasi, Ghana</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.muted} />
        </TouchableOpacity>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="What work do you need done?"
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => search.length > 0 && router.push('/search')}
          />
          {search.length > 0 && (
            <TouchableOpacity
              style={styles.searchGoBtn}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.searchGoBtnText}>Go</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── POPULAR SERVICES ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Services</Text>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesRow}
        >
          {SERVICES.map((svc) => (
            <TouchableOpacity
              key={svc.name}
              style={styles.svcCard}
              activeOpacity={0.75}
              onPress={() => router.push('/search')}
            >
              <View style={styles.svcIconWrap}>
                <Text style={styles.svcIcon}>{svc.icon}</Text>
              </View>
              <Text style={styles.svcLabel}>{svc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── AI HELP ── */}
        <View style={styles.aiSection}>
          <AIHelpButton />
          <View style={styles.aiSectionText}>
            <Text style={styles.aiSectionTitle}>Not sure what you need?</Text>
            <Text style={styles.aiSectionSubtitle}>Snap a photo of the problem and let AI find the right professional for you.</Text>
          </View>
        </View>

        {/* ── EMERGENCY HIRE BANNER ── */}
        <TouchableOpacity
          style={styles.emergencyBanner}
          activeOpacity={0.85}
          onPress={() => router.push('/emergency')}
        >
          {/* Left text */}
          <View style={styles.emergencyLeft}>
            <Text style={styles.emergencyTitle}>Need it urgently?</Text>
            <Text style={styles.emergencySubtitle}>
              Get fast responses from{'\n'}available workers near you.
            </Text>
            <View style={styles.emergencyBtn}>
              <Text style={styles.emergencyBtnText}>Emergency Hire</Text>
            </View>
          </View>

          {/* Right — lightning graphic */}
          <View style={styles.emergencyRight}>
            <View style={styles.boltCircleOuter}>
              <View style={styles.boltCircleInner}>
                <Text style={styles.boltEmoji}>⚡</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── RECOMMENDED FOR YOU ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loadingWorkers && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        )}

        {!loadingWorkers && recommended.length === 0 && (
          <Text style={{ paddingHorizontal: 18, color: COLORS.muted, fontSize: 13 }}>No recommendations yet.</Text>
        )}

        {recommended.map((worker) => (
          <TouchableOpacity
            key={worker.id}
            style={styles.workerCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/worker-profile?id=${worker.id}` as any)}
          >
            {/* Avatar */}
            <View style={[styles.workerAvatar, { backgroundColor: worker.color + '18' }]}>
              <Text style={[styles.workerInitials, { color: worker.color }]}>
                {worker.initials}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{worker.name}</Text>
              <Text style={styles.workerSkill}>{worker.skill}</Text>
              <View style={styles.workerMeta}>
                <Ionicons name="star" size={11} color={COLORS.accent} />
                <Text style={styles.workerRating}> {worker.rating}</Text>
                <Text style={styles.workerReviews}> ({worker.reviews})</Text>
                <Text style={styles.workerDot}> · </Text>
                <Ionicons name="location-outline" size={11} color={COLORS.muted} />
                <Text style={styles.workerDist}> {worker.distance}</Text>
              </View>
            </View>

            {/* Right: heart + price */}
            <View style={styles.workerRight}>
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={(e) => { e.stopPropagation(); toggleSave(worker.id); }}
              >
                <Ionicons
                  name={saved.includes(worker.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={saved.includes(worker.id) ? COLORS.danger : COLORS.muted}
                />
              </TouchableOpacity>
              <Text style={styles.workerFrom}>From</Text>
              <Text style={styles.workerPrice}>GH₵ {worker.price}</Text>
            </View>
          </TouchableOpacity>
        ))}

      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={styles.bottomNav}>
        {[
          { icon: 'home', iconFocused: 'home', label: 'Home', route: '/home', active: true },
          { icon: 'briefcase-outline', iconFocused: 'briefcase', label: 'Jobs', route: '/bookings', active: false },
          { icon: 'add', iconFocused: 'add', label: '', route: '/post-job', center: true },
          { icon: 'chatbubble-outline', iconFocused: 'chatbubble', label: 'Messages', route: '/messages', active: false },
          { icon: 'person-outline', iconFocused: 'person', label: 'Profile', route: '/profile', active: false },
        ].map((tab) =>
          (tab as any).center ? (
            <TouchableOpacity
              key="center"
              style={styles.centerBtn}
              activeOpacity={0.85}
              onPress={() => router.push(tab.route as any)}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={tab.label}
              style={styles.navTab}
              activeOpacity={0.7}
              onPress={() => router.push(tab.route as any)}
            >
              <View>
                <Ionicons
                  name={(tab.active ? tab.iconFocused : tab.icon) as any}
                  size={22}
                  color={tab.active ? COLORS.primary : COLORS.muted}
                />
                {tab.label === 'Messages' && unreadCount > 0 && <View style={styles.navDot} />}
              </View>
              <Text style={[styles.navLabel, tab.active && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  /* ── Header ── */
  header: {
    backgroundColor: COLORS.card,
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  /* Brand row */
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: { fontSize: 14 },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
  },

  /* Location */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  searchGoBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  searchGoBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  scrollContent: { paddingBottom: 110 },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  /* Services row */
  servicesRow: {
    paddingHorizontal: 18,
    gap: 12,
  },
  svcCard: {
    alignItems: 'center',
    gap: 7,
  },
  svcIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  svcIcon: { fontSize: 26 },
  svcLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },

  /* AI Help */
  aiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: '#F4F0FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4D9FF',
  },
  aiWrap: { alignItems: 'center', gap: 6 },
  aiGlowOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  aiGlowInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  aiButtonText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  aiSparkleBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  aiLabel: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  aiSectionText: { flex: 1 },
  aiSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  aiSectionSubtitle: { fontSize: 12, color: COLORS.muted, lineHeight: 17 },

  /* Emergency banner */
  emergencyBanner: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: '#1A1A2E',
    borderRadius: 18,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emergencyLeft: { flex: 1, paddingRight: 10 },
  emergencyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  emergencySubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 19,
    marginBottom: 16,
  },
  emergencyBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  emergencyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emergencyRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltCircleOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(252,209,22,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltCircleInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(252,209,22,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltEmoji: { fontSize: 30 },

  /* Worker cards */
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  workerInitials: {
    fontSize: 17,
    fontWeight: '800',
  },
  workerInfo: { flex: 1 },
  workerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  workerSkill: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 5,
  },
  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerRating: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  workerReviews: {
    fontSize: 11,
    color: COLORS.muted,
  },
  workerDot: {
    fontSize: 11,
    color: COLORS.muted,
  },
  workerDist: {
    fontSize: 11,
    color: COLORS.muted,
  },
  workerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  heartBtn: {
    marginBottom: 6,
    padding: 2,
  },
  workerFrom: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '500',
  },
  workerPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },

  /* Bottom nav */
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: '#ECECEC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 22,
    paddingTop: 10,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.muted,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  navDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});