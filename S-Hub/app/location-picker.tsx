import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { s, vs, ms } from '@/lib/scaling';
import ScreenContent from '@/components/ScreenContent';
import InteractiveMapPicker, { InteractiveMapPickerHandle } from '@/components/InteractiveMapPicker';
import { setPickedLocation } from '@/lib/locationPickerBridge';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
  'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
  'Upper East', 'Upper West', 'Volta', 'Western', 'Western North',
];

function normalizeRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+region$/i, '').trim();
  return GHANA_REGIONS.find((r) => r.toLowerCase() === cleaned.toLowerCase()) ?? null;
}

const DEFAULT_CENTER = { latitude: 6.6885, longitude: -1.6244 };
const IS_WEB = Platform.OS === 'web';

export default function LocationPickerScreen() {
  const T = useThemeColors();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const mapRef = useRef<InteractiveMapPickerHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialLat = params.lat ? parseFloat(params.lat) : DEFAULT_CENTER.latitude;
  const initialLng = params.lng ? parseFloat(params.lng) : DEFAULT_CENTER.longitude;

  const [coords, setCoords] = useState({ latitude: initialLat, longitude: initialLng });
  const [address, setAddress] = useState('');
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locating, setLocating] = useState(false);
  const [region, setRegion] = useState<string | null>(null);

  const resolveAddressNative = (latitude: number, longitude: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setResolvingAddress(true);
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        const r = results[0];
        if (r) {
          const parts = [r.street, r.district ?? r.subregion, r.city, r.region].filter(Boolean);
          setAddress(parts.join(', '));
          setRegion(normalizeRegion(r.region));
        }
      } catch {
        // Reverse geocoding can fail offline or on some emulators — leave the address field editable either way.
      } finally {
        setResolvingAddress(false);
      }
    }, 500);
  };

  const resolveAddressWeb = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await res.json();
      if (data?.display_name) setAddress(data.display_name);
      setRegion(normalizeRegion(data?.address?.state));
    } catch {
      // Leave the address field for the user to fill in manually.
    }
  };

  const handleRegionChangeComplete = (r: { latitude: number; longitude: number }) => {
    setCoords(r);
    resolveAddressNative(r.latitude, r.longitude);
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const pos = await Location.getCurrentPositionAsync({});
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(next);
      mapRef.current?.animateToRegion(next);
      if (IS_WEB) {
        setResolvingAddress(true);
        await resolveAddressWeb(next.latitude, next.longitude);
        setResolvingAddress(false);
      } else {
        resolveAddressNative(next.latitude, next.longitude);
      }
    } catch {
      // Location services unavailable/denied at the OS level — leave the map at its current position.
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    setPickedLocation({ latitude: coords.latitude, longitude: coords.longitude, address: address.trim(), region });
    router.back();
  };

  return (
    <SafeAreaView style={[s_.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <View style={[s_.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s_.headerInner}>
          <TouchableOpacity style={s_.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[s_.title, { color: T.text }]}>Select Location</Text>
          <View style={{ width: 38 }} />
        </ScreenContent>
      </View>

      <View style={s_.mapWrap}>
        <InteractiveMapPicker
          ref={mapRef}
          initialLatitude={initialLat}
          initialLongitude={initialLng}
          onRegionChangeComplete={handleRegionChangeComplete}
        />
      </View>

      <View style={[s_.panel, { backgroundColor: T.card, borderColor: T.border }]}>
        <ScreenContent>
          {IS_WEB && (
            <Text style={[s_.webNote, { color: T.subText }]}>
              Dragging the map isn't supported on web — use your current location or type the address directly.
            </Text>
          )}

          <TouchableOpacity style={s_.currentLocBtn} onPress={handleUseCurrentLocation} activeOpacity={0.8} disabled={locating}>
            {locating ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="locate" size={16} color={COLORS.primary} />}
            <Text style={s_.currentLocText}>Use current location</Text>
          </TouchableOpacity>

          <View style={[s_.addressBox, { backgroundColor: T.inputBg }]}>
            <Ionicons name="location-outline" size={18} color={T.subText} />
            <TextInput
              style={[s_.addressInput, { color: T.text }]}
              placeholder={resolvingAddress ? 'Resolving address…' : IS_WEB ? 'Type your address' : 'Address'}
              placeholderTextColor={T.subText}
              value={address}
              onChangeText={setAddress}
              multiline
            />
            {resolvingAddress && <ActivityIndicator size="small" color={T.subText} />}
          </View>

          <TouchableOpacity
            style={[s_.confirmBtn, IS_WEB && !address.trim() && { opacity: 0.5 }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={IS_WEB && !address.trim()}
          >
            <Text style={s_.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </ScreenContent>
      </View>
    </SafeAreaView>
  );
}

const s_ = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: s(16), paddingVertical: vs(12), borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: s(38), height: s(38), alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: ms(17), fontWeight: '700' },

  mapWrap: { flex: 1 },

  panel: { borderTopWidth: 1, paddingVertical: vs(16) },
  webNote: { fontSize: ms(12), marginHorizontal: s(20), marginBottom: vs(12), lineHeight: ms(17) },
  currentLocBtn: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginHorizontal: s(20), marginBottom: vs(12) },
  currentLocText: { fontSize: ms(13.5), fontWeight: '700', color: COLORS.primary },
  addressBox: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10), marginHorizontal: s(20), borderRadius: RADIUS.md, padding: s(12), marginBottom: vs(14) },
  addressInput: { flex: 1, fontSize: ms(13.5), minHeight: vs(20) },
  confirmBtn: {
    marginHorizontal: s(20), height: vs(52), borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnText: { fontSize: ms(15), fontWeight: '700', color: '#fff' },
});
