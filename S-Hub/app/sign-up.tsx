import { AntDesign, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { COLORS } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { signUpWithPassword, signInWithOAuthProvider, routeSignedInUserByRole } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';

const PRIMARY = COLORS.primary;
const MUTED = COLORS.muted;
const BORDER = COLORS.border;
const BG = COLORS.bgGrey;

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'worker'>('client');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const T = useThemeColors();

  const handleSignUp = async () => {
    if (!name || !identifier || !password) return;
    setError('');
    setLoading(true);
    const result = await signUpWithPassword({ fullName: name, identifier, password, role });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Something went wrong creating your account.');
      return;
    }
    // Email confirmation is disabled project-wide, so signUp already returns
    // an active session — no verification code is sent, go straight in.
    router.replace((role === 'worker' ? '/become-worker' : '/home') as any);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError('');
    setOauthLoading(provider);
    const result = await signInWithOAuthProvider(provider);
    if (!result.success) {
      setOauthLoading(null);
      setError(result.error ?? 'Authentication failed.');
      return;
    }
    // Google matches by email, so this can also resolve to an EXISTING
    // account (including an existing worker) rather than only ever creating
    // a new client — route by the account's real role instead of assuming
    // client, or an existing worker landing here would get sent to /home.
    await routeSignedInUserByRole();
    setOauthLoading(null);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/onboarding' as any);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: T.card }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ══ GREEN GRADIENT HEADER ══ */}
        <LinearGradient
          colors={[COLORS.primaryDark, PRIMARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerInner}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={19} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.heading}>Sign Up</Text>
            <Text style={styles.subheading}>Create an account to get started.</Text>
          </View>
        </LinearGradient>

        <ScreenContent style={styles.container}>

          <View style={styles.roleRow}>
            <TouchableOpacity style={[styles.roleCard, { backgroundColor: T.inputBg, borderColor: T.border }, role === 'client' && styles.roleCardActive]} onPress={() => setRole('client')}>
              <Text style={styles.roleEmoji}>🔍</Text>
              <Text style={[styles.roleLabel, { color: T.text }]}>Find Workers</Text>
              <Text style={[styles.roleSub, { color: T.subText }]}>I need a service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleCard, { backgroundColor: T.inputBg, borderColor: T.border }, role === 'worker' && styles.roleCardActive]} onPress={() => setRole('worker')}>
              <Text style={styles.roleEmoji}>💼</Text>
              <Text style={[styles.roleLabel, { color: T.text }]}>Offer Services</Text>
              <Text style={[styles.roleSub, { color: T.subText }]}>I am a worker</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputBox}>
            <Text style={[styles.inputLabel, { color: T.subText }]}>Full Name</Text>
            <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]} placeholder="Enter your Full Name" placeholderTextColor={T.subText} value={name} onChangeText={setName} />
          </View>

          <View style={styles.inputBox}>
            <Text style={[styles.inputLabel, { color: T.subText }]}>Email or Phone</Text>
            <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]} placeholder="Enter your Phone Number or Email" placeholderTextColor={T.subText} keyboardType="email-address" autoCapitalize="none" value={identifier} onChangeText={setIdentifier} />
          </View>

          <View style={styles.inputBox}>
            <Text style={[styles.inputLabel, { color: T.subText }]}>Password</Text>
            <View style={[styles.passwordRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
              <TextInput style={[styles.passwordInput, { color: T.text }]} placeholder="Enter your Password" placeholderTextColor={T.subText} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            onPress={handleSignUp}
            disabled={!name || !identifier || !password || loading}
            activeOpacity={0.85}
            style={styles.btnWrap}
          >
            <LinearGradient
              colors={(!name || !identifier || !password || loading) ? [COLORS.muted, COLORS.muted] : [PRIMARY, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" style={{ flex: 1 }} />
              ) : (
                <>
                  <View style={styles.btnCircle}>
                    <Ionicons name="arrow-forward" size={16} color={PRIMARY} />
                  </View>
                  <Text style={styles.btnText}>Create Account</Text>
                  <View style={styles.btnChevrons}>
                    <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.6)" style={{ marginRight: -8 }} />
                    <Ionicons name="chevron-forward" size={15} color="#fff" />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.termsText, { color: T.subText }]}>
            By registering you agree to our{' '}
            <Text style={{ color: PRIMARY }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: PRIMARY }}>Privacy Policy</Text>
          </Text>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: T.border }]} />
            <Text style={[styles.dividerText, { color: T.subText }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: T.border }]} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: T.card, borderColor: T.border }]}
              onPress={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              activeOpacity={0.8}
            >
              {oauthLoading === 'google' ? (
                <ActivityIndicator size="small" color={T.text} />
              ) : (
                <>
                  <AntDesign name="google" size={18} color="#EA4335" />
                  <Text style={[styles.socialBtnText, { color: T.text }]}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: T.subText }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/sign-in' as any)}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScreenContent>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },

  /* Gradient header */
  gradientHeader: {
    paddingHorizontal: s(24),
    paddingTop: vs(28),
    paddingBottom: vs(16),
    borderBottomLeftRadius: s(24),
    borderBottomRightRadius: s(24),
    alignItems: 'center',
  },
  headerInner: {
    width: '100%',
    maxWidth: s(544),
  },
  backBtn: {
    width: s(34),
    height: s(34),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(12),
    marginLeft: -s(4),
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: s(17),
  },

  heading: { fontSize: ms(20), fontWeight: '800', color: '#1A1A1A', marginBottom: vs(3) },
  subheading: { fontSize: ms(12), color: 'rgba(26,26,26,0.65)' },

  roleRow: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 24 },
  roleCard: {
    flex: 1, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, padding: 14, alignItems: 'center',
    backgroundColor: BG,
  },
  roleCardActive: { borderColor: PRIMARY, backgroundColor: PRIMARY + '0D' },
  roleEmoji: { fontSize: 24, marginBottom: 6 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  roleSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  inputBox: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text, backgroundColor: BG,
  },

  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, backgroundColor: BG,
    paddingHorizontal: 16,
  },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  eyeBtn: { padding: 4 },
  eyeText: { fontSize: 18 },

  btnWrap: {
    borderRadius: 30,
    marginBottom: 16,
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  btnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnChevrons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  errorText: {
    fontSize: 13, color: COLORS.danger,
    textAlign: 'center', marginBottom: 16,
  },

  termsText: {
    fontSize: 12, color: MUTED,
    textAlign: 'center', marginBottom: 20, lineHeight: 18,
  },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '500' },

  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13,
  },
  socialBtnText: { fontSize: 14, fontWeight: '600' },

  loginRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  loginText: { fontSize: 14, color: MUTED },
  loginLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },
});
