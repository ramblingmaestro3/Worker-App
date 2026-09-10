/**
 * Email/phone + password sign-in, with a client/worker toggle and Google/Apple
 * OAuth buttons. On success, lib/auth.routeSignedInUserByRole picks the landing
 * screen. "email_not_confirmed" detours to OtpVerification.
 */
import { AntDesign, FontAwesome5, Ionicons } from '@expo/vector-icons';
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
import { Wordmark } from '@/components/Logo';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { signInWithPassword, signInWithOAuthProvider, routeSignedInUserByRole } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';
import type { RootStackParamList } from '@/navigation/types';

export default function LoginScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'SignIn'>) {
  const [role, setRole] = useState<'client' | 'worker'>('client');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const T = useThemeColors();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleLogin = async () => {
    if (!credential || !password) return;
    setError('');
    setLoading(true);
    const result = await signInWithPassword({ identifier: credential, password });
    if (!result.success) {
      setLoading(false);
      if (result.needsVerification) {
        navigation.navigate('OtpVerification', { identifier: credential.trim(), mode: 'email' });
        return;
      }
      setError(result.error ?? 'Something went wrong signing in.');
      return;
    }
    await routeSignedInUserByRole(role);
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
    await routeSignedInUserByRole(role);
    setOauthLoading(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScreenContent style={styles.logoWrap}>
        <Wordmark size={ms(20)} />
      </ScreenContent>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <ScreenContent style={styles.header}>
            <Text style={[styles.subheading, { color: T.subText }]}>Sign in to continue using the app.</Text>
          </ScreenContent>

          <ScreenContent style={styles.container}>

            <View style={[styles.toggleWrap, { backgroundColor: T.inputBg }]}>
              <TouchableOpacity
                style={[styles.toggleBtn, role === 'client' && styles.toggleBtnActive]}
                onPress={() => setRole('client')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: role === 'client' }}
                accessibilityLabel="Sign in as client"
              >
                <Text style={[styles.toggleText, { color: T.subText }, role === 'client' && styles.toggleTextActive]}>Client</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, role === 'worker' && styles.toggleBtnActive]}
                onPress={() => setRole('worker')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: role === 'worker' }}
                accessibilityLabel="Sign in as worker"
              >
                <Text style={[styles.toggleText, { color: T.subText }, role === 'worker' && styles.toggleTextActive]}>Worker</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <Input
                icon={<FontAwesome5 name="envelope" size={ms(15)} color={T.subText} />}
                placeholder="Email or Phone Number"
                value={credential}
                onChangeText={setCredential}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrap}>
              <Input
                icon={<FontAwesome5 name="lock" size={ms(15)} color={T.subText} />}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                trailing={
                  <TouchableOpacity
                    onPress={() => setShowPass(!showPass)}
                    activeOpacity={0.7}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPass ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons name={showPass ? 'eye' : 'eye-off-outline'} size={ms(18)} color={T.subText} />
                  </TouchableOpacity>
                }
              />
            </View>

            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => navigation.navigate('ResetPassword')}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.loginBtnWrap}>
              <Button
                label="Sign In"
                onPress={handleLogin}
                disabled={!credential || !password}
                loading={loading}
              />
            </View>

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
                    <AntDesign name="google" size={ms(18)} color="#EA4335" />
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
                    <Ionicons name="logo-apple" size={ms(20)} color={T.text} />
                    <Text style={[styles.socialBtnText, { color: T.text }]}>Continue with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.registerRow}
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to registration"
            >
              <Text style={[styles.registerText, { color: T.subText }]}>
                Don&apos;t have an account?{' '}
                <Text style={styles.registerLink}>Register</Text>
              </Text>
            </TouchableOpacity>
          </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoWrap: { paddingHorizontal: s(24), paddingTop: vs(16) },
  logo: { fontSize: ms(20), fontWeight: '900', color: COLORS.primary },

  container: {
    paddingHorizontal: s(24),
    paddingTop: vs(4),
    paddingBottom: vs(40),
  },

  header: {
    paddingHorizontal: s(24),
    paddingTop: vs(12),
    paddingBottom: vs(4),
  },

  subheading: {
    fontSize: ms(14),
  },

  /* Toggle */
  toggleWrap: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    padding: s(4),
    marginTop: vs(4),
    marginBottom: vs(28),
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: vs(10),
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: ms(14),
    fontWeight: '600',
    color: COLORS.muted,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  /* Inputs */
  inputWrap: {
    marginBottom: vs(14),
  },

  /* Forgot */
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: vs(24),
    marginTop: vs(4),
  },
  forgotText: {
    fontSize: ms(13),
    color: COLORS.primary,
    fontWeight: '600',
  },

  errorText: {
    fontSize: ms(13),
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: vs(16),
  },

  /* Login button */
  loginBtnWrap: {
    marginBottom: vs(24),
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginBottom: vs(20),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: ms(12),
    color: COLORS.muted,
    fontWeight: '500',
  },

  /* Social */
  socialRow: {
    flexDirection: 'row',
    gap: s(12),
    marginBottom: vs(32),
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: vs(13),
    backgroundColor: COLORS.card,
  },
  socialBtnText: {
    fontSize: ms(14),
    fontWeight: '600',
    color: COLORS.text,
  },

  /* Register */
  registerRow: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: ms(13),
    color: COLORS.muted,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
