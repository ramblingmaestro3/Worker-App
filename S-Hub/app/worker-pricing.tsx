import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyWorkerProfile, updateWorkerProfile } from '@/lib/api/workerProfiles';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';

function PriceField({ label, hint, value, onChangeText, T }: {
  label: string; hint: string; value: string; onChangeText: (v: string) => void; T: any;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, { color: T.text }]}>{label}</Text>
      <Text style={[s.fieldHint, { color: T.subText }]}>{hint}</Text>
      <View style={[s.inputRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
        <Text style={[s.currencyPrefix, { color: T.subText }]}>GH₵</Text>
        <TextInput
          style={[s.input, { color: T.text }]}
          keyboardType="number-pad"
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={T.subText}
        />
      </View>
    </View>
  );
}

function WorkerPricingScreen() {
  const T = useThemeColors();
  const [price, setPrice] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [minJobValue, setMinJobValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getMyWorkerProfile();
      if (result.success && result.data) {
        setPrice(result.data.per_job_rate != null ? String(result.data.per_job_rate) : '');
        setHourlyRate(result.data.hourly_rate != null ? String(result.data.hourly_rate) : '');
        setMinJobValue(result.data.min_job_value != null ? String(result.data.min_job_value) : '');
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    const p = parseInt(price, 10);
    const h = parseInt(hourlyRate, 10);
    const m = parseInt(minJobValue, 10);

    if (!p || !h || !m) {
      Alert.alert('Check your numbers', 'All three prices need to be valid amounts greater than 0.');
      return;
    }

    setSaving(true);
    const result = await updateWorkerProfile({ per_job_rate: p, hourly_rate: h, min_job_value: m });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could Not Save', result.error ?? 'Something went wrong.');
      return;
    }
    Alert.alert('Saved', 'Your pricing has been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={[s.header, { backgroundColor: COLORS.primary }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={wms(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pricing</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.pageInner}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
          <PriceField
            label="Starting price"
            hint="What clients see first when browsing your profile"
            value={price}
            onChangeText={setPrice}
            T={T}
          />
          <View style={[s.fieldDivider, { backgroundColor: T.divider }]} />
          <PriceField
            label="Hourly rate"
            hint="Used for jobs billed by the hour"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            T={T}
          />
          <View style={[s.fieldDivider, { backgroundColor: T.divider }]} />
          <PriceField
            label="Minimum job value"
            hint="The smallest job you're willing to accept"
            value={minJobValue}
            onChangeText={setMinJobValue}
            T={T}
          />
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

export default function GatedWorkerPricingScreen() {
  return (
    <RequireVerifiedWorker>
      <WorkerPricingScreen />
    </RequireVerifiedWorker>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ws(14), paddingVertical: wvs(12) },
  backBtn: { width: ws(38), height: ws(38), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: wms(16), fontWeight: '700', color: '#fff' },

  scroll: { padding: ws(16) },
  card: { borderRadius: ws(16), borderWidth: ws(1), padding: ws(16) },
  fieldDivider: { height: wvs(1), marginVertical: wvs(16) },

  fieldWrap: {},
  fieldLabel: { fontSize: wms(14), fontWeight: '700', marginBottom: wvs(3) },
  fieldHint: { fontSize: wms(12), marginBottom: wvs(10) },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: ws(12), borderWidth: ws(1), paddingHorizontal: ws(14), gap: ws(8) },
  currencyPrefix: { fontSize: wms(15), fontWeight: '700' },
  input: { flex: 1, fontSize: wms(15), paddingVertical: wvs(13) },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: ws(1), padding: ws(16), paddingBottom: wvs(28) },
  saveBtn: { borderRadius: ws(30), paddingVertical: wvs(15), alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: wms(15), fontWeight: '700' },
});
