/**
 * Edit the worker's name, phone, location text, languages, and profile photo.
 */
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import ProfilePhotoPicker from '@/components/ProfilePhotoPicker';
import { getMyProfile, updateProfile } from '@/lib/api/profiles';
import { getMyWorkerProfile, updateWorkerProfile } from '@/lib/api/workerProfiles';
import type { RootStackParamList } from '@/navigation/types';

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

type Props = NativeStackScreenProps<RootStackParamList, 'WorkerPersonalInfo'>;

export default function WorkerPersonalInfoScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [languages, setLanguages] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const [profileResult, workerResult] = await Promise.all([getMyProfile(), getMyWorkerProfile()]);
      const p = profileResult.success ? profileResult.data : null;
      const w = workerResult.success ? workerResult.data : null;
      if (p) setPhone(p.phone ?? '');
      // Worker-facing identity: the worker_profiles override, else the personal
      // profile value as the starting point.
      setName(w?.display_name ?? p?.full_name ?? '');
      setAvatarUrl(w?.photo_url ?? p?.avatar_url ?? null);
      if (w) {
        setLocation(w.address ?? '');
        setLanguages(w.languages ?? '');
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
      updateProfile({ phone: phone.trim() }),
      updateWorkerProfile({
        display_name: name.trim(),
        address: location.trim(),
        languages: languages.trim(),
      }),
    ]);
    setSaving(false);
    if (!profileResult.success || !workerResult.success) {
      Alert.alert('Could Not Save', profileResult.error ?? workerResult.error ?? 'Something went wrong.');
      return;
    }
    Alert.alert('Saved', 'Your worker profile has been updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top']}>
        <ScreenHeader title="Personal Information" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />
      <ScreenHeader title="Personal Information" onBack={() => navigation.goBack()} />

      <View style={s.pageInner}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.photoWrap}>
          <ProfilePhotoPicker
            name={name}
            avatarUrl={avatarUrl}
            onChange={setAvatarUrl}
            onSave={(url) => updateWorkerProfile({ photo_url: url })}
          />
        </View>
        <Text style={[s.hint, { color: T.subText }]}>
          This name and photo are what clients see on your worker profile. Your client-side profile is separate.
        </Text>
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
          <Field icon="person-outline" label="Display name" value={name} onChangeText={setName} T={T} />
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

const s = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  scroll: { padding: ws(16) },
  photoWrap: { alignItems: 'center', paddingVertical: wvs(12), marginBottom: wvs(4) },
  hint: { fontSize: wms(11.5), lineHeight: wms(16), textAlign: 'center', marginBottom: wvs(14), paddingHorizontal: ws(12) },
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
