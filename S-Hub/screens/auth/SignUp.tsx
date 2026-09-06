import { AntDesign, Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useState } from 'react';
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
import {
  signUpWithPassword,
  signInWithOAuthProvider,
  routeSignedInUserByRole,
  isEmailIdentifier,
  isValidEmail,
  isValidGhanaPhone,
  passwordStrengthError,
  formatGhanaPhone,
} from '@/lib/auth';
import type { RootStackParamList } from '@/navigation/types';

const PRIMARY = COLORS.primary;
const MUTED = COLORS.muted;

export default function SignUpScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'SignUp'>) {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'worker'>('client');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const T = useThemeColors();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, headerTitle: 'Sign Up' });
  }, [navigation]);

  /** Validates all fields, setting per-field inline errors. Returns whether the form is valid. */
  const validate = (): boolean => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Enter your full name.');
      valid = false;
    } else {
      setNameError('');
    }

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setIdentifierError('Enter your email or phone number.');
      valid = false;
    } else if (isEmailIdentifier(trimmedIdentifier)) {
      if (!isValidEmail(trimmedIdentifier)) {
        setIdentifierError('Enter a valid email address.');
        valid = false;
      } else {
        setIdentifierError('');
      }
    } else if (!isValidGhanaPhone(trimmedIdentifier)) {
      setIdentifierError('Enter a valid Ghanaian phone number, e.g. 024 123 4567.');
      valid = false;
    } else {
      setIdentifierError('');
    }

    const pwError = password ? passwordStrengthError(password) : 'Enter a password.';
    if (pwError) {
      setPasswordError(pwError);
      valid = false;
    } else {
      setPasswordError('');
    }

    return valid;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setError('');
    setLoading(true);
    const result = await signUpWithPassword({ fullName: name, identifier, password, role });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Something went wrong creating your account.');
      return;
    }
    if (result.needsVerification) {
      // Email confirmation is on project-wide — no session yet, so send them
      // to enter the code before anything else can happen. Route by the
      // actual identifier type: a phone signup needs the E.164-formatted
      // number and 'phone' mode, or verifyOtp on the next screen won't match
      // what Supabase actually sent the code to.
      const trimmed = identifier.trim();
      const isEmail = isEmailIdentifier(trimmed);
      navigation.navigate('OtpVerification', {
        identifier: isEmail ? trimmed : formatGhanaPhone(trimmed),
        mode: isEmail ? 'email' : 'phone',
      });
      return;
    }
    // No verification needed (e.g. confirmations off) — signUp already
    // returned an active session, go straight in. Routed through
    // routeSignedInUserByRole (rather than a raw navigation.replace) so a
    // 'worker' choice here is treated the same as everywhere else: not
    // eligible yet (just signed up, hasn't submitted the become-worker
    // application), so it lands on BecomeWorker without prematurely marking
    // 'worker' as the remembered side.
    await routeSignedInUserByRole(role);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <ScreenContent style={styles.header}>
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
              <Input
                label="Full Name"
                placeholder="Enter your Full Name"
                value={name}
                onChangeText={(v) => { setName(v); if (nameError) setNameError(''); }}
                error={nameError}
              />
            </View>

            <View style={styles.inputBox}>
              <Input
                label="Email or Phone"
                placeholder="Enter your Phone Number or Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={identifier}
                onChangeText={(v) => { setIdentifier(v); if (identifierError) setIdentifierError(''); }}
                error={identifierError}
              />
            </View>

            <View style={styles.inputBox}>
              <Input
                label="Password"
                placeholder="At least 8 characters, with upper/lowercase, a number & symbol"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
                error={passwordError}
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
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: T.card, borderColor: T.border }]}
                onPress={() => handleOAuth('apple')}
                disabled={oauthLoading !== null}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                {oauthLoading === 'apple' ? (
                  <ActivityIndicator size="small" color={T.text} />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color={T.text} />
                    <Text style={[styles.socialBtnText, { color: T.text }]}>Continue with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.loginRow}>
              <Text style={[styles.loginText, { color: T.subText }]}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.replace('SignIn')}
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

  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  subheading: { fontSize: 14 },

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
