import { AntDesign, Ionicons } from '@expo/vector-icons';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { signUpWithPassword, signInWithOAuthProvider, routeSignedInUserByRole } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';

const PRIMARY = COLORS.primary;
const MUTED = COLORS.muted;

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
    router.replace(role === 'worker' ? '/become-worker' : '/home');
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
    else router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <ScreenContent style={styles.header}>
            <TouchableOpacity
              style={[styles.backBtn, { borderColor: T.border }]}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={ms(18)} color={T.text} />
            </TouchableOpacity>
            <Text style={[styles.heading, { color: T.text }]}>Sign Up</Text>
            <Text style={[styles.subheading, { color: T.subText }]}>Create an account to get started.</Text>
          </ScreenContent>

          <ScreenContent style={styles.container}>

            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleCard, { backgroundColor: T.inputBg, borderColor: T.border }, role === 'client' && styles.roleCardActive]}
                onPress={() => setRole('client')}
                accessibilityRole="button"
                accessibilityState={{ selected: role === 'client' }}
                accessibilityLabel="Register to find workers"
              >
                <Ionicons name="search" size={22} color={role === 'client' ? PRIMARY : T.subText} style={styles.roleIcon} />
                <Text style={[styles.roleLabel, { color: T.text }]}>Find Workers</Text>
                <Text style={[styles.roleSub, { color: T.subText }]}>I need a service</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleCard, { backgroundColor: T.inputBg, borderColor: T.border }, role === 'worker' && styles.roleCardActive]}
                onPress={() => setRole('worker')}
                accessibilityRole="button"
                accessibilityState={{ selected: role === 'worker' }}
                accessibilityLabel="Register to offer services"
              >
                <Ionicons name="briefcase" size={22} color={role === 'worker' ? PRIMARY : T.subText} style={styles.roleIcon} />
                <Text style={[styles.roleLabel, { color: T.text }]}>Offer Services</Text>
                <Text style={[styles.roleSub, { color: T.subText }]}>I am a worker</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputBox}>
              <Input label="Full Name" placeholder="Enter your Full Name" value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputBox}>
              <Input
                label="Email or Phone"
                placeholder="Enter your Phone Number or Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            <View style={styles.inputBox}>
              <Input
                label="Password"
                placeholder="Enter your Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                trailing={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons name={showPassword ? 'eye' : 'eye-off-outline'} size={18} color={T.subText} />
                  </TouchableOpacity>
                }
              />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.btnWrap}>
              <Button
                label="Create Account"
                onPress={handleSignUp}
                disabled={!name || !identifier || !password}
                loading={loading}
              />
            </View>

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
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
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
              <TouchableOpacity
                onPress={() => router.replace('/sign-in')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go to sign in"
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 40,
  },

  /* Header — flat, no gradient banner */
  header: {
    paddingHorizontal: s(24),
    paddingTop: vs(12),
    paddingBottom: vs(4),
  },
  backBtn: {
    width: s(36),
    height: s(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(20),
    marginLeft: -s(6),
    borderWidth: 1,
    borderRadius: RADIUS.full,
  },

  heading: { fontSize: ms(26), fontWeight: '800', letterSpacing: -0.4, marginBottom: vs(4) },
  subheading: { fontSize: ms(14) },

  roleRow: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 24 },
  roleCard: {
    flex: 1, borderWidth: 1.5,
    borderRadius: RADIUS.lg, padding: 14, alignItems: 'center',
  },
  roleCardActive: { borderColor: PRIMARY, backgroundColor: PRIMARY + '0D' },
  roleIcon: { marginBottom: 6 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  roleSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  inputBox: { marginBottom: 20 },

  btnWrap: { marginBottom: 16 },

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
    gap: 8, borderWidth: 1.5, borderRadius: RADIUS.md, paddingVertical: 13,
  },
  socialBtnText: { fontSize: 14, fontWeight: '600' },

  loginRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  loginText: { fontSize: 14, color: MUTED },
  loginLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },
});
