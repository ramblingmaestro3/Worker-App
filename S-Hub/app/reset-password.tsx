import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { buildRedirectUrl } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';

type Step = 1 | 2 | 3 | 'success' | 'check_email';

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

export default function ResetPasswordScreen() {
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
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier.trim(), {
          redirectTo: buildRedirectUrl('reset-password'),
        });
        if (resetError) throw resetError;
        setStep('check_email');
      } else {
        const phone = formatPhone(identifier.trim());
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone,
          options: { shouldCreateUser: false },
        });
        if (otpError) throw otpError;
        setStep(2);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (otp.trim().length < 6) {
      setError('Enter the 6-digit code sent to your phone.');
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
      const phone = formatPhone(identifier.trim());
      // 'recovery' (not 'sms') so the resulting session is recovery-flavored —
      // this project requires the current password on updateUser() otherwise,
      // which a forgot-password flow can never satisfy by definition.
      const { error: verifyError } = await supabase.auth.verifyOtp({ phone, token: otp.trim(), type: 'recovery' as any });
      if (verifyError) throw verifyError;
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
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
      const phone = formatPhone(identifier.trim());
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone,
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
      await supabase.auth.signOut();
      setStep('success');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={ms(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.logo}>AdwumaGo</Text>
        <View style={{ width: s(24) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <View>
              <View style={styles.stepHeader}>
                <Text style={[styles.title, { color: T.text }]}>Forgot Password?</Text>
                <Text style={[styles.subtitle, { color: T.subText }]}>
                  Enter your registered phone number or email and we'll send you a code to reset your password.
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
                  <Text style={styles.footerLink} onPress={() => router.replace('/sign-in' as any)}>
                    Log In
                  </Text>
                </Text>
              </View>
            </View>
          )}

          {/* ── STEP 2: OTP + New Password (phone) ── */}
          {step === 2 && (
            <View>
              <View style={styles.verifiedRow}>
                <Ionicons name="phone-portrait-outline" size={ms(18)} color={COLORS.primary} />
                <Text style={styles.verifiedText}>CODE SENT TO {identifier}</Text>
              </View>
              <View style={styles.stepHeader}>
                <Text style={[styles.title, { color: T.text }]}>Enter Code & New Password</Text>
                <Text style={[styles.subtitle, { color: T.subText }]}>
                  Enter the 6-digit code we sent to your phone and your new password.
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
                  <Text style={styles.resendText}>Didn't get the code? Resend</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.backRow} onPress={() => setStep(1)}>
                <Ionicons name="arrow-undo-outline" size={ms(16)} color={T.subText} />
                <Text style={[styles.backText, { color: T.subText }]}>Change email/phone</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── CHECK EMAIL ── */}
          {step === 'check_email' && (
            <View style={styles.successBlock}>
              <View style={[styles.successIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="mail-open-outline" size={ms(48)} color={COLORS.primary} />
              </View>
              <Text style={[styles.title, { color: T.text }]}>Check Your Email</Text>
              <Text style={[styles.subtitle, { color: T.subText, marginBottom: vs(24) }]}>
                We've sent a password reset link to {identifier}. Click the link in the email to reset your password.
              </Text>
              <Text style={[styles.hintText, { color: T.subText, marginBottom: vs(16) }]}>
                Tip: Check your spam or junk folder if you don't see the email.
              </Text>
              <TouchableOpacity style={styles.darkButton} onPress={() => router.replace('/sign-in' as any)} activeOpacity={0.85}>
                <Text style={styles.darkButtonText}>Back to Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backRow} onPress={() => setStep(1)}>
                <Ionicons name="arrow-undo-outline" size={ms(16)} color={T.subText} />
                <Text style={[styles.backText, { color: T.subText }]}>Try a different email</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: New Password (email recovery) ── */}
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
              <TouchableOpacity style={styles.darkButton} onPress={() => router.replace('/sign-in' as any)} activeOpacity={0.85}>
                <Text style={styles.darkButtonText}>Proceed to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(20), paddingVertical: vs(12) },
  logo: { fontSize: ms(22), fontWeight: '900', color: COLORS.primary },
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