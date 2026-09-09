import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenContent from '@/components/ScreenContent';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { routeSignedInUserByRole } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { RootStackParamList } from '@/navigation/types';

export default function SplashScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Splash'>) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const status = useAuthStore((store) => store.status);
  const T = useThemeColors();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    // A relaunch with an existing session skips the marketing splash
    // entirely and goes straight to the signed-in user's role home.
    if (status === 'signed-in') routeSignedInUserByRole();
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        fadeAnim.setValue(1);
      } else {
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }
    });
    return () => { cancelled = true; };
  }, [fadeAnim]);

  const handleGetStarted = () => navigation.replace('Onboarding');
  const handleSignIn = () => navigation.replace('SignIn');

  return (
    <View style={styles.root}>
      <StatusBar barStyle={T.statusBar} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <ScreenContent style={styles.logoWrap}>
          <Text style={styles.logo}>AdwumaGo</Text>
        </ScreenContent>

        <Animated.View style={[styles.bodyWrap, { opacity: fadeAnim }]}>
          <ScreenContent style={styles.bodyInner}>
            <View style={[styles.tag, { borderColor: T.border }]}>
              <Ionicons name="shield-checkmark" size={ms(13)} color={COLORS.accent} />
              <Text style={[styles.tagText, { color: T.text }]}>Verified professionals only</Text>
            </View>

            <Text style={[styles.headline, { color: T.text }]}>Verified. Rated. Reliable.</Text>

            <Text style={[styles.subcopy, { color: T.subText }]}>
              Skilled, background-checked professionals — ready to work, right in your
              neighborhood.
            </Text>
          </ScreenContent>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <ScreenContent style={styles.footer}>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={handleGetStarted}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Get started"
            >
              <Text style={styles.ctaText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={ms(18)} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInRow}
              onPress={handleSignIn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sign in to an existing account"
            >
              <Text style={[styles.signInText, { color: T.subText }]}>
                Already using AdwumaGo? <Text style={styles.signInLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </ScreenContent>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  logoWrap: { paddingHorizontal: s(24), paddingTop: vs(16) },
  logo: { fontSize: ms(20), fontWeight: '900', color: COLORS.primary },

  bodyWrap: { flex: 1, justifyContent: 'center' },
  bodyInner: { paddingHorizontal: s(24) },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: s(6),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: vs(6),
    paddingHorizontal: s(12),
    marginBottom: vs(20),
  },
  tagText: { fontSize: ms(12.5), fontWeight: '600', color: COLORS.dark },

  headline: {
    fontSize: ms(34),
    fontWeight: '800',
    lineHeight: ms(40),
    letterSpacing: -0.5,
    color: COLORS.dark,
    marginBottom: vs(14),
    maxWidth: s(320),
  },
  subcopy: {
    fontSize: ms(15),
    lineHeight: ms(22),
    color: COLORS.muted,
    maxWidth: s(320),
  },

  footer: { paddingHorizontal: s(20), paddingTop: vs(8), paddingBottom: vs(28) },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    height: vs(52),
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  ctaText: { fontSize: ms(16), fontWeight: '700', color: '#fff' },

  signInRow: { alignItems: 'center', paddingTop: vs(16) },
  signInText: { fontSize: ms(13.5), color: COLORS.muted },
  signInLink: { color: COLORS.primary, fontWeight: '700' },
});
