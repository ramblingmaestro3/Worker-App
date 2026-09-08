import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import EmptyState from '@/components/ui/EmptyState';
import AppMap, { AppMapMarker } from '@/components/AppMap';
import { listVerifiedWorkers, VerifiedWorkerSummary } from '@/lib/api/workerProfiles';
import { listBlockedUserIds } from '@/lib/api/blocking';
import { useMyLocation } from '@/lib/useMyLocation';
import { distanceKm } from '@/lib/geo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

/* ─── Data ─── */
const FILTER_CHIPS = ['Filter', 'Price', 'Rating', 'Availability'];

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

type WorkerCard = {
  id: string;
  name: string;
  skill: string;
  rating: number;
  reviews: number;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  initials: string;
  color: string;
  available: boolean;
};

const wc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  initials: { fontSize: 17, fontWeight: '800' },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: COLORS.card,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 1 },
  skill: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rating: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  reviews: { fontSize: 11, color: COLORS.muted },
  distRow: { flexDirection: 'row', alignItems: 'center' },
  dist: { fontSize: 11, color: COLORS.muted },
  priceCol: { alignItems: 'flex-end' },
  fromLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '500', marginBottom: 2 },
  price: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});

/* ─── Sort/filter types ─── */
type SortMode = 'none' | 'rating' | 'price_asc' | 'price_desc' | 'available';

// Fallback map center (Kumasi) used only until the device's real location
// resolves, or if permission is denied — real worker coordinates always
// drive marker placement, nothing here is fabricated per-worker.
const FALLBACK_CENTER = { latitude: 6.6885, longitude: -1.6244 };

function workerToMarker(w: WorkerCard): AppMapMarker | null {
  if (w.latitude == null || w.longitude == null) return null;
  return {
    latitude: w.latitude,
    longitude: w.longitude,
    color: w.color,
    title: w.name,
    subtitle: w.skill,
    price: w.price != null ? `GH₵ ${w.price}` : undefined,
  };
}

