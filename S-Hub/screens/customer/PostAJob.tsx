import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s } from '@/lib/scaling';
import BottomNav from '@/components/ui/BottomNav';
import AppMap from '@/components/AppMap';
import { consumePickedLocation, PickedLocation } from '@/lib/locationPickerBridge';
import { consumeAiJobDraft } from '@/lib/aiJobDraftBridge';
import { createServiceRequest } from '@/lib/api/serviceRequests';
import { uploadJobPhoto } from '@/lib/api/storage';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PostAJob'>;

type CategoryKey = string;
type Urgency = 'now' | 'schedule';

// Skill ids match BecomeWorker.tsx SKILL_CATEGORIES and the ai-analyze function.
const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
  { key: 'electrical', label: 'Electrical', icon: 'flash-outline' },
  { key: 'carpentry', label: 'Carpentry', icon: 'hammer-outline' },
  { key: 'painting', label: 'Painting', icon: 'color-palette-outline' },
  { key: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline' },
  { key: 'masonry', label: 'Masonry', icon: 'cube-outline' },
  { key: 'welding', label: 'Welding', icon: 'flame-outline' },
  { key: 'ac', label: 'AC & Cooling', icon: 'snow-outline' },
  { key: 'tiling', label: 'Tiling', icon: 'grid-outline' },
  { key: 'roofing', label: 'Roofing', icon: 'home-outline' },
  { key: 'security', label: 'Security/CCTV', icon: 'videocam-outline' },
  { key: 'other', label: 'Other', icon: 'construct-outline' },
];

