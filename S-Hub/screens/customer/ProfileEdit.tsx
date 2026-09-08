import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { getMyProfile, updateProfile } from '@/lib/api/profiles';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/navigation/types';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfileEditScreen({ navigation }: Props) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const T = useThemeColors();

  useEffect(() => {
    (async () => {
      const result = await getMyProfile();
      if (result.success && result.data) {
        setName(result.data.full_name ?? '');
        setEmail(result.data.email ?? '');
        setOriginalEmail(result.data.email ?? '');
        setPhone(result.data.phone ?? '');
      }
      setEmailVerified(!!useAuthStore.getState().user?.email_confirmed_at);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setSaving(true);

    const emailChanged = trimmedEmail !== originalEmail;
    if (emailChanged) {
      const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (error) {
        setSaving(false);
        setEmailError(error.message);
        return;
      }
    }

    const result = await updateProfile({
      full_name: name.trim(),
      phone: phone.trim(),
      ...(emailChanged ? { email: trimmedEmail } : {}),
    });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could Not Save', result.error ?? 'Something went wrong updating your profile.');
      return;
    }
    if (emailChanged) setOriginalEmail(trimmedEmail);

    Alert.alert(
      'Saved!',
      emailChanged
        ? 'Your profile has been updated. Check your new email for a confirmation link to finish the change.'
        : 'Your profile has been updated.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
        <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <ScreenHeader
        title="Edit Profile"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.saveText}>Save</Text>}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenContent>

          <View style={[s.avatarSection, { backgroundColor: T.card }]}>
            <View style={s.avatar}>
              <Text style={s.avatarInitials}>{initialsOf(name)}</Text>
            </View>
            <TouchableOpacity style={s.changePhotoBtn} activeOpacity={0.8} onPress={() => Alert.alert('Coming Soon', 'Profile photo upload is coming soon.')}>
              <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
              <Text style={s.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <Field label="Full Name" value={name} onChangeText={setName} icon="person-outline" T={T} />
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <Field
              label="Email Address"
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailError(''); }}
              icon="mail-outline"
              keyboardType="email-address"
              T={T}
            />
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" T={T} />
          </View>

          {!!emailError && <Text style={s.errorText}>{emailError}</Text>}

          {!emailVerified && (
          <View style={s.verifyBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.primary} />
            <Text style={s.verifyText}>Your email address is not verified.</Text>
            <TouchableOpacity onPress={() => Alert.alert('Verify Email', 'Verification link sent to your email.')}>
              <Text style={s.verifyLink}>Verify now</Text>
            </TouchableOpacity>
          </View>
          )}

          <TouchableOpacity style={s.saveBtn} onPress={save} activeOpacity={0.85} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>

        </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChangeText, icon, keyboardType = 'default', T, editable = true,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  icon: string; keyboardType?: any; T: any; editable?: boolean;
}) {
  return (
    <View style={f.row}>
      <Ionicons name={icon as any} size={18} color={T.subText} style={f.icon} />
      <View style={f.body}>
        <Text style={[f.label, { color: T.subText }]}>{label}</Text>
        <TextInput
          style={[f.input, { color: editable ? T.text : T.subText }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          editable={editable}
        />
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  icon: { width: 22 },
  body: { flex: 1 },
  label: { fontSize: 11, color: COLORS.muted, fontWeight: '500', marginBottom: 2 },
  input: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
});

const s = StyleSheet.create({
  safe: { flex: 1 },
  saveText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  errorText: { fontSize: 12, color: COLORS.danger, marginHorizontal: 16, marginTop: -4, marginBottom: 12, fontWeight: '600' },
  scroll: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 28, marginBottom: 10 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: COLORS.primary + '50', marginBottom: 12 },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary },
  changePhotoText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  card: { borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 14 },
  divider: { height: 1, marginLeft: 58 },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primaryLight, marginHorizontal: 16, borderRadius: 12, padding: 12, marginBottom: 20 },
  verifyText: { flex: 1, fontSize: 12, color: COLORS.text, fontWeight: '500' },
  verifyLink: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  saveBtn: { marginHorizontal: 16, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
