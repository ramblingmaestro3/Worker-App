import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BENEFITS = [
  {
    icon: 'cash-outline' as const,
    title: 'Earn on Your Terms',
    subtitle: 'Set your own rates and accept jobs that suit you.',
    color: '#22C55E',
  },
  {
    icon: 'time-outline' as const,
    title: 'Flexible Schedule',
    subtitle: 'Work when you want — mornings, evenings, or weekends.',
    color: '#3B82F6',
  },
  {
    icon: 'star-outline' as const,
    title: 'Build Your Reputation',
    subtitle: 'Grow your ratings and attract more clients over time.',
    color: '#F59E0B',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Verified & Protected',
    subtitle: 'Secure payments and verified client profiles.',
    color: '#8B5CF6',
  },
];

export default function WorkerGateScreen() {
  const T = useThemeColors();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: T.inputBg }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color={T.text} />
      </TouchableOpacity>

      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={[styles.iconCircleOuter, { backgroundColor: COLORS.primaryLight }]}>
          <View style={[styles.iconCircleInner, { backgroundColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="account-hard-hat" size={40} color="#fff" />
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: T.text }]}>Ready to Start Earning?</Text>
        <Text style={[styles.heroSubtitle, { color: T.subText }]}>
          Join thousands of skilled workers on S-Hub and get hired by clients near you.
        </Text>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsSection}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={[styles.benefitRow, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={[styles.benefitIconWrap, { backgroundColor: benefit.color + '15' }]}>
              <Ionicons name={benefit.icon} size={20} color={benefit.color} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: T.text }]}>{benefit.title}</Text>
              <Text style={[styles.benefitSub, { color: T.subText }]}>{benefit.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctaSection}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/worker-dashboard' as any)}
        >
          <MaterialCommunityIcons name="briefcase-check" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Start Earning</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: T.border }]}
          activeOpacity={0.75}
          onPress={() => router.back()}
        >
          <Text style={[styles.secondaryBtnText, { color: T.subText }]}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 16, marginTop: 8,
  },

  /* Hero */
  heroSection: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 544,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 20,
  },
  iconCircleOuter: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircleInner: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },

  /* Benefits */
  benefitsSection: {
    width: '100%',
    maxWidth: 544,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 10,
    flex: 1,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  benefitIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  benefitSub: { fontSize: 12, lineHeight: 17 },

  /* CTAs */
  ctaSection: {
    width: '100%',
    maxWidth: 544,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