export default function PostAJobScreen({ route, navigation }: Props) {
  const T = useThemeColors();
  const params = route.params ?? {};
  const [category, setCategory] = useState<CategoryKey>((params.category as CategoryKey) || 'plumbing');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('now');
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [budget, setBudget] = useState('');
  const [posting, setPosting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <Text style={[styles.logo, { color: COLORS.primary }]}>AdwumaGo</Text>,
    });
  }, [navigation]);

  // Generate the next 7 days for the date selector
  const dateOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      options.push({ label, value: iso });
    }
    return options;
  }, []);

  const TIME_OPTIONS = [
    { label: '8:00 AM', value: '08:00' },
    { label: '9:00 AM', value: '09:00' },
    { label: '10:00 AM', value: '10:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '2:00 PM', value: '14:00' },
    { label: '4:00 PM', value: '16:00' },
    { label: '6:00 PM', value: '18:00' },
  ];

  useFocusEffect(
    useCallback(() => {
      const picked = consumePickedLocation();
      if (picked) setLocation(picked);

      const draft = consumeAiJobDraft();
      if (draft) {
        if (draft.category) setCategory(draft.category);
        if (draft.description) setDescription(draft.description);
        if (draft.photoUri) {
          setPhotos((prev) => (prev.includes(draft.photoUri!) ? prev : [...prev, draft.photoUri!]));
        }
      }
    }, [])
  );

  const handleAddPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleChangeLocation = () => {
    navigation.navigate(
      'LocationPicker',
      location
        ? { lat: String(location.latitude), lng: String(location.longitude) }
        : {}
    );
  };

  const handlePostJob = async () => {
    if (!description.trim()) {
      Alert.alert('Add a description', 'Let workers know what needs to be done.');
      return;
    }
    if (!location) {
      Alert.alert('Set a location', 'Choose where this job should happen.');
      return;
    }
    if (urgency === 'schedule' && (!scheduledDate || !scheduledTime)) {
      Alert.alert('Set a schedule', 'Please pick both a date and time for the job.');
      return;
    }
    const trimmedBudget = budget.trim();
    const budgetValue = trimmedBudget ? parseFloat(trimmedBudget) : undefined;
    if (trimmedBudget && (budgetValue === undefined || Number.isNaN(budgetValue) || budgetValue <= 0)) {
      Alert.alert('Invalid budget', 'Enter a valid amount, or leave it blank to let workers propose their own price.');
      return;
    }

    setPosting(true);
    const uploadedPhotos = (
      await Promise.all(photos.map((uri) => uploadJobPhoto(uri)))
    ).filter((r): r is { success: true; publicUrl: string } => r.success && !!r.publicUrl).map((r) => r.publicUrl);

    // Build an ISO timestamp when the customer selected "Schedule"
    let scheduled_for: string | undefined;
    if (urgency === 'schedule' && scheduledDate && scheduledTime) {
      scheduled_for = `${scheduledDate}T${scheduledTime}:00`;
    }

    const result = await createServiceRequest({
      category,
      description: description.trim(),
      location_string: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      location_region: location.region ?? undefined,
      photos: uploadedPhotos,
      scheduled_for,
      initial_offer_price: budgetValue,
    });
    setPosting(false);

    if (!result.success) {
      Alert.alert('Could Not Post Job', result.error ?? 'Something went wrong. Please try again.');
      return;
    }

    navigation.navigate('FindingWorker', {});
  };

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      {/* Content capped and centered the same way as SignUp.tsx / SignIn.tsx */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: T.text }]}>New Request</Text>
            <Text style={[styles.subtitle, { color: T.subText }]}>Find a reliable professional in your community.</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: T.subText }]}>SERVICE CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryGrid}>
              {CATEGORIES.map((c) => {
                const active = c.key === category;
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: T.inputBg },
                      active && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setCategory(c.key)}
                  >
                    <Ionicons name={c.icon as any} size={24} color={active ? COLORS.primary : T.subText} />
                    <Text
                      style={[styles.categoryLabel, { color: T.subText }, active && { color: T.text, fontWeight: '700' }]}
                      numberOfLines={1}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.section, styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.sectionLabel, { color: T.subText }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: T.inputBg, borderBottomColor: T.border, color: T.text }]}
              multiline
              placeholder="Describe the issue... e.g. My kitchen sink is leaking and needs urgent repair."
              placeholderTextColor={T.subText}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={[styles.sectionLabel, { color: T.subText, marginTop: 4 }]}>PHOTOS (OPTIONAL)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={[styles.addPhotoButton, { borderColor: T.border }]} onPress={handleAddPhoto}>
                <Ionicons name="camera-outline" size={22} color={T.subText} />
                <Text style={[styles.addPhotoText, { color: T.subText }]}>ADD PHOTO</Text>
              </TouchableOpacity>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => handleRemovePhoto(uri)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: T.subText }]}>URGENCY</Text>
            <View style={[styles.urgencyRow, { backgroundColor: T.inputBg }]}>
              <TouchableOpacity
                style={[styles.urgencyTab, urgency === 'now' && { backgroundColor: COLORS.primary }]}
                onPress={() => { setUrgency('now'); setScheduledDate(null); setScheduledTime(null); }}
              >
                <Text style={[styles.urgencyText, { color: T.subText }, urgency === 'now' && { color: '#fff' }]}>Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.urgencyTab, urgency === 'schedule' && { backgroundColor: COLORS.primary }]}
                onPress={() => setUrgency('schedule')}
              >
                <Text style={[styles.urgencyText, { color: T.subText }, urgency === 'schedule' && { color: '#fff' }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Schedule date & time picker ── */}
          {urgency === 'schedule' && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: T.subText }]}>PICK A DATE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {dateOptions.map((d) => (
                    <TouchableOpacity
                      key={d.value}
                      style={[
                        styles.scheduleChip,
                        { backgroundColor: T.inputBg, borderColor: T.border },
                        scheduledDate === d.value && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                      ]}
                      onPress={() => setScheduledDate(d.value)}
                    >
                      <Text
                        style={[
                          styles.scheduleChipText,
                          { color: T.subText },
                          scheduledDate === d.value && { color: '#fff', fontWeight: '700' },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.sectionLabel, { color: T.subText, marginTop: 16 }]}>PICK A TIME</Text>
              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.scheduleChip,
                      { backgroundColor: T.inputBg, borderColor: T.border },
                      scheduledTime === t.value && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                    ]}
                    onPress={() => setScheduledTime(t.value)}
                  >
                    <Text
                      style={[
                        styles.scheduleChipText,
                        { color: T.subText },
                        scheduledTime === t.value && { color: '#fff', fontWeight: '700' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.section, styles.locationCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={styles.locationRow}>
              <View style={styles.locationLeft}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.locationText, { color: T.text }]} numberOfLines={1}>
                  {location?.address || 'Set your service location'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleChangeLocation}>
                <Text style={styles.changeText}>{location ? 'Change' : 'Set'}</Text>
              </TouchableOpacity>
            </View>
            {location ? (
              <View style={styles.mapPreview}>
                <AppMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  zoom={0.02}
                  markers={[{ latitude: location.latitude, longitude: location.longitude, color: COLORS.primary }]}
                  zoomEnabled={false}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <TouchableOpacity style={[styles.mapPlaceholder, { backgroundColor: T.inputBg }]} onPress={handleChangeLocation} activeOpacity={0.8}>
                <Ionicons name="map-outline" size={32} color={T.subText} />
                <Text style={{ color: T.subText, fontSize: 12, marginTop: 6 }}>Tap to choose on map</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.section, styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.sectionLabel, { color: T.subText }]}>YOUR BUDGET (OPTIONAL)</Text>
            <View style={[styles.budgetInputRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
              <Text style={[styles.budgetPrefix, { color: T.text }]}>GH₵</Text>
              <TextInput
                style={[styles.budgetInput, { color: T.text }]}
                placeholder="e.g. 200"
                placeholderTextColor={T.subText}
                keyboardType="numeric"
                value={budget}
                onChangeText={(t) => setBudget(t.replace(/[^0-9.]/g, ''))}
              />
            </View>
            <View style={styles.budgetHintRow}>
              <Ionicons name="information-circle-outline" size={16} color={T.subText} />
              <Text style={[styles.budgetHint, { color: T.subText }]}>
                Set what you&apos;re willing to pay, or leave it blank to let workers propose their own price.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Post button — full-width bar, but the button itself is capped/centered to match content width */}
      <View style={styles.postButtonBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.postButton} onPress={handlePostJob} activeOpacity={0.85} disabled={posting}>
          {posting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.postButtonText}>Post Job</Text>
              <Ionicons name="send" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      <BottomNav role="customer" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logo: { fontSize: 20, fontWeight: '900' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 200, alignItems: 'center' },
  content: { width: '100%', maxWidth: s(544), gap: 20 },
  titleBlock: { gap: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  categoryGrid: { gap: 10, paddingRight: 4, paddingVertical: 2 },
  categoryCard: { width: 88, height: 88, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderColor: 'transparent', paddingHorizontal: 4 },
  categoryLabel: { fontSize: 11.5, textAlign: 'center' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  textArea: { minHeight: 100, borderRadius: 16, borderBottomWidth: 2, padding: 12, fontSize: 15, textAlignVertical: 'top', marginBottom: 12 },
  addPhotoButton: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, marginRight: 12 },
  addPhotoText: { fontSize: 10, fontWeight: '700' },
  photoThumbWrap: { width: 96, height: 96, borderRadius: 16, marginRight: 12, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%' },
  photoRemoveBtn: {
    position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  urgencyRow: { flexDirection: 'row', borderRadius: 999, padding: 4, maxWidth: 320 },
  urgencyTab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  urgencyText: { fontSize: 15, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 10 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scheduleChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5 },
  scheduleChipText: { fontSize: 13, fontWeight: '500' },
  locationCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  mapPlaceholder: { height: 140, alignItems: 'center', justifyContent: 'center' },
  mapPreview: { height: 140, overflow: 'hidden' },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 14, fontWeight: '600' },
  changeText: { fontSize: 13, color: COLORS.primary, textDecorationLine: 'underline' },
  budgetInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, gap: 8 },
  budgetPrefix: { fontSize: 16, fontWeight: '700' },
  budgetInput: { flex: 1, fontSize: 16, fontWeight: '600', paddingVertical: 14 },
  budgetHintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  budgetHint: { flex: 1, fontSize: 12, lineHeight: 17 },
  postButtonBar: {
    position: 'absolute', bottom: 92, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 20,
  },
  postButton: {
    width: '100%', maxWidth: s(544), height: 56, borderRadius: 999,
    backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  postButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
