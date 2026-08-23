import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { s } from '@/lib/scaling';
import CustomerNav from '@/components/CustomerNav';
import AppMap, { AppMapMarker } from '@/components/AppMap';
import { WORKERS } from './search';

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

// Map preview center — placeholder until real device geolocation is wired
// up (Phase 4). Markers are derived from the same WORKERS list search.tsx
// uses, jittered around the center so the preview isn't empty.
const MAP_CENTER = { latitude: 6.6885, longitude: -1.6244 };
const NEARBY_MARKERS: AppMapMarker[] = WORKERS.map((w, i) => {
  const angle = (i / WORKERS.length) * Math.PI * 2;
  const radius = 0.012 + (i % 3) * 0.006;
  return {
    latitude: MAP_CENTER.latitude + Math.sin(angle) * radius,
    longitude: MAP_CENTER.longitude + Math.cos(angle) * radius,
    color: w.color,
    title: w.name,
    subtitle: w.skill,
    price: `GH₵ ${w.price}`,
  };
});

export default function HomeScreen() {
  const T = useThemeColors();
  const [query, setQuery] = useState('');

  const handleSelectCategory = (categoryKey: string) => {
    router.push({ pathname: '/post-a-job', params: { category: categoryKey } } as any);
  };

  const handleSearch = () => {
    router.push({ pathname: '/search', params: query.trim() ? { q: query.trim() } : {} } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View>
            <Text style={[styles.greeting, { color: T.subText }]}>Find a worker near</Text>
            <TouchableOpacity style={styles.locationRow} onPress={() => router.push('/saved-locations' as any)} activeOpacity={0.7}>
              <Ionicons name="location" size={15} color={COLORS.primary} />
              <Text style={[styles.locationText, { color: T.text }]}>Kumasi, Ashanti</Text>
              <Ionicons name="chevron-down" size={14} color={T.subText} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.bellBtn, { backgroundColor: T.inputBg }]} onPress={() => router.push('/notifications' as any)} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={T.text} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* ── Search bar ── */}
          <View style={[styles.searchWrap, { backgroundColor: T.inputBg }]}>
            <Ionicons name="search-outline" size={18} color={T.subText} />
            <TextInput
              style={[styles.searchInput, { color: T.text }]}
              placeholder="What do you need done today?"
              placeholderTextColor={T.subText}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchGo} onPress={handleSearch} activeOpacity={0.85}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Map preview ── */}
          <TouchableOpacity style={styles.mapCard} onPress={() => router.push('/search' as any)} activeOpacity={0.9}>
            <AppMap
              latitude={MAP_CENTER.latitude}
              longitude={MAP_CENTER.longitude}
              zoom={0.045}
              markers={NEARBY_MARKERS}
              scrollEnabled={false}
              zoomEnabled={false}
              style={styles.map}
            />
            <View style={styles.mapOverlay} pointerEvents="none">
              <View style={[styles.mapPill, { backgroundColor: T.card }]}>
                <View style={styles.mapPillDot} />
                <Text style={[styles.mapPillText, { color: T.text }]}>{WORKERS.length} workers nearby</Text>
              </View>
            </View>
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
            <TouchableOpacity onPress={() => router.push('/search' as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workerRow}>
            {WORKERS.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.workerCard, { backgroundColor: T.card, borderColor: T.border }]}
                onPress={() => router.push(`/worker-profile?id=${w.id}` as any)}
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
                  <Text style={[styles.workerRating, { color: T.text }]}>{w.rating}</Text>
                  <Text style={[styles.workerDist, { color: T.subText }]}> · {w.distance}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Trust banner ── */}
          <View style={[styles.trustBanner, { backgroundColor: T.inputBg, borderColor: T.border }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.trustTitle, { color: T.text }]}>Vetted Professionals</Text>
              <Text style={[styles.trustBody, { color: T.subText }]}>
                All service providers undergo a rigorous background check and identity verification.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <CustomerNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingVertical: 12 },
  headerInner: { width: '100%', maxWidth: s(544), flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { fontSize: 11.5, fontWeight: '500', marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 17, fontWeight: '800' },
  bellBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger },

  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120, alignItems: 'center' },
  content: { width: '100%', maxWidth: s(544) },

  /* Search */
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  searchGo: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  /* Map preview */
  mapCard: { height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', left: 12, bottom: 12 },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  mapPillDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22C55E' },
  mapPillText: { fontSize: 12, fontWeight: '700' },

  /* Sections */
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  seeAll: { fontSize: 12.5, fontWeight: '600', color: COLORS.primary },

  /* Categories */
  categoryRow: { gap: 12, paddingBottom: 4, paddingRight: 4 },
  categoryChip: { width: 84, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 18, paddingVertical: 14, gap: 8 },
  categoryIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 11.5, fontWeight: '600', textAlign: 'center' },

  /* Nearby workers */
  workerRow: { gap: 12, paddingBottom: 4, paddingRight: 4 },
  workerCard: { width: 140, borderWidth: 1, borderRadius: 18, padding: 14, gap: 4 },
  workerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative' },
  workerInitials: { fontSize: 15, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#fff' },
  workerName: { fontSize: 13.5, fontWeight: '700' },
  workerSkill: { fontSize: 11.5 },
  workerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  workerRating: { fontSize: 11.5, fontWeight: '700' },
  workerDist: { fontSize: 11 },

  /* Trust */
  trustBanner: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 16, marginTop: 4, borderRadius: 20, borderWidth: 1 },
  trustTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  trustBody: { fontSize: 13, lineHeight: 18 },
});
