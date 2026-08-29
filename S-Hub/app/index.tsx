import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenContent from '@/components/ScreenContent';
import { COLORS, RADIUS } from '@/constants/theme';
import { routeSignedInUserByRole } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const status = useAuthStore((store) => store.status);

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

  const handleGetStarted = () => router.replace('/onboarding');
  const handleSignIn = () => router.replace('/sign-in');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.logo}>AdwumaGo</Text>
        </View>

        <Animated.View style={[styles.bodyWrap, { opacity: fadeAnim }]}>
          <ScreenContent style={styles.bodyInner}>
            <View style={styles.tag}>
              <Ionicons name="shield-checkmark" size={ms(13)} color={COLORS.accent} />
              <Text style={styles.tagText}>Verified professionals only</Text>
            </View>

            <Text style={styles.headline}>Verified. Rated. Reliable.</Text>

            <Text style={styles.subcopy}>
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
              <Text style={styles.signInText}>
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
  root: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },

  header: {
    paddingHorizontal: s(20),
    paddingTop: vs(4),
    height: vs(56),
    justifyContent: 'center',
  },
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
