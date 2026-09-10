/**
 * Multi-step password reset: request a code -> enter code -> set a new password.
 * Also the landing screen for the "type=recovery" deep link (see App.tsx).
 */
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { Wordmark } from '@/components/Logo';
import { useThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { signOutIntent } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';
import type { RootStackParamList } from '@/navigation/types';

type Step = 1 | 2 | 3 | 'success';

const PASSWORD_MSG =
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., !, @, #, $).';

function isPasswordValid(pw: string): boolean {
  if (pw.length < 6) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

export default function ResetPasswordScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ResetPassword'>) {
  const T = useThemeColors();
  const [step, setStep] = useState<Step>(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEmail = identifier.includes('@');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStep(3);
      }
    });
  }, []);

  const formatPhone = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').replace(/^0/, '');
    return digitsOnly.startsWith('233') ? `+${digitsOnly}` : `+233${digitsOnly}`;
  };

  const handleSendCode = async () => {
    setError('');
    if (!identifier.trim()) {
      setError('Please enter your registered email or phone number.');
      return;
    }
    setLoading(true);
    try {
      if (isEmail) {
        // OTP-code flow, not a magic link: the reset email carries a 6-digit
        // {{ .Token }} the user types on the next step. A link round-trip
        // through the app's custom scheme is unreliable in Expo Go and was
        // silently dropping users back on the Splash screen.
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier.trim());
        if (resetError) throw resetError;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: formatPhone(identifier.trim()),
          options: { shouldCreateUser: false },
        });
        if (otpError) throw otpError;
      }
      setStep(2);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (otp.trim().length < 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setError(PASSWORD_MSG);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      // 'recovery' (not 'sms'/'email') so the resulting session is
      // recovery-flavored — this project requires the current password on
      // updateUser() otherwise, which a forgot-password flow can never satisfy.
      const { error: verifyError } = isEmail
        ? await supabase.auth.verifyOtp({ email: identifier.trim(), token: otp.trim(), type: 'recovery' })
        : await supabase.auth.verifyOtp({ phone: formatPhone(identifier.trim()), token: otp.trim(), type: 'recovery' as any });
      if (verifyError) throw verifyError;
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      // Tell App.tsx's session-expiry watcher this sign-out is deliberate, so
      // it doesn't fire a spurious "Session Expired" alert over the success screen.
      signOutIntent.current = true;
      await supabase.auth.signOut();
      setStep('success');
    } catch (err: any) {
      let msg = err?.message ?? 'Failed to reset password. Please try again.';
      if (msg.includes('expired') || msg.includes('invalid')) {
        msg = 'The code is invalid or expired. Go back and resend a new code.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: otpError } = isEmail
        ? await supabase.auth.resetPasswordForEmail(identifier.trim())
        : await supabase.auth.signInWithOtp({
            phone: formatPhone(identifier.trim()),
            options: { shouldCreateUser: false },
          });
      if (otpError) throw otpError;
    } catch (err: any) {
      setError(err?.message ?? 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    if (!isPasswordValid(newPassword)) {
      setError(PASSWORD_MSG);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      signOutIntent.current = true;
      await supabase.auth.signOut();
      setStep('success');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={{ paddingHorizontal: s(20), paddingTop: vs(16), paddingBottom: vs(4) }}>
        <Wordmark size={ms(20)} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <View>
              <View style={styles.stepHeader}>
                <Text style={[styles.title, { color: T.text }]}>Forgot Password?</Text>
                <Text style={[styles.subtitle, { color: T.subText }]}>
                  Enter your registered phone number or email and we&apos;ll send you a code to reset your password.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: T.subText }]}>Phone or Email</Text>
                <View style={[styles.inputBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                  <Ionicons name="mail-outline" size={ms(20)} color={T.subText} />
                  <TextInput
                    style={[styles.input, { color: T.text }]}
                    placeholder="e.g. hello@adwumago.gh or 050 000 0000"
                    placeholderTextColor={T.subText}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Send Reset Code</Text>
                    <Ionicons name="chevron-forward" size={ms(20)} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={[styles.footerText, { color: T.subText }]}>
                  Remembered your password?{' '}
                  <Text style={styles.footerLink} onPress={() => navigation.replace('SignIn')}>
                    Log In
                  </Text>
                </Text>
              </View>
            </View>
          )}

          {/* ── STEP 2: OTP code + New Password (email or phone) ── */}
          {step === 2 && (
            <View>
              <View style={styles.verifiedRow}>
                <Ionicons name={isEmail ? 'mail-outline' : 'phone-portrait-outline'} size={ms(18)} color={COLORS.primary} />
                <Text style={styles.verifiedText}>CODE SENT TO {identifier}</Text>
              </View>
              <View style={styles.stepHeader}>
                <Text style={[styles.title, { color: T.text }]}>Enter Code & New Password</Text>
                <Text style={[styles.subtitle, { color: T.subText }]}>
                  Enter the 6-digit code from {isEmail ? 'your email' : 'the text message'} and choose a new password.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: T.subText }]}>Verification Code</Text>
                <View style={[styles.inputBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                  <Ionicons name="keypad-outline" size={ms(20)} color={T.subText} />
                  <TextInput
                    style={[styles.input, { color: T.text }]}
                    placeholder="123456"
                    placeholderTextColor={T.subText}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: T.subText }]}>New Password</Text>
                <View style={[styles.inputBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                  <Ionicons name="lock-open-outline" size={ms(20)} color={T.subText} />
                  <TextInput
                    style={[styles.input, { color: T.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={T.subText}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={ms(20)} color={T.subText} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: T.subText }]}>Confirm Password</Text>
                <View style={[styles.inputBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                  <Ionicons name="refresh-outline" size={ms(20)} color={T.subText} />
                  <TextInput
                    style={[styles.input, { color: T.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={T.subText}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Reset Password</Text>}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                  <Text style={styles.resendText}>Didn&apos;t get the code? Resend</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.backRow} onPress={() => setStep(1)}>
                <Ionicons name="arrow-undo-outline" size={ms(16)} color={T.subText} />
                <Text style={[styles.backText, { color: T.subText }]}>Change email/phone</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: New Password (email recovery via deep link — fallback) ── */}
          {step === 3 && (
            <View>
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark-outline" size={ms(18)} color={COLORS.primary} />
                <Text style={styles.verifiedText}>EMAIL VERIFIED</Text>
              </View>
              <View style={styles.stepHeader}>
                <Text style={[styles.title, { color: T.text }]}>Set New Password</Text>
                <Text style={[styles.subtitle, { color: T.subText }]}>
                  Your email has been verified. Choose a strong password (uppercase, lowercase, number, special character).
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: T.subText }]}>New Password</Text>
                <View style={[styles.inputBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                  <Ionicons name="lock-open-outline" size={ms(20)} color={T.subText} />
                  <TextInput
                    style={[styles.input, { color: T.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={T.subText}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={ms(20)} color={T.subText} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: T.subText }]}>Confirm Password</Text>
                <View style={[styles.inputBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                  <Ionicons name="refresh-outline" size={ms(20)} color={T.subText} />
                  <TextInput
                    style={[styles.input, { color: T.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={T.subText}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Reset Password</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── SUCCESS ── */}
          {step === 'success' && (
            <View style={styles.successBlock}>
              <View style={[styles.successIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="checkmark-circle" size={ms(48)} color={COLORS.primary} />
              </View>
              <Text style={[styles.title, { color: T.text }]}>Success!</Text>
              <Text style={[styles.subtitle, { color: T.subText, marginBottom: vs(24) }]}>
                Your password has been reset successfully. You can now log in with your new credentials.
              </Text>
              <TouchableOpacity style={styles.darkButton} onPress={() => navigation.replace('SignIn')} activeOpacity={0.85}>
                <Text style={styles.darkButtonText}>Proceed to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  logo: { fontSize: ms(22), fontWeight: '900', color: COLORS.primary, paddingHorizontal: s(20), paddingTop: vs(16), paddingBottom: vs(4) },
  scrollContent: { paddingHorizontal: s(20), paddingBottom: vs(40), alignItems: 'center' },
  card: { width: '100%', maxWidth: s(544), borderWidth: s(1), borderRadius: s(24), padding: s(24) },
  stepHeader: { marginBottom: vs(24) },
  title: { fontSize: ms(24), fontWeight: '800', marginBottom: vs(8) },
  subtitle: { fontSize: ms(14), lineHeight: ms(20) },
  field: { marginBottom: vs(20), gap: vs(6) },
  label: { fontSize: ms(12), fontWeight: '600', textTransform: 'uppercase' },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: s(16), borderWidth: s(1), height: vs(56), paddingHorizontal: s(14), gap: s(10) },
  input: { flex: 1, fontSize: ms(16), padding: 0 },
  submitButton: {
    minHeight: vs(56),
    borderRadius: s(16),
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: ms(16), fontWeight: '700', color: '#fff' },
  footerRow: { marginTop: vs(24), alignItems: 'center' },
  footerText: { fontSize: ms(14) },
  footerLink: { color: COLORS.primary, fontWeight: '700' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: s(6), marginBottom: vs(8) },
  verifiedText: { fontSize: ms(11), fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },
  backRow: { marginTop: vs(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(6) },
  backText: { fontSize: ms(13) },
  resendRow: { marginTop: vs(12), alignItems: 'center' },
  resendText: { fontSize: ms(13), fontWeight: '600', color: COLORS.primary },
  errorText: { color: '#DC2626', fontSize: ms(13), textAlign: 'center', marginBottom: vs(12) },
  successBlock: { alignItems: 'center', paddingVertical: vs(20) },
  successIconWrap: { width: s(80), height: s(80), borderRadius: s(40), alignItems: 'center', justifyContent: 'center', marginBottom: vs(20) },
  hintText: { fontSize: ms(12), textAlign: 'center', lineHeight: ms(17) },
  darkButton: { width: '100%', minHeight: vs(56), borderRadius: s(16), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  darkButtonText: { fontSize: ms(16), fontWeight: '700', color: '#fff' },
});
