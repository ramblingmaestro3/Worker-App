import { AntDesign, FontAwesome5, Ionicons } from '@expo/vector-icons';
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
import { signInWithPassword, signInWithOAuthProvider, routeSignedInUserByRole } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';

export default function LoginScreen() {
  const [role, setRole] = useState<'client' | 'worker'>('client');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const T = useThemeColors();

  const handleLogin = async () => {
    if (!credential || !password) return;
    setError('');
    setLoading(true);
    const result = await signInWithPassword({ identifier: credential, password });
    if (!result.success) {
      setLoading(false);
      setError(result.error ?? 'Something went wrong signing in.');
      return;
    }
    // Route by the account's real role, not the toggle above — the toggle is
    // just a hint for which fields to show, the account's role is fixed at signup.
    await routeSignedInUserByRole();
    setLoading(false);
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
    await routeSignedInUserByRole();
    setOauthLoading(null);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/onboarding' as any);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: T.card }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ══ GREEN GRADIENT HEADER ══ */}
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerInner}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={19} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.heading}>Sign In</Text>
            <Text style={styles.subheading}>Sign in to continue using the app.</Text>
          </View>
        </LinearGradient>

        <ScreenContent style={styles.container}>

          <View style={[styles.toggleWrap, { backgroundColor: T.inputBg }]}>
            <TouchableOpacity style={[styles.toggleBtn, role === 'client' && styles.toggleBtnActive]} onPress={() => setRole('client')} activeOpacity={0.8}>
              <Text style={[styles.toggleText, { color: T.subText }, role === 'client' && styles.toggleTextActive]}>Client</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, role === 'worker' && styles.toggleBtnActive]} onPress={() => setRole('worker')} activeOpacity={0.8}>
              <Text style={[styles.toggleText, { color: T.subText }, role === 'worker' && styles.toggleTextActive]}>Worker</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <View style={[styles.inputRow, { backgroundColor: T.inputBg }]}>
              <FontAwesome5 name="envelope" size={15} color={T.subText} style={styles.inputIcon} />
              <TextInput style={[styles.input, { color: T.text }]} placeholder="Email or Phone Number" placeholderTextColor={T.subText} value={credential} onChangeText={setCredential} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
          </View>

          <View style={styles.inputWrap}>
            <View style={[styles.inputRow, { backgroundColor: T.inputBg }]}>
              <FontAwesome5 name="lock" size={15} color={T.subText} style={styles.inputIcon} />
              <TextInput style={[styles.input, { color: T.text }]} placeholder="Password" placeholderTextColor={T.subText} value={password} onChangeText={setPassword} secureTextEntry={!showPass} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} activeOpacity={0.7}>
                <Ionicons name={showPass ? 'eye' : 'eye-off-outline'} size={18} color={T.subText} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/reset-password' as any)} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity onPress={handleLogin} disabled={!credential || !password || loading} activeOpacity={0.85} style={styles.loginBtnWrap}>
            <LinearGradient
              colors={(!credential || !password || loading) ? [COLORS.muted, COLORS.muted] : [COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" style={{ flex: 1 }} />
              ) : (
                <>
                  <View style={styles.loginBtnCircle}>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.loginBtnText}>Login</Text>
                  <View style={styles.loginBtnChevrons}>
                    <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.6)" style={{ marginRight: -8 }} />
                    <Ionicons name="chevron-forward" size={15} color="#fff" />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

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

          <TouchableOpacity style={styles.registerRow} onPress={() => router.push('/sign-up' as any)} activeOpacity={0.7}>
            <Text style={[styles.registerText, { color: T.subText }]}>
              Don&apos;t have an account?{' '}
              <Text style={styles.registerLink}>Register</Text>
            </Text>
          </TouchableOpacity>
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

  /* Back */
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

  /* Heading */
  heading: {
    fontSize: ms(20),
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: vs(3),
  },
  subheading: {
    fontSize: ms(12),
    color: 'rgba(26,26,26,0.65)',
  },

  /* Toggle */
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#158100ff',
    borderRadius: 30,
    padding: 4,
    marginTop: 4,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 26,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  /* Inputs */
  inputWrap: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgGrey,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  inputIcon: {
    width: 18,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },

  /* Forgot */
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 16,
  },

  /* Login button */
  loginBtnWrap: {
    borderRadius: 30,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  loginBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnChevrons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },

  /* Social */
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: COLORS.card,
  },
  appleSocialBtn: {
    borderColor: COLORS.border,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  /* Register */
  registerRow: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});