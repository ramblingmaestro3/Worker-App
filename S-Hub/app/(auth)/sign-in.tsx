import { AntDesign, FontAwesome5, Ionicons } from '@expo/vector-icons';
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
            <Text style={[styles.heading, { color: T.text }]}>Sign In</Text>
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
                icon={<FontAwesome5 name="envelope" size={15} color={T.subText} />}
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
                icon={<FontAwesome5 name="lock" size={15} color={T.subText} />}
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
                    <Ionicons name={showPass ? 'eye' : 'eye-off-outline'} size={18} color={T.subText} />
                  </TouchableOpacity>
                }
              />
            </View>

            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => router.push('/reset-password')}
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
                    <AntDesign name="google" size={18} color="#EA4335" />
                    <Text style={[styles.socialBtnText, { color: T.text }]}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.registerRow}
              onPress={() => router.push('/sign-up')}
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

  /* Back */
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

  /* Heading */
  heading: {
    fontSize: ms(26),
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: vs(4),
  },
  subheading: {
    fontSize: ms(14),
  },

  /* Toggle */
  toggleWrap: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    padding: 4,
    marginTop: 4,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
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
    marginBottom: 24,
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
    borderRadius: RADIUS.md,
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
