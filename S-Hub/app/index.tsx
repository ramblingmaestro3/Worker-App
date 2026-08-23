import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { s, vs, ms } from '@/lib/scaling';

const MAX_CONTENT_WIDTH = s(544);

// Layered hero badge geometry — three concentric circles of decreasing size,
// each absolutely positioned and centered within the same box so they overlap.
const BADGE_SIZE = s(140);
const BADGE_OUTER_SIZE = s(104);
const BADGE_INNER_SIZE = s(72);
const BADGE_OUTER_OFFSET = (BADGE_SIZE - BADGE_OUTER_SIZE) / 2;
const BADGE_INNER_OFFSET = (BADGE_SIZE - BADGE_INNER_SIZE) / 2;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TrustStat = {
  key: string;
  icon: IoniconName;
  label: string;
};

const TRUST_STATS: TrustStat[] = [
  { key: 'rating', icon: 'star', label: '4.9 rating' },
  { key: 'verified', icon: 'shield-checkmark', label: 'Verified pros' },
  { key: 'fast', icon: 'flash', label: 'Fast response' },
];

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riseAnim = useRef(new Animated.Value(vs(18))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(riseAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, riseAnim]);

  const handleGetStarted = () => {
    router.replace('/onboarding' as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero (dark) zone ── */}
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.topSafeArea}>
        <View style={styles.topClip}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <Animated.View
            style={[
              styles.topContent,
              { opacity: fadeAnim, transform: [{ translateY: riseAnim }] },
            ]}
          >
            <View style={styles.brandBlock}>
              <Text style={styles.eyebrow}>GHANA&rsquo;S TRUSTED WORKFORCE</Text>
              <Text style={styles.wordmark}>AdwumaGo</Text>
              <View style={styles.wordmarkUnderline} />
              <Text style={styles.tagline}>
                Find trusted workers.{'\n'}
                <Text style={styles.taglineAccent}>Get work done.</Text>
              </Text>
            </View>

            <View style={styles.badgeArea}>
              <View style={styles.badgeGlow} />
              <View style={styles.badgeOuter}>
                <LinearGradient
                  colors={['rgba(240,174,46,0.32)', 'rgba(240,174,46,0.02)']}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <View style={styles.badgeInner}>
                <LinearGradient
                  colors={[COLORS.accent, COLORS.accentDark]}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={styles.badgeInnerFill}
                >
                  <MaterialCommunityIcons
                    name="account-hard-hat"
                    size={ms(36)}
                    color={COLORS.primaryDark}
                  />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.statsRow}>
              {TRUST_STATS.map((stat) => (
                <View key={stat.key} style={styles.statChip}>
                  <Ionicons name={stat.icon} size={ms(13)} color={COLORS.accent} />
                  <Text style={styles.statText}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* ── Trust (light) zone ── */}
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.bottomSafeArea}>
        <Animated.View style={[styles.bottomContent, { opacity: fadeAnim }]}>
          <View style={styles.handle} />

          <Text style={styles.headline}>Verified. Rated. Reliable.</Text>
          <Text style={styles.subcopy}>
            Skilled, background-checked professionals — ready to work, right in your
            neighborhood.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaFill}
            >
              <Text style={styles.ctaText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={ms(18)} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Top hero zone — sized to its own content (like sign-in/sign-up's
  // gradientHeader banner), not flex:1, so it reads as a banner rather than
  // a full-screen zone competing with the light zone below for space.
  topSafeArea: {},
  topClip: {
    overflow: 'hidden',
    borderBottomLeftRadius: s(24),
    borderBottomRightRadius: s(24),
  },
  topContent: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingTop: vs(20),
    paddingBottom: vs(24),
  },

  brandBlock: {
    alignItems: 'center',
    marginBottom: vs(4),
  },
  eyebrow: {
    fontSize: ms(11),
    fontWeight: '700',
    letterSpacing: s(1.6),
    color: COLORS.accent,
    marginBottom: vs(10),
  },
  wordmark: {
    fontSize: ms(30),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: s(0.4),
  },
  wordmarkUnderline: {
    width: s(32),
    height: s(3),
    borderRadius: s(2),
    backgroundColor: COLORS.accent,
    marginTop: vs(8),
    marginBottom: vs(10),
  },
  tagline: {
    fontSize: ms(16),
    lineHeight: ms(23),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  taglineAccent: {
    color: COLORS.accent,
    fontWeight: '800',
  },

  // Layered hero badge
  badgeArea: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    marginTop: vs(18),
    marginBottom: vs(18),
  },
  badgeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: 'rgba(240,174,46,0.12)',
  },
  badgeOuter: {
    position: 'absolute',
    top: BADGE_OUTER_OFFSET,
    left: BADGE_OUTER_OFFSET,
    width: BADGE_OUTER_SIZE,
    height: BADGE_OUTER_SIZE,
    borderRadius: BADGE_OUTER_SIZE / 2,
    borderWidth: s(1),
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  badgeInner: {
    position: 'absolute',
    top: BADGE_INNER_OFFSET,
    left: BADGE_INNER_OFFSET,
    width: BADGE_INNER_SIZE,
    height: BADGE_INNER_SIZE,
    borderRadius: BADGE_INNER_SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: vs(8) },
    elevation: 10,
  },
  badgeInnerFill: {
    flex: 1,
    borderRadius: BADGE_INNER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Trust stat chips
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: s(8),
    width: '100%',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(12),
    paddingVertical: vs(8),
    borderRadius: s(999),
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: s(1),
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: s(6),
    shadowOffset: { width: 0, height: vs(3) },
    elevation: 3,
  },
  statText: {
    fontSize: ms(12),
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Bottom trust zone — flex:1 so this is the dominant zone on screen
  // (the hero above is now an auto-sized banner), matching how sign-in's
  // form area fills the rest of the screen below its small banner.
  bottomSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bottomContent: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(28),
    paddingTop: vs(28),
    paddingBottom: vs(40),
  },
  handle: {
    width: s(40),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: COLORS.border,
    marginBottom: vs(20),
  },
  headline: {
    fontSize: ms(21),
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: vs(8),
    textAlign: 'center',
  },
  subcopy: {
    fontSize: ms(14),
    lineHeight: ms(21),
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: vs(24),
    maxWidth: s(380),
  },

  ctaButton: {
    width: '100%',
    borderRadius: s(16),
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: s(12),
    shadowOffset: { width: 0, height: vs(6) },
    elevation: 8,
  },
  ctaFill: {
    height: vs(56),
    borderRadius: s(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
  },
  ctaText: {
    fontSize: ms(16),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
