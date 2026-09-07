import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyWorkerProfile, updateWorkerProfile, AvailabilityDay, PreferredTime, PREFERRED_TIME_OPTIONS } from '@/lib/api/workerProfiles';
import type { RootStackParamList } from '@/navigation/types';

const FULL_DAY_NAMES: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

const DEFAULT_DAYS: AvailabilityDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({ day, on: false }));

type Props = NativeStackScreenProps<RootStackParamList, 'WorkerAvailability'>;

export default function WorkerAvailabilityScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [days, setDays] = useState<AvailabilityDay[]>(DEFAULT_DAYS);
  const [preferredTimes, setPreferredTimes] = useState<PreferredTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Weekly Availability',
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: '#fff',
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const result = await getMyWorkerProfile();
      if (result.success && result.data) {
        if (Array.isArray(result.data.availability) && result.data.availability.length > 0) {
          setDays(result.data.availability);
        }
        setPreferredTimes(result.data.preferred_times ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const toggleDay = (day: string) => {
    setDays(days.map(d => d.day === day ? { ...d, on: !d.on } : d));
  };

  const toggleTime = (t: PreferredTime) => {
    setPreferredTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const activeCount = days.filter(d => d.on).length;

  const handleSave = async () => {
    setSaving(true);
    const result = await updateWorkerProfile({ availability: days, preferred_times: preferredTimes });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could Not Save', result.error ?? 'Something went wrong.');
      return;
    }
    Alert.alert('Saved', 'Your availability has been updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={[]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={s.pageInner}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.summaryCard, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="calendar-outline" size={wms(18)} color={COLORS.primary} />
          <Text style={[s.summaryText, { color: COLORS.primary }]}>
            You&apos;re available {activeCount} day{activeCount === 1 ? '' : 's'} a week
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
          {days.map((d, i) => (
            <View key={d.day}>
              {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
              <View style={s.dayRow}>
                <Text style={[s.dayName, { color: T.text }]}>{FULL_DAY_NAMES[d.day] ?? d.day}</Text>
                <Switch
                  value={d.on}
                  onValueChange={() => toggleDay(d.day)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}
        </View>

        <Text style={[s.sectionLabel, { color: T.subText }]}>Preferred Working Hours</Text>
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
          {PREFERRED_TIME_OPTIONS.map((opt, i) => {
            const on = preferredTimes.includes(opt.value);
            return (
              <View key={opt.value}>
                {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
                <View style={s.dayRow}>
                  <View style={s.timeLabelRow}>
                    <Ionicons name={opt.icon as any} size={wms(16)} color={on ? COLORS.primary : T.subText} />
                    <Text style={[s.dayName, { color: T.text }]}>{opt.label}</Text>
                  </View>
                  <Switch
                    value={on}
                    onValueChange={() => toggleTime(opt.value)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: wvs(100) }} />
      </ScrollView>

      <View style={[s.footer, { backgroundColor: T.card, borderColor: T.border }]}>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85} disabled={saving}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveBtn}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  scroll: { padding: ws(16) },

  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: ws(10), borderRadius: ws(14), padding: ws(14), marginBottom: wvs(16) },
  summaryText: { fontSize: wms(13), fontWeight: '700' },

  sectionLabel: { fontSize: wms(12), fontWeight: '700', marginBottom: wvs(10), marginTop: wvs(20), textTransform: 'uppercase', letterSpacing: wms(0.4) },

  card: { borderRadius: ws(16), borderWidth: ws(1), overflow: 'hidden' },
  divider: { height: wvs(1), marginHorizontal: ws(16) },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ws(16), paddingVertical: wvs(15) },
  dayName: { fontSize: wms(14), fontWeight: '600' },
  timeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: ws(10), flex: 1 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: ws(1), padding: ws(16), paddingBottom: wvs(28) },
  saveBtn: { borderRadius: ws(30), paddingVertical: wvs(15), alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: wms(15), fontWeight: '700' },
});
