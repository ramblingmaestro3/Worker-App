import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api, setAuthSession } from '../lib/api';

const PRIMARY = '#1B8B3A';
const MUTED = '#888';
const BORDER = '#E8E8E8';
const BG = '#F9F9F9';

type ServiceCategory = { id: number; name: string };

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'worker'>('client');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [primaryServiceId, setPrimaryServiceId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getServices()
      .then(result => { if (mounted) setServices(result.items || []); })
      .catch(() => {})
      .finally(() => mounted && setLoadingServices(false));
    return () => { mounted = false; };
  }, []);

  const primaryService = services.find(svc => svc.id === primaryServiceId) || null;
  const canSubmit = !!name && !!email && !!password && (role === 'client' || !!primaryService);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (role === 'worker' && !primaryService) {
      Alert.alert('Error', 'Select your primary area of expertise');
      return;
    }

    setLoading(true);
    try {
      // Convert 'client' to 'customer' for backend compatibility
      const backendRole = role === 'client' ? 'customer' : role;
      const response = await api.register({ name, email, password, role: backendRole as any });
      setAuthSession(response.tokens);

      if (response.user?.role === 'worker' && primaryService) {
        await api.updateWorkerProfile({
          occupation: primaryService.name,
          service_category_id: primaryService.id,
          skills: [primaryService.name],
          bio: '',
          rate: '0',
          idUploaded: false,
        });
      }

      router.replace(response.user?.role === 'worker' ? '/worker-setup' as any : '/(tabs)/home' as any);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo row */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 22 }}>🛠️</Text>
          </View>
          <Text style={styles.logoText}>SkillHub</Text>
        </View>

        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subheading}>Join thousands of workers and clients</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleCard, role === 'client' && styles.roleCardActive]}
            onPress={() => setRole('client')}
          >
            <Text style={styles.roleEmoji}>🔍</Text>
            <Text style={styles.roleLabel}>Find Workers</Text>
            <Text style={styles.roleSub}>I need a service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleCard, role === 'worker' && styles.roleCardActive]}
            onPress={() => setRole('worker')}
          >
            <Text style={styles.roleEmoji}>💼</Text>
            <Text style={styles.roleLabel}>Offer Services</Text>
            <Text style={styles.roleSub}>I am a worker</Text>
          </TouchableOpacity>
        </View>

        {/* Primary expertise (workers only) */}
        {role === 'worker' && (
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Primary Area of Expertise</Text>
            {loadingServices ? (
              <ActivityIndicator color={PRIMARY} style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.expertiseGrid}>
                {services.map(svc => (
                  <TouchableOpacity
                    key={svc.id}
                    style={[styles.expertiseChip, primaryServiceId === svc.id && styles.expertiseChipActive]}
                    onPress={() => setPrimaryServiceId(svc.id)}
                  >
                    <Text style={[styles.expertiseChipText, primaryServiceId === svc.id && styles.expertiseChipTextActive]}>
                      {svc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Full Name */}
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Akosua Mensah"
            placeholderTextColor={MUTED}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Email or Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={MUTED}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.passwordHelp}>
            Use at least 8 characters, including an uppercase letter, lowercase letter, number, and special character.
          </Text>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By registering you agree to our{' '}
          <Text style={{ color: PRIMARY }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: PRIMARY }}>Privacy Policy</Text>
        </Text>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 36,
  },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: PRIMARY + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '800', color: '#111' },

  heading: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 6 },
  subheading: { fontSize: 15, color: MUTED, marginBottom: 28 },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, padding: 14, alignItems: 'center',
    backgroundColor: BG,
  },
  roleCardActive: { borderColor: PRIMARY, backgroundColor: PRIMARY + '0D' },
  roleEmoji: { fontSize: 24, marginBottom: 6 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: '#111' },
  roleSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  inputBox: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  expertiseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expertiseChip: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: BG,
  },
  expertiseChipActive: { borderColor: PRIMARY, backgroundColor: PRIMARY + '18' },
  expertiseChipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  expertiseChipTextActive: { color: PRIMARY },
  input: {
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111', backgroundColor: BG,
  },

  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, backgroundColor: BG,
    paddingHorizontal: 16,
  },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111' },
  eyeBtn: { padding: 4 },
  eyeText: { fontSize: 18 },
  passwordHelp: { fontSize: 12, color: MUTED, lineHeight: 17, marginTop: 7 },

  btn: {
    backgroundColor: PRIMARY, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  btnDisabled: { backgroundColor: '#C8E6D0' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  termsText: {
    fontSize: 12, color: MUTED,
    textAlign: 'center', marginBottom: 28, lineHeight: 18,
  },

  loginRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  loginText: { fontSize: 14, color: MUTED },
  loginLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },
});
