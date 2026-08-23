import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INITIAL = [
  { id: 1, label: 'Home', address: 'Speedaf Ayeduase, Kumasi', icon: 'home-outline', pinned: true },
  { id: 2, label: 'Work', address: 'Tech Hub, Accra Central', icon: 'briefcase-outline', pinned: true },
  { id: 3, label: 'Gym', address: 'Fit Nation, Osu, Accra', icon: 'fitness-outline', pinned: false },
];

export default function SavedLocationsScreen() {
  const [locations, setLocations] = useState(INITIAL);
  const T = useThemeColors();

  const remove = (id: number) => {
    Alert.alert('Remove', 'Remove this saved location?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setLocations(l => l.filter(x => x.id !== id)) },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.headerInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: T.text }]}>Saved Locations</Text>
          <View style={{ width: 38 }} />
        </ScreenContent>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenContent>

          <View style={[s.mapBox, { backgroundColor: T.inputBg }]}>
            <Ionicons name="map" size={42} color={COLORS.primary + '60'} />
            <Text style={[s.mapText, { color: COLORS.primary }]}>Your saved places appear here</Text>
          </View>

          <Text style={[s.sectionLabel, { color: T.subText }]}>Saved Places</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            {locations.map((loc, i) => (
              <View key={loc.id}>
                {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
                <View style={s.locRow}>
                  <View style={[s.locIcon, { backgroundColor: loc.pinned ? COLORS.primary + '18' : T.inputBg }]}>
                    <Ionicons name={loc.icon as any} size={20} color={loc.pinned ? COLORS.primary : T.subText} />
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
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <TouchableOpacity style={s.addRow} activeOpacity={0.7} onPress={() => Alert.alert('Add Location', 'Location picker coming soon.')}>
              <View style={[s.locIcon, { backgroundColor: COLORS.primary + '18' }]}>
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </View>
              <Text style={[s.locLabel, { color: COLORS.primary }]}>Add a place</Text>
            </TouchableOpacity>
          </View>

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
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  mapBox: { borderRadius: RADIUS.lg, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 10 },
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
