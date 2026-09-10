/**
 * CRUD for the client's saved addresses (Home, Work, …) — listSavedLocations /
 * createSavedLocation / deleteSavedLocation. Add flow goes through LocationPicker.
 */
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import EmptyState from '@/components/ui/EmptyState';
import AppMap, { AppMapMarker } from '@/components/AppMap';
import { consumePickedLocation } from '@/lib/locationPickerBridge';
import { listSavedLocations, createSavedLocation, deleteSavedLocation, SavedLocation } from '@/lib/api/savedLocations';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedLocations'>;

const FALLBACK_CENTER = { latitude: 6.6885, longitude: -1.6244 }; // Kumasi

function iconFor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('home')) return 'home-outline';
  if (l.includes('work') || l.includes('office')) return 'briefcase-outline';
  if (l.includes('gym') || l.includes('fit')) return 'fitness-outline';
  return 'location-outline';
}

export default function SavedLocationsScreen({ navigation }: Props) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const T = useThemeColors();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const result = await listSavedLocations();
    if (result.success) {
      setLocations(result.data ?? []);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  const remove = (id: string) => {
    Alert.alert('Remove', 'Remove this saved location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const previous = locations;
          setLocations((l) => l.filter((x) => x.id !== id));
          const result = await deleteSavedLocation(id);
          if (!result.success) {
            setLocations(previous);
            Alert.alert('Could Not Remove', result.error ?? 'Something went wrong. Please try again.');
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await load();
        if (cancelled) return;

        const picked = consumePickedLocation();
        if (picked) {
          const result = await createSavedLocation({
            label: picked.address.split(',')[0] || 'New Place',
            address: picked.address,
            latitude: picked.latitude,
            longitude: picked.longitude,
          });
          if (!cancelled && result.success && result.data) {
            setLocations((prev) => [...prev, result.data!]);
          }
        }
      })();
      return () => { cancelled = true; };
    }, [load])
  );

  const mapMarkers: AppMapMarker[] = locations.map((loc) => ({
    latitude: loc.latitude,
    longitude: loc.longitude,
    color: COLORS.primary,
    title: loc.label,
    subtitle: loc.address,
  }));
  const mapCenter = locations.length
    ? {
        latitude: locations.reduce((sum, l) => sum + l.latitude, 0) / locations.length,
        longitude: locations.reduce((sum, l) => sum + l.longitude, 0) / locations.length,
      }
    : FALLBACK_CENTER;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <ScreenHeader title="Saved Locations" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenContent>

          <View style={[s.mapBox, { backgroundColor: T.inputBg }]}>
            <AppMap
              latitude={mapCenter.latitude}
              longitude={mapCenter.longitude}
              zoom={1.8}
              markers={mapMarkers}
              zoomEnabled={false}
              scrollEnabled={false}
              style={s.map}
            />
            {locations.length === 0 && (
              <View style={s.mapEmptyOverlay} pointerEvents="none">
                <Ionicons name="map" size={42} color={COLORS.primary + '60'} />
                <Text style={[s.mapText, { color: COLORS.primary }]}>Your saved places appear here</Text>
              </View>
            )}
          </View>

          <Text style={[s.sectionLabel, { color: T.subText }]}>Saved Places</Text>
          {loading ? (
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border, padding: 24, alignItems: 'center' }]}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load your saved places"
              body="Check your connection and try again."
              actionLabel="Retry"
              onAction={load}
              tone="error"
            />
          ) : (
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
              {locations.map((loc, i) => (
                <View key={loc.id}>
                  {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
                  <View style={s.locRow}>
                    <View style={[s.locIcon, { backgroundColor: COLORS.primary + '18' }]}>
                      <Ionicons name={iconFor(loc.label) as any} size={20} color={COLORS.primary} />
                    </View>
                    <View style={s.locInfo}>
                      <Text style={[s.locLabel, { color: T.text }]}>{loc.label}</Text>
                      <Text style={[s.locAddress, { color: T.subText }]} numberOfLines={1}>{loc.address}</Text>
                    </View>
                    <TouchableOpacity style={s.removeBtn} onPress={() => remove(loc.id)}>
                      <Ionicons name="close-circle-outline" size={20} color={T.subText} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {locations.length > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
              <TouchableOpacity style={s.addRow} activeOpacity={0.7} onPress={() => navigation.navigate('LocationPicker', {})}>
                <View style={[s.locIcon, { backgroundColor: COLORS.primary + '18' }]}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </View>
                <Text style={[s.locLabel, { color: COLORS.primary }]}>Add a place</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[s.sectionLabel, { color: T.subText }]}>Recent Searches</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            {['Accra Mall, Accra', 'Kejetia Market, Kumasi', 'Tema Station, Accra'].map((place, i) => (
              <View key={place}>
                {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
                <TouchableOpacity style={s.recentRow} activeOpacity={0.7}>
                  <Ionicons name="time-outline" size={18} color={T.subText} style={{ width: 22 }} />
                  <Text style={[s.recentText, { color: T.text }]}>{place}</Text>
                  <Ionicons name="chevron-forward" size={16} color={T.subText} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

        </ScreenContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  mapBox: { borderRadius: RADIUS.lg, height: 140, marginBottom: 20, overflow: 'hidden' },
  map: { flex: 1 },
  mapEmptyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10 },
  mapText: { fontSize: 13, fontWeight: '500' },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderRadius: RADIUS.lg, marginBottom: 20, borderWidth: 1, overflow: 'hidden' },
  divider: { height: 1, marginLeft: 56 },
  locRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  locIcon: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  locInfo: { flex: 1 },
  locLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  locAddress: { fontSize: 12 },
  removeBtn: { padding: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  recentText: { flex: 1, fontSize: 13 },
});
