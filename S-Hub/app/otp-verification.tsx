import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { s, vs, ms } from '@/lib/scaling';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 59;

export default function OtpVerificationScreen() {
  const T = useThemeColors();
  const { identifier, mode } = useLocalSearchParams<{ identifier?: string; mode?: 'phone' | 'email' }>();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timeLeft, setTimeLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((sec) => sec - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const handleChange = (text: string, index: number) => {
    const char = text.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || !identifier || resending) return;
    setError('');
    setResending(true);
    setResent(false);
    try {
      const { error: resendError } = await supabase.auth.resend(
        mode === 'phone'
          ? { type: 'sms', phone: identifier }
          : { type: 'signup', email: identifier }
      );
      if (resendError) {
        let msg = resendError.message;
        if (msg.includes('rate limit') || msg.includes('too many')) {
          msg = 'Too many attempts. Please wait a minute before resending.';
        } else if (msg.includes('not found') || msg.includes('no user')) {
          msg = 'No account found. Go back and sign up again.';
        }
        setError(msg);
      } else {
        setResent(true);
        setTimeLeft(RESEND_SECONDS);
        setTimeout(() => setResent(false), 3000);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    const token = digits.join('');
    if (token.length !== OTP_LENGTH || !identifier) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setError('');
    setVerifying(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp(
      mode === 'phone'
        ? { phone: identifier, token, type: 'sms' }
        : { email: identifier, token, type: 'signup' }
    );
    setVerifying(false);
    if (verifyError) {
      // Provide more helpful error messages
      let msg = verifyError.message;
      if (msg.includes('expired') || msg.includes('invalid')) {
        msg = 'This code is invalid or expired. Try resending a new code.';
      } else if (msg.includes('not found') || msg.includes('no user')) {
        msg = 'No account found. Go back and sign up again.';
      }
      setError(msg);
      return;
    }
    if (data.session) {
      const role = data.user?.user_metadata?.role;
      router.replace((role === 'worker' ? '/become-worker' : '/home') as any);
    } else {
      setError('Verification succeeded but no session was created. Try signing in.');
    }
  };

  // Development bypass: skip OTP and go straight to home
  const handleSkip = () => {
    router.replace('/home' as any);
  };

  const formattedTime = `(00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft})`;

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
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: T.text }]}>Verify Your Account</Text>
          <Text style={[styles.heroSubtitle, { color: T.subText }]}>
            We've sent a 6-digit code to{' '}
            <Text style={[styles.bold, { color: T.text }]}>{identifier ?? 'your phone/email'}</Text>. Enter it below to continue.
          </Text>
        </View>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(ref: TextInput | null) => {
                inputRefs.current[i] = ref;
              }}
              style={[styles.otpInput, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
              value={d}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
            />
          ))}
        </View>

        <View style={styles.resendBlock}>
          <Text style={[styles.resendLabel, { color: T.subText }]}>Didn't receive the code?</Text>
          {resent ? (
            <View style={styles.resentRow}>
              <Ionicons name="checkmark-circle" size={ms(14)} color="#22C55E" />
              <Text style={styles.resentText}>Code sent! Check your {mode === 'phone' ? 'phone' : 'email'}.</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={timeLeft > 0 || resending}>
              {resending ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.resendButton, timeLeft > 0 && { color: T.subText }]}>
                  Resend Code {timeLeft > 0 ? formattedTime : ''}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={verifying}
          activeOpacity={0.85}
        >
          {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <View style={[styles.securityNote, { backgroundColor: T.inputBg, borderColor: T.border }]}>
          <Ionicons name="shield-checkmark-outline" size={ms(20)} color={COLORS.primary} />
          <Text style={[styles.securityText, { color: T.subText }]}>
            Your security is our priority. AdwumaGo uses bank-grade encryption to protect your data.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(20), paddingVertical: vs(12) },
  logo: { fontSize: ms(22), fontWeight: '900', color: COLORS.primary },
  scrollContent: { paddingHorizontal: s(20), paddingBottom: vs(40), gap: vs(20), alignItems: 'center' },
  hero: { width: '100%', maxWidth: s(544), marginBottom: vs(4), alignItems: 'center' },
  heroTitle: { fontSize: ms(26), fontWeight: '800', marginBottom: vs(6) },
  heroSubtitle: { fontSize: ms(14), lineHeight: ms(20), textAlign: 'center' },
  bold: { fontWeight: '700' },
  otpRow: { flexDirection: 'row', gap: s(8), marginBottom: vs(8), justifyContent: 'center' },
  otpInput: {
    width: s(62),
    height: s(62),
    textAlign: 'center',
    fontSize: ms(22),
    fontWeight: '800',
    borderRadius: s(14),
    borderWidth: s(1),
  },
  resendBlock: { width: '100%', maxWidth: s(544), alignItems: 'center', gap: vs(6), marginBottom: vs(8) },
  resendLabel: { fontSize: ms(13) },
  resendButton: { fontSize: ms(13), fontWeight: '700', color: COLORS.primary },
  resentRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  resentText: { fontSize: ms(12), fontWeight: '600', color: '#22C55E' },
  errorText: { color: '#DC2626', fontSize: ms(13), textAlign: 'center' },
  verifyButton: {
    width: '100%',
    maxWidth: s(544),
    height: vs(56),
    borderRadius: s(16),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(4),
  },
  verifyText: { fontSize: ms(16), fontWeight: '700', color: '#fff' },
  skipButton: { paddingVertical: vs(12), marginTop: vs(4) },
  skipText: { fontSize: ms(14), fontWeight: '600', color: COLORS.primary },
  securityNote: {
    width: '100%',
    maxWidth: s(544),
    marginTop: vs(8),
    padding: s(16),
    borderRadius: s(16),
    borderWidth: s(1),
    alignItems: 'center',
    gap: s(8),
  },
  securityText: { fontSize: ms(12), textAlign: 'center', lineHeight: ms(17) },
});