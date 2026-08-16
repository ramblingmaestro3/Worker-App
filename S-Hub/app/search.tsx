import { COLORS } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';

/* ─── Data ─── */
const FILTER_CHIPS = ['Filter', 'Price', 'Rating', 'Availability'];

type WorkerCardData = {
  id: number; name: string; skill: string;
  rating: number; reviews: number; distance: string;
  price: number; initials: string; color: string; available: boolean;
};

function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'WK';
}

function mapApiWorker(worker: any): WorkerCardData {
  const name = worker.display_name || worker.user?.full_name || 'Worker';
  return {
    id: worker.id,
    name,
    skill: worker.occupation || worker.skills?.[0] || 'Skilled Worker',
    rating: worker.rating ?? 0,
    reviews: worker.total_reviews ?? 0,
    distance: worker.city || worker.region || 'Nearby',
    price: worker.hourly_rate ?? 0,
    initials: initialsFromName(name),
    color: '#006B3F',
    available: Boolean(worker.is_available),
  };
}

/* ─── Worker Card ─── */
function WorkerCard({ worker, onPress }: { worker: WorkerCardData; onPress: () => void }) {
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F2F2F2',
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
    borderColor: '#fff',
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 1 },
  skill: { fontSize: 12, color: '#6B6B6B', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rating: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  reviews: { fontSize: 11, color: '#6B6B6B' },
  distRow: { flexDirection: 'row', alignItems: 'center' },
  dist: { fontSize: 11, color: '#6B6B6B' },
  priceCol: { alignItems: 'flex-end' },
  fromLabel: { fontSize: 10, color: '#6B6B6B', fontWeight: '500', marginBottom: 2 },
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
  const [workers, setWorkers] = useState<WorkerCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.searchWorkers({
      skills: search.trim() || undefined,
      is_available: sortMode === 'available' ? true : undefined,
      min_rating: sortMode === 'rating' ? 4 : undefined,
    })
      .then(result => {
        if (!mounted) return;
        setWorkers((result.items || []).map(mapApiWorker));
        setLoadError(false);
      })
      .catch(() => {
        if (!mounted) return;
        setWorkers([]);
        setLoadError(true);
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [search, sortMode]);

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

  // 2. Filter/sort by active chip
  const filtered = [...searched]
    .filter(w => sortMode === 'available' ? w.available : true)
    .sort((a, b) => {
      if (sortMode === 'rating') return b.rating - a.rating;
      if (sortMode === 'price_desc') return b.price - a.price;
      if (sortMode === 'price_asc') return a.price - b.price;
      return 0;
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── TOP BAR ── */}
      <View style={styles.topbar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Search Workers</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#AAAAAA" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search service or worker"
          placeholderTextColor="#AAAAAA"
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
              <Ionicons name="close-circle" size={18} color="#AAAAAA" />
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
      </View>

      {/* ── FILTER CHIPS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = isChipActive(chip);
          const iconColor = active ? COLORS.primary : '#6B6B6B';
          // Price chip label shows sort direction arrow
          let label = chip;
          if (chip === 'Price' && sortMode === 'price_desc') label = 'Price ↓';
          if (chip === 'Price' && sortMode === 'price_asc') label = 'Price ↑';

          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => handleChipPress(chip)}
              activeOpacity={0.75}
            >
              {chip === 'Filter' && (
                <MaterialCommunityIcons name="tune-variant" size={13} color={iconColor} style={{ marginRight: 4 }} />
              )}
              {chip === 'Price' && (
                <Ionicons name="pricetag-outline" size={12} color={iconColor} style={{ marginRight: 4 }} />
              )}
              {chip === 'Rating' && (
                <Ionicons name="star-outline" size={12} color={iconColor} style={{ marginRight: 4 }} />
              )}
              {chip === 'Availability' && (
                <Ionicons name="radio-button-on-outline" size={12} color={iconColor} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── LIST / MAP TOGGLE ── */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="list"
            size={15}
            color={viewMode === 'list' ? COLORS.primary : '#6B6B6B'}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          onPress={() => setViewMode('map')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="map-outline"
            size={15}
            color={viewMode === 'map' ? COLORS.primary : '#6B6B6B'}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── RESULTS ── */}
      {viewMode === 'list' ? (
        loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : loadError ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={44} color="#AAAAAA" />
            <Text style={styles.emptyTitle}>Couldn't load workers</Text>
            <Text style={styles.emptySub}>Check your connection and try again.</Text>
          </View>
        ) : filtered.length > 0 ? (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <WorkerCard
                worker={item}
                onPress={() => router.push(`/worker-profile?id=${item.id}` as any)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No workers found</Text>
            <Text style={styles.emptySub}>Try a different search term or clear your filters.</Text>
          </View>
        )
      ) : (
        /* Map placeholder */
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={48} color={COLORS.primary + '60'} />
          <Text style={styles.mapText}>Map view coming soon</Text>
        </View>
      )}

      {/* ── BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons name="sort" size={18} color={COLORS.text} />
          <Text style={styles.bottomBtnText}>Sort</Text>
        </TouchableOpacity>

        <View style={styles.bottomDivider} />

        <TouchableOpacity style={styles.bottomBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons name="tune-variant" size={18} color={COLORS.text} />
          <Text style={styles.bottomBtnText}>Filter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  /* Topbar */
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 14,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  findBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  findBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* Filter chips */
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
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  chipText: {
    fontSize: 12,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  /* List/Map toggle */
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  toggleBtnActive: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
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
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#6B6B6B', textAlign: 'center', lineHeight: 20 },

  /* Map placeholder */
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapText: { fontSize: 15, color: '#6B6B6B', fontWeight: '500' },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ECECEC',
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
    color: '#1A1A1A',
  },
  bottomDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E8E8E8',
  },
});
