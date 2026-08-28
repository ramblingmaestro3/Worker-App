import { AntDesign, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { api, setAuthSession } from '../lib/api';

export default function LoginScreen() {
  const [role, setRole] = useState<'customer' | 'worker'>('customer');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('Login button pressed');
    console.log('Credential:', credential);
    console.log('Password:', password ? '***' : 'empty');
    console.log('Role:', role);

    if (!credential || !password) {
      Alert.alert('Error', 'Please enter your credential and password');
      return;
    }

    setLoading(true);
    try {
      console.log('Calling API login...');
      const response = await api.login({ credential, password, role });
      console.log('Login successful:', response);
      setAuthSession(response.tokens);
      router.replace(response.user?.role === 'worker' ? '/worker-home' as any : '/(tabs)/home' as any);
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── BACK ARROW ── */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        {/* ── HEADING ── */}
        <Text style={styles.heading}>Welcome back! 👋</Text>
        <Text style={styles.subheading}>Login to continue</Text>

        {/* ── CUSTOMER / WORKER TOGGLE ── */}
        <View style={styles.toggleWrap}>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'customer' && styles.toggleBtnActive]}
            onPress={() => setRole('customer')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, role === 'customer' && styles.toggleTextActive]}>
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'worker' && styles.toggleBtnActive]}
            onPress={() => setRole('worker')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, role === 'worker' && styles.toggleTextActive]}>
              Worker
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── PHONE / EMAIL INPUT ── */}
        <View style={styles.inputWrap}>
          <View style={styles.inputRow}>
            <FontAwesome5 name="phone-alt" size={15} color={COLORS.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone number or email"
              placeholderTextColor={COLORS.muted}
              value={credential}
              onChangeText={setCredential}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* ── PASSWORD INPUT ── */}
        <View style={styles.inputWrap}>
          <View style={styles.inputRow}>
            <FontAwesome5 name="lock" size={15} color={COLORS.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} activeOpacity={0.7}>
              <Ionicons
                name={showPass ? 'eye' : 'eye-off-outline'}
                size={18}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FORGOT PASSWORD ── */}
        <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* ── LOGIN BUTTON ── */}
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* ── DIVIDER ── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── SOCIAL BUTTONS ── */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <AntDesign name="google" size={18} color="#EA4335" />
            <Text style={styles.socialBtnText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialBtn, styles.appleSocialBtn]} activeOpacity={0.8}>
            <AntDesign name="apple" size={18} color="#000" />
            <Text style={styles.socialBtnText}>Apple</Text>
          </TouchableOpacity>
        </View>

        {/* ── REGISTER LINK ── */}
        <TouchableOpacity
          style={styles.registerRow}
          onPress={() => router.push('/register' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.registerText}>
            Don&apos;t have an account?{' '}
            <Text style={styles.registerLink}>Register</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },

  /* Back */
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    marginLeft: -4,
  },

  /* Heading */
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 28,
  },

  /* Toggle */
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F2',
    borderRadius: 30,
    padding: 4,
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
    backgroundColor: '#F5F5F5',
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

  /* Login button */
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: '#E8E8E8',
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
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  appleSocialBtn: {
    borderColor: '#CCCCCC',
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
