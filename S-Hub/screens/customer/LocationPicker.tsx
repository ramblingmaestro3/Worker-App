import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/lib/scaling';
import ScreenContent from '@/components/ScreenContent';
import InteractiveMapPicker, { InteractiveMapPickerHandle } from '@/components/InteractiveMapPicker';
import { setPickedLocation } from '@/lib/locationPickerBridge';
import {
  getPlaceDetails,
  newSessionToken,
  normalizeRegion,
  reverseGeocode,
  searchPlaces,
  type GeoSuggestion,
} from '@/lib/geocoding';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPicker'>;

const DEFAULT_CENTER = { latitude: 6.6885, longitude: -1.6244 };
const IS_WEB = Platform.OS === 'web';

export default function LocationPickerScreen({ route, navigation }: Props) {
  const T = useThemeColors();
  const params = route.params ?? {};
  const mapRef = useRef<InteractiveMapPickerHandle>(null);
  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<string>(newSessionToken());
  // A programmatic move (pick a suggestion / use current location) also triggers
  // onRegionChangeComplete on native. Suppress the reverse-geocode for a short
  // window after one so the precise picked address isn't overwritten.
  const suppressReverseUntilRef = useRef(0);

  const initialLat = params.lat ? parseFloat(params.lat) : DEFAULT_CENTER.latitude;
  const initialLng = params.lng ? parseFloat(params.lng) : DEFAULT_CENTER.longitude;

  const [coords, setCoords] = useState({ latitude: initialLat, longitude: initialLng });
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locating, setLocating] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: 'Select Location' });
  }, [navigation]);

  const resolveAddress = (latitude: number, longitude: number) => {
    if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
    reverseDebounceRef.current = setTimeout(async () => {
      setResolvingAddress(true);
      try {
        if (IS_WEB) {
          const r = await reverseGeocode(latitude, longitude);
          if (r.address) setAddress(r.address);
          setRegion(r.region);
        } else {
          const results = await Location.reverseGeocodeAsync({ latitude, longitude });
          const r = results[0];
          if (r) {
            const parts = [r.street, r.district ?? r.subregion, r.city, r.region].filter(Boolean);
            setAddress(parts.join(', '));
            setRegion(normalizeRegion(r.region));
          }
        }
      } catch {
        // Reverse geocoding can fail (offline, no key, emulator) — leave the field editable.
      } finally {
        setResolvingAddress(false);
      }
    }, IS_WEB ? 350 : 500);
  };

  const moveMap = (next: { latitude: number; longitude: number }) => {
    suppressReverseUntilRef.current = Date.now() + 1500;
    mapRef.current?.animateToRegion(next);
  };

  const handleRegionChangeComplete = (r: { latitude: number; longitude: number }) => {
    setCoords(r);
    if (Date.now() < suppressReverseUntilRef.current) return;
    resolveAddress(r.latitude, r.longitude);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text, { sessionToken: sessionTokenRef.current, near: coords });
        setSuggestions(results);
        setSearchError(false);
      } catch {
        setSuggestions([]);
        setSearchError(true);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const handlePickSuggestion = async (item: GeoSuggestion) => {
    Keyboard.dismiss();
    setSuggestions([]);
    setSearchText(item.primary);
    setResolvingAddress(true);
    try {
      const detail = await getPlaceDetails(item.placeId, sessionTokenRef.current);
      sessionTokenRef.current = newSessionToken();
      const next = { latitude: detail.latitude, longitude: detail.longitude };
      setCoords(next);
      setAddress(detail.address || item.secondary || item.primary);
      setRegion(detail.region);
      moveMap(next);
    } catch {
      // Details lookup failed — keep the previous selection.
    } finally {
      setResolvingAddress(false);
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setSuggestions([]);
    setSearching(false);
    setSearchError(false);
    sessionTokenRef.current = newSessionToken();
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const pos = await Location.getCurrentPositionAsync({});
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(next);
      moveMap(next);
      resolveAddress(next.latitude, next.longitude);
    } catch {
      // Location services unavailable/denied at the OS level — leave the map where it is.
    } finally {
      setLocating(false);
    }
  };

  // Resolve the starting point's address once so the field isn't blank on open.
  useEffect(() => {
    resolveAddress(initialLat, initialLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = () => {
    setPickedLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: address.trim(),
      region,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[s_.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <View style={s_.mapArea}>
        <View style={[s_.mapCard, { borderColor: T.border, backgroundColor: T.inputBg }]}>
          <InteractiveMapPicker
            ref={mapRef}
            initialLatitude={initialLat}
            initialLongitude={initialLng}
            onRegionChangeComplete={handleRegionChangeComplete}
            onMoveStart={() => {
              // A hands-on drag always wins over a just-completed programmatic move.
              suppressReverseUntilRef.current = 0;
              setSuggestions([]);
              setResolvingAddress(true);
            }}
          />

          {/* ── Search bar overlay ── */}
          <View style={s_.searchOverlay} pointerEvents="box-none">
            <View style={[s_.searchBox, { backgroundColor: T.card, borderColor: T.border }]}>
              <Ionicons name="search" size={18} color={T.subText} />
              <TextInput
                style={[s_.searchInput, { color: T.text }]}
                placeholder="Search for an area, street or place"
                placeholderTextColor={T.subText}
                value={searchText}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searching ? (
                <ActivityIndicator size="small" color={T.subText} />
              ) : searchText.length > 0 ? (
                <TouchableOpacity onPress={clearSearch} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={T.subText} />
                </TouchableOpacity>
              ) : null}
            </View>

            {suggestions.length > 0 && (
              <View style={[s_.suggestions, { backgroundColor: T.card, borderColor: T.border }]}>
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: vs(240) }}>
                  {suggestions.map((item, i) => (
                    <TouchableOpacity
                      key={item.placeId}
                      style={[s_.suggestionRow, i > 0 && { borderTopColor: T.divider, borderTopWidth: 1 }]}
                      onPress={() => handlePickSuggestion(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={18} color={T.subText} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s_.suggestionPrimary, { color: T.text }]} numberOfLines={1}>
                          {item.primary}
                        </Text>
                        {!!item.secondary && (
                          <Text style={[s_.suggestionSecondary, { color: T.subText }]} numberOfLines={1}>
                            {item.secondary}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {suggestions.length === 0 && (searchError || (!searching && searchText.trim().length >= 3)) && (
              <View style={[s_.suggestions, s_.searchNote, { backgroundColor: T.card, borderColor: T.border }]}>
                <Text style={[s_.searchNoteText, { color: T.subText }]}>
                  {searchError
                    ? "Search unavailable. Enable “Places API (New)” for this key in Google Cloud, then restart with expo start -c."
                    : 'No matching places.'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={[s_.panel, { backgroundColor: T.card, borderColor: T.border }]}>
        <ScreenContent>
          <TouchableOpacity style={s_.currentLocBtn} onPress={handleUseCurrentLocation} activeOpacity={0.8} disabled={locating}>
            {locating ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="locate" size={16} color={COLORS.primary} />}
            <Text style={s_.currentLocText}>Use current location</Text>
          </TouchableOpacity>

          <View style={[s_.addressBox, { backgroundColor: T.inputBg }]}>
            <Ionicons name="location-outline" size={18} color={T.subText} />
            <TextInput
              style={[s_.addressInput, { color: T.text }]}
              placeholder={resolvingAddress ? 'Locating address…' : 'Address'}
              placeholderTextColor={T.subText}
              value={address}
              onChangeText={setAddress}
              multiline
            />
            {resolvingAddress && <ActivityIndicator size="small" color={T.subText} />}
          </View>

          <TouchableOpacity
            style={[s_.confirmBtn, !address.trim() && { opacity: 0.5 }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={!address.trim()}
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

  // The map sits in a centred, rounded card so it lines up with the header /
  // panel width on web and doesn't stretch edge-to-edge on wide screens.
  mapArea: { flex: 1, alignItems: 'center', paddingHorizontal: s(12), paddingTop: vs(12) },
  mapCard: {
    flex: 1, width: '100%', maxWidth: s(544), alignSelf: 'center',
    minHeight: vs(240), borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden',
  },

  searchOverlay: { position: 'absolute', top: vs(10), left: s(10), right: s(10) },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: s(10),
    borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: s(12), height: vs(46),
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: ms(13.5) },
  suggestions: {
    marginTop: vs(8), borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(14), paddingVertical: vs(12) },
  suggestionPrimary: { fontSize: ms(13.5), fontWeight: '600' },
  suggestionSecondary: { fontSize: ms(11.5), marginTop: 1 },
  searchNote: { paddingHorizontal: s(14), paddingVertical: vs(11) },
  searchNoteText: { fontSize: ms(12), lineHeight: ms(17) },

  panel: { borderTopWidth: 1, paddingVertical: vs(16) },
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
