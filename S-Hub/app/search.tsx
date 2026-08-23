import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
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

/* ─── Data ─── */
const FILTER_CHIPS = ['Filter', 'Price', 'Rating', 'Availability'];

export const WORKERS = [
  {
    id: 1, name: 'Kofi Mensah', skill: 'Plumber',
    rating: 4.8, reviews: 120, distance: '2.1 km',
    price: 450, initials: 'KM', color: COLORS.accent, available: true,
  },
  {
    id: 2, name: 'Kwame Adjei', skill: 'Electrician',
    rating: 4.7, reviews: 89, distance: '1.8 km',
    price: 400, initials: 'KA', color: '#1D6FBA', available: true,
  },
  {
    id: 3, name: 'Yaw Boateng', skill: 'Carpenter',
    rating: 4.6, reviews: 73, distance: '2.5 km',
    price: 350, initials: 'YB', color: '#D97706', available: false,
  },
  {
    id: 4, name: 'Ama Owusu', skill: 'Painter',
    rating: 4.9, reviews: 54, distance: '3.0 km',
    price: 300, initials: 'AO', color: '#7C3AED', available: true,
  },
  {
    id: 5, name: 'Nana Asante', skill: 'Cleaner',
    rating: 4.5, reviews: 38, distance: '1.2 km',
    price: 200, initials: 'NA', color: '#0891B2', available: true,
  },
];

/* ─── Worker Card ─── */
function WorkerCard({ worker, onPress }: { worker: typeof WORKERS[0]; onPress: () => void }) {
  return (
    <TouchableOpacity style={wc.card} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar */}
      <View style={[wc.avatar, { backgroundColor: worker.color + '20' }]}>
        <Text style={[wc.initials, { color: worker.color }]}>{worker.initials}</Text>
        {worker.available && <View style={wc.onlineDot} />}
      </View>

      {/* Info */}
      <View style={wc.info}>
        <Text style={wc.name}>{worker.name}</Text>
        <Text style={wc.skill}>{worker.skill}</Text>
        <View style={wc.metaRow}>
          <Ionicons name="star" size={11} color={COLORS.accent} />
          <Text style={wc.rating}> {worker.rating}</Text>
          <Text style={wc.reviews}> ({worker.reviews})</Text>
        </View>
        <View style={wc.distRow}>
          <Ionicons name="location-outline" size={11} color={COLORS.muted} />
          <Text style={wc.dist}> {worker.distance} away</Text>
        </View>
      </View>

      {/* Price */}
      <View style={wc.priceCol}>
        <Text style={wc.fromLabel}>From</Text>
        <Text style={wc.price}>GH₵ {worker.price}</Text>
      </View>
    </TouchableOpacity>
  );
}

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

/* ─── Main Screen ─── */
export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(q ?? '');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [filterVisible, setFilterVisible] = useState(false);
  const [radiusKm, setRadiusKm] = useState(15);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const T = useThemeColors();

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
  const searched = WORKERS.filter(w =>
    search.trim().length === 0
      ? true
      : w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.skill.toLowerCase().includes(search.toLowerCase())
  );

  // 2. Filter/sort by active chip + modal filters
  const filtered = [...searched]
    .filter(w => sortMode === 'available' ? w.available : true)
    .filter(w => (minRating != null ? w.rating >= minRating : true))
    .filter(w => (priceMin.trim() ? w.price >= parseFloat(priceMin) : true))
    .filter(w => (priceMax.trim() ? w.price <= parseFloat(priceMax) : true))
    .sort((a, b) => {
      if (sortMode === 'rating') return b.rating - a.rating;
      if (sortMode === 'price_desc') return b.price - a.price;
      if (sortMode === 'price_asc') return a.price - b.price;
      return 0;
    });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.card }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.card} />

      {/* ── TOP BAR ── */}
      <View style={[styles.topbarOuter, { backgroundColor: T.card }]}>
        <ScreenContent style={styles.topbar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: T.text }]}>Search Workers</Text>
          <View style={{ width: 38 }} />
        </ScreenContent>
      </View>

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
            onSubmitEditing={() => {
              if (search.trim().length > 0)
                router.push(`/finding-worker?service=${encodeURIComponent(search.trim())}&jobTitle=${encodeURIComponent(search.trim() + ' job')}` as any);
            }}
          />
          {search.length > 0 && (
            <>
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color={T.subText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.findBtn}
                activeOpacity={0.85}
                onPress={() => router.push(`/finding-worker?service=${encodeURIComponent(search.trim())}&jobTitle=${encodeURIComponent(search.trim() + ' job')}` as any)}
              >
                <Text style={styles.findBtnText}>Find</Text>
              </TouchableOpacity>
            </>
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
      {viewMode === 'list' ? (
        filtered.length > 0 ? (
          <View style={styles.listWrapOuter}>
            <ScreenContent style={styles.listWrap}>
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[wc.card, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => router.push(`/worker-profile?id=${item.id}` as any)} activeOpacity={0.8}>
                    <View style={[wc.avatar, { backgroundColor: item.color + '20' }]}>
                      <Text style={[wc.initials, { color: item.color }]}>{item.initials}</Text>
                      {item.available && <View style={wc.onlineDot} />}
                    </View>
                    <View style={wc.info}>
                      <Text style={[wc.name, { color: T.text }]}>{item.name}</Text>
                      <Text style={[wc.skill, { color: T.subText }]}>{item.skill}</Text>
                      <View style={wc.metaRow}>
                        <Ionicons name="star" size={11} color={COLORS.accent} />
                        <Text style={[wc.rating, { color: T.text }]}> {item.rating}</Text>
                        <Text style={[wc.reviews, { color: T.subText }]}> ({item.reviews})</Text>
                      </View>
                      <View style={wc.distRow}>
                        <Ionicons name="location-outline" size={11} color={T.subText} />
                        <Text style={[wc.dist, { color: T.subText }]}> {item.distance} away</Text>
                      </View>
                    </View>
                    <View style={wc.priceCol}>
                      <Text style={[wc.fromLabel, { color: T.subText }]}>From</Text>
                      <Text style={wc.price}>GH₵ {item.price}</Text>
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
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={48} color={COLORS.primary + '60'} />
          <Text style={[styles.mapText, { color: T.subText }]}>Map view coming soon</Text>
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
                  <Text style={[styles.radiusPillText, { color: T.text }]}>{radiusKm} km</Text>
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
                    onPress={() => setRadiusKm(km)}
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
  topbarOuter: { alignItems: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '700' },
  searchWrapOuter: { width: '100%', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginHorizontal: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 14 },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14 },
  findBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  findBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

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

  /* Map placeholder */
  mapPlaceholder: {
    flex: 1,
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
