import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';

export default function ProfileEditScreen() {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity]   = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.getMe();
        if (res?.user) {
          setName(res.user.full_name || '');
          setEmail(res.user.email || '');
          setPhone(res.user.phone_number || '');
          setCity(res.user.city || '');
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        Alert.alert('Error', 'Could not load profile data.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const getInitials = (nameStr: string) => {
    return (nameStr || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'U';
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Name and Email are required.');
      return;
    }
    try {
      setSaving(true);
      await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
      });
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.title}>Edit Profile</Text>
        <TouchableOpacity onPress={save}>
          <Text style={s.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={s.avatar}>
              <Text style={s.avatarInitials}>NK</Text>
            </View>
            <TouchableOpacity style={s.changePhotoBtn} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
              <Text style={s.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={s.card}>
            <Field label="Full Name" value={name} onChangeText={setName} icon="person-outline" />
            <View style={s.divider} />
            <Field label="Email Address" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" />
            <View style={s.divider} />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" />
            <View style={s.divider} />
            <Field label="City / Location" value={city} onChangeText={setCity} icon="location-outline" />
          </View>

          {/* Email verification banner */}
          <View style={s.verifyBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
            <Text style={s.verifyText}>Your email address is not verified.</Text>
            <TouchableOpacity onPress={() => Alert.alert('Verify Email', 'Verification link sent to your email.')}>
              <Text style={s.verifyLink}>Verify now</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={save} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChangeText, icon, keyboardType = 'default',
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  icon: string; keyboardType?: any;
}) {
  return (
    <View style={f.row}>
      <Ionicons name={icon as any} size={18} color={COLORS.muted} style={f.icon} />
      <View style={f.body}>
        <Text style={f.label}>{label}</Text>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
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
  input: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  saveText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  scroll: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', marginBottom: 10 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: COLORS.primary + '50', marginBottom: 12 },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primary },
  changePhotoText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  card: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0', marginBottom: 14 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 58 },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', marginHorizontal: 16, borderRadius: 12, padding: 12, marginBottom: 20 },
  verifyText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' },
  verifyLink: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  saveBtn: { marginHorizontal: 16, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
