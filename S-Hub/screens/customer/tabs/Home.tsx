import { Ionicons } from '@expo/vector-icons';
import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s } from '@/lib/scaling';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import AppMap, { AppMapMarker } from '@/components/AppMap';
import { useHasUnreadNotifications } from '@/hooks/use-unread-notifications';
import { listVerifiedWorkers, VerifiedWorkerSummary } from '@/lib/api/workerProfiles';
import { listBlockedUserIds } from '@/lib/api/blocking';
import { useMyLocation } from '@/lib/useMyLocation';
import { distanceKm } from '@/lib/geo';
import type { CustomerTabParamList, RootStackParamList } from '@/navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, 'home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline' },
  { key: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
  { key: 'electrical', label: 'Electrical', icon: 'flash-outline' },
  { key: 'carpentry', label: 'Carpentry', icon: 'hammer-outline' },
  { key: 'painting', label: 'Painting', icon: 'color-palette-outline' },
  { key: 'mechanic', label: 'Mechanic', icon: 'car-outline' },
  { key: 'beauty', label: 'Beauty', icon: 'cut-outline' },
  { key: 'gardening', label: 'Gardening', icon: 'leaf-outline' },
  { key: 'appliances', label: 'Appliances', icon: 'build-outline' },
  { key: 'moving', label: 'Moving', icon: 'car-sport-outline' },
];

const AVATAR_PALETTE = [COLORS.accent, '#1D6FBA', '#D97706', '#7C3AED', '#0891B2', '#2FAE60', '#DC2626'];
function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}
const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type NearbyWorker = {
  id: string;
  name: string;
  skill: string;
  rating: number;
  initials: string;
  color: string;
  available: boolean;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
};

// Map preview fallback center (Kumasi), used only until the device's real
// location resolves or if permission is denied.
const FALLBACK_CENTER = { latitude: 6.6885, longitude: -1.6244 };

