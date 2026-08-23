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
import { getMyProfile, updateProfile } from '@/lib/api/profiles';
import { getMyWorkerProfile, updateWorkerProfile } from '@/lib/api/workerProfiles';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';

function Field({ icon, label, value, onChangeText, keyboardType, T }: {
  icon: string; label: string; value: string; onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad'; T: any;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, { color: T.subText }]}>{label}</Text>
      <View style={[s.inputRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
        <Ionicons name={icon as any} size={wms(16)} color={T.subText} />
        <TextInput
          style={[s.input, { color: T.text }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType ?? 'default'}
          placeholderTextColor={T.subText}
        />
      </View>
    </View>
  );
}

function WorkerPersonalInfoScreen() {
  const T = useThemeColors();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [languages, setLanguages] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [profileResult, workerResult] = await Promise.all([getMyProfile(), getMyWorkerProfile()]);
      if (profileResult.success && profileResult.data) {
        setName(profileResult.data.full_name ?? '');
        setPhone(profileResult.data.phone ?? '');
      }
      if (workerResult.success && workerResult.data) {
        setLocation(workerResult.data.address ?? '');
        setLanguages(workerResult.data.languages ?? '');
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !location.trim()) {
      Alert.alert('Missing details', 'Name, phone, and location can\'t be empty.');
      return;
    }
    setSaving(true);
    const [profileResult, workerResult] = await Promise.all([
      updateProfile({ full_name: name.trim(), phone: phone.trim() }),
      updateWorkerProfile({ address: location.trim(), languages: languages.trim() }),
    ]);
    setSaving(false);
    if (!profileResult.success || !workerResult.success) {
      Alert.alert('Could Not Save', profileResult.error ?? workerResult.error ?? 'Something went wrong.');
      return;
    }
    Alert.alert('Saved', 'Your personal information has been updated.', [
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
        <Text style={s.headerTitle}>Personal Information</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.pageInner}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
          <Field icon="person-outline" label="Full name" value={name} onChangeText={setName} T={T} />
          <View style={[s.fieldDivider, { backgroundColor: T.divider }]} />
          <Field icon="call-outline" label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" T={T} />
          <View style={[s.fieldDivider, { backgroundColor: T.divider }]} />
          <Field icon="location-outline" label="Location" value={location} onChangeText={setLocation} T={T} />
          <View style={[s.fieldDivider, { backgroundColor: T.divider }]} />
          <Field icon="globe-outline" label="Languages" value={languages} onChangeText={setLanguages} T={T} />
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

export default function GatedWorkerPersonalInfoScreen() {
  return (
    <RequireVerifiedWorker>
      <WorkerPersonalInfoScreen />
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
  fieldLabel: { fontSize: wms(12), fontWeight: '600', marginBottom: wvs(8), textTransform: 'uppercase', letterSpacing: wms(0.3) },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: ws(12), borderWidth: ws(1), paddingHorizontal: ws(14), gap: ws(10) },
  input: { flex: 1, fontSize: wms(14), paddingVertical: wvs(13) },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: ws(1), padding: ws(16), paddingBottom: wvs(28) },
  saveBtn: { borderRadius: ws(30), paddingVertical: wvs(15), alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: wms(15), fontWeight: '700' },
});