/* ─── Main Screen ─── */
export default function SearchScreen({ route, navigation }: Props) {
  const { q } = route.params ?? {};
  const [search, setSearch] = useState(q ?? '');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [filterVisible, setFilterVisible] = useState(false);
  // null = no distance filter -- "See All" from Home should show every
  // verified worker, not just whoever happens to be near the last-picked
  // radius. A radius only kicks in once the user picks one in Filter & Sort.
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const T = useThemeColors();
  const { location: myLoc } = useMyLocation();

  const [rawWorkers, setRawWorkers] = useState<VerifiedWorkerSummary[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
  const workers: WorkerCard[] = rawWorkers
    .filter((w) => !blockedIds.has(w.id))
    .map((w) => ({
      id: w.id,
      name: w.full_name,
      skill: w.skills[0] ?? 'General services',
      rating: w.rating_avg,
      reviews: w.rating_count,
      distanceKm:
        myLoc && w.latitude != null && w.longitude != null
          ? distanceKm(myLoc.latitude, myLoc.longitude, w.latitude, w.longitude)
          : null,
      latitude: w.latitude,
      longitude: w.longitude,
      price: w.hourly_rate ?? w.per_job_rate ?? null,
      initials: initialsOf(w.full_name),
      color: colorForId(w.id),
      available: w.is_online && w.availability.some((d) => d.day === todayAbbrev && d.on),
    }));

  // Chip press handlers
  const handleChipPress = (chip: string) => {
    if (chip === 'Rating') {
      setSortMode(sortMode === 'rating' ? 'none' : 'rating');
    } else if (chip === 'Price') {
      // Cycle: none → price_desc → price_asc → none
      if (sortMode === 'price_desc') setSortMode('price_asc');
      else if (sortMode === 'price_asc') setSortMode('none');
      else setSortMode('price_desc');
    } else if (chip === 'Availability') {
      setSortMode(sortMode === 'available' ? 'none' : 'available');
    }
    // 'Filter' chip has no sort action yet
  };

  const isChipActive = (chip: string) => {
    if (chip === 'Rating') return sortMode === 'rating';
    if (chip === 'Price') return sortMode === 'price_asc' || sortMode === 'price_desc';
    if (chip === 'Availability') return sortMode === 'available';
    return false;
  };

  // 1. Filter by search text
  const searched = workers.filter(w =>
    search.trim().length === 0
      ? true
      : w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.skill.toLowerCase().includes(search.toLowerCase())
  );

  // 2. Filter/sort by active chip + modal filters
  const filtered = [...searched]
    .filter(w => sortMode === 'available' ? w.available : true)
    .filter(w => (minRating != null ? w.rating >= minRating : true))
    .filter(w => (priceMin.trim() ? w.price != null && w.price >= parseFloat(priceMin) : true))
    .filter(w => (priceMax.trim() ? w.price != null && w.price <= parseFloat(priceMax) : true))
    .filter(w => (radiusKm != null ? w.distanceKm == null || w.distanceKm <= radiusKm : true))
    .sort((a, b) => {
      if (sortMode === 'rating') return b.rating - a.rating;
      if (sortMode === 'price_desc') return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      if (sortMode === 'price_asc') return (a.price ?? Infinity) - (b.price ?? Infinity);
      return 0;
    });

  const mapMarkers = filtered.map(workerToMarker).filter((m): m is AppMapMarker => m !== null);
  const mapCenter = myLoc ?? FALLBACK_CENTER;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.card }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.card} />

      <ScreenHeader title="Search Workers" onBack={() => navigation.goBack()} />

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchWrapOuter}>
        <ScreenContent style={[styles.searchWrap, { backgroundColor: T.inputBg }]}>
          <Ionicons name="search-outline" size={18} color={T.subText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: T.text }]}
            placeholder="Search service or worker"
            placeholderTextColor={T.subText}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={T.subText} />
            </TouchableOpacity>
          )}
        </ScreenContent>
      </View>

      {/* ── FILTER CHIPS ── */}
      <View style={styles.chipsRowOuter}>
        <ScreenContent>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {FILTER_CHIPS.map((chip) => {
              const active = isChipActive(chip);
              const iconColor = active ? COLORS.primary : T.subText;
              let label = chip;
              if (chip === 'Price' && sortMode === 'price_desc') label = 'Price ↓';
              if (chip === 'Price' && sortMode === 'price_asc') label = 'Price ↑';
              return (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chip, { backgroundColor: T.card, borderColor: T.border }, active && styles.chipActive]}
                  onPress={() => handleChipPress(chip)}
                  activeOpacity={0.75}
                >
                  {chip === 'Filter' && (<MaterialCommunityIcons name="tune-variant" size={13} color={iconColor} style={{ marginRight: 4 }} />)}
                  {chip === 'Price' && (<Ionicons name="pricetag-outline" size={12} color={iconColor} style={{ marginRight: 4 }} />)}
                  {chip === 'Rating' && (<Ionicons name="star-outline" size={12} color={iconColor} style={{ marginRight: 4 }} />)}
                  {chip === 'Availability' && (<Ionicons name="radio-button-on-outline" size={12} color={iconColor} style={{ marginRight: 4 }} />)}
                  <Text style={[styles.chipText, { color: T.subText }, active && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ScreenContent>
      </View>

      {/* ── LIST / MAP TOGGLE ── */}
      <View style={styles.toggleRowOuter}>
        <ScreenContent style={[styles.toggleRow, { borderColor: T.border }]}>
          <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: T.card }, viewMode === 'list' && styles.toggleBtnActive]} onPress={() => setViewMode('list')} activeOpacity={0.8}>
            <Ionicons name="list" size={15} color={viewMode === 'list' ? COLORS.primary : T.subText} style={{ marginRight: 5 }} />
            <Text style={[styles.toggleText, { color: T.subText }, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: T.card }, viewMode === 'map' && styles.toggleBtnActive]} onPress={() => setViewMode('map')} activeOpacity={0.8}>
            <Ionicons name="map-outline" size={15} color={viewMode === 'map' ? COLORS.primary : T.subText} style={{ marginRight: 5 }} />
            <Text style={[styles.toggleText, { color: T.subText }, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
          </TouchableOpacity>
        </ScreenContent>
      </View>

      {/* ── RESULTS ── */}
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : loadError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load workers"
          body="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => setReloadKey((k) => k + 1)}
          tone="error"
        />
      ) : viewMode === 'list' ? (
        filtered.length > 0 ? (
          <View style={styles.listWrapOuter}>
            <ScreenContent style={styles.listWrap}>
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[wc.card, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => navigation.navigate('WorkerProfile', { id: item.id })} activeOpacity={0.8}>
                    <View style={[wc.avatar, { backgroundColor: item.color + '20' }]}>
                      <Text style={[wc.initials, { color: item.color }]}>{item.initials}</Text>
                      {item.available && <View style={wc.onlineDot} />}
                    </View>
                    <View style={wc.info}>
                      <Text style={[wc.name, { color: T.text }]}>{item.name}</Text>
                      <Text style={[wc.skill, { color: T.subText }]}>{item.skill}</Text>
                      <View style={wc.metaRow}>
                        <Ionicons name="star" size={11} color={COLORS.accent} />
                        <Text style={[wc.rating, { color: T.text }]}> {item.rating.toFixed(1)}</Text>
                        <Text style={[wc.reviews, { color: T.subText }]}> ({item.reviews})</Text>
                      </View>
                      <View style={wc.distRow}>
                        <Ionicons name="location-outline" size={11} color={T.subText} />
                        <Text style={[wc.dist, { color: T.subText }]}>
                          {' '}{item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km away` : 'Distance unavailable'}
                        </Text>
                      </View>
                    </View>
                    <View style={wc.priceCol}>
                      <Text style={[wc.fromLabel, { color: T.subText }]}>From</Text>
                      <Text style={wc.price}>{item.price != null ? `GH₵ ${item.price}` : 'Ask'}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 90 }}
              />
            </ScreenContent>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: T.text }]}>No workers found</Text>
            <Text style={[styles.emptySub, { color: T.subText }]}>Try a different search term or clear your filters.</Text>
          </View>
        )
      ) : (
        <View style={styles.mapWrapOuter}>
          <ScreenContent style={styles.mapWrap}>
            <AppMap
              latitude={mapCenter.latitude}
              longitude={mapCenter.longitude}
              zoom={0.06}
              markers={mapMarkers}
              style={styles.map}
            />
            {filtered.length === 0 && (
              <View style={styles.mapEmptyOverlay} pointerEvents="none">
                <Ionicons name="map" size={48} color={COLORS.primary + '60'} />
                <Text style={[styles.mapText, { color: T.subText }]}>No workers found</Text>
              </View>
            )}
          </ScreenContent>
        </View>
      )}

      <View style={[styles.bottomBarOuter, { backgroundColor: T.card, borderColor: T.navBorder }]}>
        <ScreenContent style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomBtn} activeOpacity={0.8}>
            <MaterialCommunityIcons name="sort" size={18} color={T.text} />
            <Text style={[styles.bottomBtnText, { color: T.text }]}>Sort</Text>
          </TouchableOpacity>
          <View style={[styles.bottomDivider, { backgroundColor: T.border }]} />
          <TouchableOpacity style={styles.bottomBtn} activeOpacity={0.8} onPress={() => setFilterVisible(true)}>
            <MaterialCommunityIcons name="tune-variant" size={18} color={T.text} />
            <Text style={[styles.bottomBtnText, { color: T.text }]}>Filter</Text>
          </TouchableOpacity>
        </ScreenContent>
      </View>

      {/* ── FILTER & SORT MODAL ── */}
      <Modal visible={filterVisible} animationType="slide" transparent onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: T.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={T.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: T.text }]}>Distance Radius</Text>
                <View style={[styles.radiusPill, { backgroundColor: T.inputBg }]}>
                  <Text style={[styles.radiusPillText, { color: T.text }]}>{radiusKm != null ? `${radiusKm} km` : 'Any distance'}</Text>
                </View>
              </View>
              <View style={styles.radiusChipsRow}>
                {[5, 10, 15, 25, 50].map((km) => (
                  <TouchableOpacity
                    key={km}
                    style={[
                      styles.radiusChip,
                      { borderColor: T.border },
                      radiusKm === km && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                    ]}
                    onPress={() => setRadiusKm(radiusKm === km ? null : km)}
                  >
                    <Text style={[styles.radiusChipText, { color: T.text }, radiusKm === km && { color: '#fff' }]}>{km}km</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: T.text, marginTop: 24 }]}>Minimum Rating</Text>
              <View style={styles.ratingRow}>
                {[3.0, 4.0, 4.5].map((r) => {
                  const active = minRating === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.ratingCard,
                        { borderColor: T.border },
                        active && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
                      ]}
                      onPress={() => setMinRating(active ? null : r)}
                    >
                      <Ionicons name="star" size={16} color={COLORS.accent} />
                      <Text style={[styles.ratingCardText, { color: T.text }]}>{r.toFixed(1)}+</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { color: T.text, marginTop: 24 }]}>Price Range (GH₵)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: T.inputBg, color: T.text }]}
                  placeholder="Min"
                  placeholderTextColor={T.subText}
                  keyboardType="numeric"
                  value={priceMin}
                  onChangeText={setPriceMin}
                />
                <Text style={{ color: T.subText }}>—</Text>
                <TextInput
                  style={[styles.priceInput, { backgroundColor: T.inputBg, color: T.text }]}
                  placeholder="Max"
                  placeholderTextColor={T.subText}
                  keyboardType="numeric"
                  value={priceMax}
                  onChangeText={setPriceMax}
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={() => setFilterVisible(false)}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchWrapOuter: { width: '100%', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginHorizontal: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 14 },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14 },

  /* Filter chips */
  chipsRowOuter: { width: '100%', alignItems: 'center' },
  chipsRow: {
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  chipText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  /* List/Map toggle */
  toggleRowOuter: { width: '100%', alignItems: 'center' },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.card,
  },
  toggleBtnActive: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 9,
    backgroundColor: COLORS.card,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  toggleTextActive: {
    color: COLORS.primary,
  },

  /* Empty state */
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },

  /* Map view */
  mapWrapOuter: { flex: 1, width: '100%', alignItems: 'center' },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  mapEmptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapText: { fontSize: 15, color: COLORS.muted, fontWeight: '500' },

  /* Results list */
  listWrapOuter: { flex: 1, width: '100%', alignItems: 'center' },
  listWrap: { flex: 1 },

  /* Bottom bar */
  bottomBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  bottomBar: {
    flexDirection: 'row',
    width: '100%',
    paddingBottom: 24,
    paddingTop: 12,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  bottomBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottomDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.border,
  },

  /* Filter modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalLabel: { fontSize: 15, fontWeight: '700' },
  radiusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  radiusPillText: { fontSize: 13, fontWeight: '700' },
  radiusChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radiusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  radiusChipText: { fontSize: 13, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 10 },
  ratingCard: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 6 },
  ratingCardText: { fontSize: 14, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  applyBtn: { height: 54, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