export default function HomeScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [query, setQuery] = useState('');
  const hasUnread = useHasUnreadNotifications();
  const { location: myLoc, loading: locLoading } = useMyLocation();

  const [rawWorkers, setRawWorkers] = useState<VerifiedWorkerSummary[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (cancelledRef?: { current: boolean }) => {
    setLoading(true);
    setLoadError(false);
    const [workersResult, blockedResult] = await Promise.all([listVerifiedWorkers(), listBlockedUserIds()]);
    if (cancelledRef?.current) return;
    if (!workersResult.success || !workersResult.data) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setRawWorkers(workersResult.data);
    setBlockedIds(new Set(blockedResult.data ?? []));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      load(cancelledRef);
      return () => { cancelledRef.current = true; };
    }, [load])
  );

  const todayAbbrev = DAY_ABBREVS[new Date().getDay()];
  const nearbyWorkers: NearbyWorker[] = rawWorkers
    .filter((w) => !blockedIds.has(w.id))
    .map((w) => ({
      id: w.id,
      name: w.full_name,
      skill: w.skills[0] ?? 'General services',
      rating: w.rating_avg,
      initials: initialsOf(w.full_name),
      color: colorForId(w.id),
      available: w.is_online && w.availability.some((d) => d.day === todayAbbrev && d.on),
      distanceKm:
        myLoc && w.latitude != null && w.longitude != null
          ? distanceKm(myLoc.latitude, myLoc.longitude, w.latitude, w.longitude)
          : null,
      latitude: w.latitude,
      longitude: w.longitude,
      price: w.hourly_rate ?? w.per_job_rate ?? null,
    }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, 10);

  const mapCenter = myLoc ?? FALLBACK_CENTER;
  const mapMarkers: AppMapMarker[] = nearbyWorkers
    .filter((w) => w.latitude != null && w.longitude != null)
    .map((w) => ({
      latitude: w.latitude as number,
      longitude: w.longitude as number,
      color: w.color,
      title: w.name,
      subtitle: w.skill,
      price: w.price != null ? `GH₵ ${w.price}` : undefined,
    }));

  const locationLabel = myLoc?.label ?? (locLoading ? 'Locating…' : 'Set your location');

  const handleSelectCategory = (categoryKey: string) => {
    navigation.navigate('PostAJob', { category: categoryKey });
  };

  const handleSearch = () => {
    navigation.navigate('Search', query.trim() ? { q: query.trim() } : {});
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => (
        <View>
          <Text style={[styles.greeting, { color: T.subText }]}>Find a worker near</Text>
          <TouchableOpacity style={styles.locationRow} onPress={() => navigation.navigate('SavedLocations')} activeOpacity={0.7}>
            <Ionicons name="location" size={15} color={COLORS.primary} />
            <Text style={[styles.locationText, { color: T.text }]}>{locationLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={T.subText} />
          </TouchableOpacity>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity style={[styles.bellBtn, { backgroundColor: T.inputBg }]} onPress={() => navigation.navigate('Notifications')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={20} color={T.text} />
          {hasUnread && <View style={styles.bellDot} />}
        </TouchableOpacity>
      ),
    });
  }, [navigation, T, hasUnread, locationLabel]);

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ── Search bar ── */}
          <View style={styles.searchWrap}>
            <Input
              icon={<Ionicons name="search-outline" size={18} color={T.subText} />}
              placeholder="What do you need done today?"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              trailing={
                <TouchableOpacity style={styles.searchGo} onPress={handleSearch} activeOpacity={0.85}>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              }
            />
          </View>

          {/* ── Map preview ── */}
          <TouchableOpacity style={styles.mapCard} onPress={() => navigation.navigate('Search', {})} activeOpacity={0.9}>
            <AppMap
              latitude={mapCenter.latitude}
              longitude={mapCenter.longitude}
              zoom={0.045}
              markers={mapMarkers}
              scrollEnabled={false}
              zoomEnabled={false}
              style={styles.map}
            />
            <View style={styles.mapOverlay} pointerEvents="none">
              <View style={[styles.mapPill, { backgroundColor: T.card }]}>
                <View style={styles.mapPillDot} />
                <Text style={[styles.mapPillText, { color: T.text }]}>{nearbyWorkers.length} workers nearby</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ── AI Help ── */}
          <TouchableOpacity onPress={() => navigation.navigate('AiAssistant')} activeOpacity={0.9}>
            <Card style={styles.aiCard}>
              <View style={styles.aiIconWrap}>
                <Ionicons name="sparkles" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiTitle, { color: T.text }]}>Not sure who to hire?</Text>
                <Text style={[styles.aiBody, { color: T.subText }]}>
                  Snap a photo of the problem — AI identifies it and finds the right pro.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.subText} />
            </Card>
          </TouchableOpacity>

          {/* ── Categories ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Browse by category</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, { backgroundColor: T.card, borderColor: T.border }]}
                onPress={() => handleSelectCategory(cat.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name={cat.icon as any} size={22} color={COLORS.primary} />
                </View>
                <Text style={[styles.categoryLabel, { color: T.text }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Nearby workers ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Workers near you</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search', {})}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.workerRowLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : loadError ? (
            <TouchableOpacity style={styles.workerRowError} onPress={() => setReloadKey((k) => k + 1)} activeOpacity={0.8}>
              <Ionicons name="cloud-offline-outline" size={18} color={T.subText} />
              <Text style={[styles.workerRowErrorText, { color: T.subText }]}>Couldn&apos;t load workers — tap to retry</Text>
            </TouchableOpacity>
          ) : nearbyWorkers.length === 0 ? (
            <Text style={[styles.workerRowErrorText, { color: T.subText, paddingVertical: 8 }]}>No verified workers nearby yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workerRow}>
              {nearbyWorkers.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.workerCard, { backgroundColor: T.card, borderColor: T.border }]}
                  onPress={() => navigation.navigate('WorkerProfile', { id: w.id })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.workerAvatar, { backgroundColor: w.color + '20' }]}>
                    <Text style={[styles.workerInitials, { color: w.color }]}>{w.initials}</Text>
                    {w.available && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={[styles.workerName, { color: T.text }]} numberOfLines={1}>{w.name}</Text>
                  <Text style={[styles.workerSkill, { color: T.subText }]} numberOfLines={1}>{w.skill}</Text>
                  <View style={styles.workerMetaRow}>
                    <Ionicons name="star" size={11} color={COLORS.accent} />
                    <Text style={[styles.workerRating, { color: T.text }]}>{w.rating.toFixed(1)}</Text>
                    {w.distanceKm != null && (
                      <Text style={[styles.workerDist, { color: T.subText }]}> · {w.distanceKm.toFixed(1)} km</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Trust banner ── */}
          <Card style={styles.trustBanner}>
            <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustTitle, { color: T.text }]}>Vetted Professionals</Text>
              <Text style={[styles.trustBody, { color: T.subText }]}>
                All service providers undergo a rigorous background check and identity verification.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  greeting: { fontSize: 11.5, fontWeight: '500', marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 17, fontWeight: '800' },
  bellBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger },

  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120, alignItems: 'center' },
  content: { width: '100%', maxWidth: s(544) },

  /* Search */
  searchWrap: { marginBottom: 16 },
  searchGo: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  /* Map preview */
  mapCard: { height: 160, borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', left: 12, bottom: 12 },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  mapPillDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.accent },
  mapPillText: { fontSize: 12, fontWeight: '700' },

  /* AI Help */
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  aiIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  aiBody: { fontSize: 12, lineHeight: 16 },

  /* Sections */
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  seeAll: { fontSize: 12.5, fontWeight: '600', color: COLORS.primary },

  /* Categories */
  categoryRow: { gap: 12, paddingBottom: 4, paddingRight: 4 },
  categoryChip: { width: 84, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 14, gap: 8 },
  categoryIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 11.5, fontWeight: '600', textAlign: 'center' },

  /* Nearby workers */
  workerRow: { gap: 12, paddingBottom: 4, paddingRight: 4 },
  workerRowLoading: { height: 120, alignItems: 'center', justifyContent: 'center' },
  workerRowError: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  workerRowErrorText: { fontSize: 12.5, fontWeight: '500' },
  workerCard: { width: 140, borderWidth: 1, borderRadius: RADIUS.lg, padding: 14, gap: 4 },
  workerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative' },
  workerInitials: { fontSize: 15, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent, borderWidth: 1.5, borderColor: '#fff' },
  workerName: { fontSize: 13.5, fontWeight: '700' },
  workerSkill: { fontSize: 11.5 },
  workerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  workerRating: { fontSize: 11.5, fontWeight: '700' },
  workerDist: { fontSize: 11 },

  /* Trust */
  trustBanner: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  trustTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  trustBody: { fontSize: 13, lineHeight: 18 },
});
