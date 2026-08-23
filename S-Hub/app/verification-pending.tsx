import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { getMyVerification, finalizeVerification } from '@/lib/api/verification';

type StepStatus = 'done' | 'pending' | 'locked';

// How long the "reviewing" animation runs before finalizing — comfortably
// above the finalize_verification RPC's server-side minimum-elapsed-time
// check, so the RPC never rejects a normal on-schedule call.
const REVIEW_DURATION_MS = 5000;

function buildSteps(reviewing: boolean): { key: string; title: string; note: string; status: StepStatus }[] {
  return [
    { key: 'submission', title: 'Document Submission', note: 'Completed', status: 'done' },
    { key: 'background', title: 'Background Check', note: reviewing ? 'Currently in review…' : 'Complete', status: reviewing ? 'pending' : 'done' },
    { key: 'activation', title: 'Account Activation', note: reviewing ? 'Unlocked after approval' : 'Activating…', status: reviewing ? 'locked' : 'pending' },
  ];
}

export default function VerificationPendingScreen() {
  const T = useThemeColors();
  const [reviewing, setReviewing] = useState(true);
  const STEPS = buildSteps(reviewing);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const result = await getMyVerification();
      if (cancelled) return;

      if (result.success && result.data?.status === 'verified') {
        router.replace('/verified' as any);
        return;
      }

      timer = setTimeout(async () => {
        if (cancelled) return;
        setReviewing(false);
        await finalizeVerification();
        if (!cancelled) router.replace('/verified' as any);
      }, REVIEW_DURATION_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const iconFor = (status: StepStatus) => {
    if (status === 'done') return { name: 'checkmark' as const, bg: COLORS.primary };
    if (status === 'pending') return { name: 'sync' as const, bg: COLORS.accent };
    return { name: 'lock-closed' as const, bg: T.inputBg };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.header}>
        <Text style={styles.logo}>AdwumaGo</Text>
        <Ionicons name="notifications-outline" size={wms(22)} color={T.text} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: T.card, borderColor: T.border }]}>
          <Ionicons name="hourglass-outline" size={wms(56)} color={COLORS.accentDark} />
        </View>

        <Text style={[styles.title, { color: T.text }]}>Verification in Progress</Text>
        <Text style={[styles.subtitle, { color: T.subText }]}>
          Our team is reviewing your documents. This usually takes 24–48 hours. We'll notify
          you once you're ready to start working!
        </Text>

        <View style={styles.stepsList}>
          {STEPS.map((step) => {
            const icon = iconFor(step.status);
            return (
              <View
                key={step.key}
                style={[
                  styles.stepRow,
                  { backgroundColor: T.card, borderColor: T.border },
                  step.status === 'pending' && { borderColor: COLORS.accent, borderWidth: ws(2) },
                ]}
              >
                <View style={[styles.stepIconWrap, { backgroundColor: icon.bg }]}>
                  <Ionicons
                    name={icon.name}
                    size={wms(18)}
                    color={step.status === 'locked' ? T.subText : '#fff'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: T.text }]}>{step.title}</Text>
                  <Text style={[styles.stepNote, { color: T.subText }]}>{step.note}</Text>
                </View>
                {step.status === 'pending' && (
                  <View style={styles.pendingPill}>
                    <Text style={styles.pendingPillText}>PENDING</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/home' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="home-outline" size={wms(18)} color="#fff" />
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/support' as any)}>
          <Text style={[styles.supportText, { color: T.subText }]}>
            Need help? <Text style={styles.supportLink}>Contact Support</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: ws(544),
    alignSelf: 'center',
    paddingHorizontal: ws(20),
    paddingVertical: wvs(12),
  },
  logo: { fontSize: wms(22), fontWeight: '900', color: COLORS.primary },
  content: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center', alignItems: 'center', paddingHorizontal: ws(24), paddingTop: wvs(16) },
  iconWrap: {
    width: ws(96),
    height: ws(96),
    borderRadius: ws(24),
    borderWidth: ws(1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: wvs(20),
  },
  title: { fontSize: wms(24), fontWeight: '800', textAlign: 'center', marginBottom: wvs(10) },
  subtitle: { fontSize: wms(14), textAlign: 'center', lineHeight: wms(20), marginBottom: wvs(28) },
  stepsList: { width: '100%', gap: ws(12), marginBottom: wvs(28) },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ws(12),
    borderWidth: ws(1),
    borderRadius: ws(16),
    padding: ws(14),
  },
  stepIconWrap: { width: ws(32), height: ws(32), borderRadius: ws(16), alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: wms(15), fontWeight: '700' },
  stepNote: { fontSize: wms(12), marginTop: wvs(2) },
  pendingPill: { backgroundColor: COLORS.accentLight, paddingHorizontal: ws(10), paddingVertical: wvs(4), borderRadius: ws(999) },
  pendingPillText: { fontSize: wms(10), fontWeight: '700', color: COLORS.accentDark },
  primaryButton: {
    width: '100%',
    height: wvs(56),
    borderRadius: ws(16),
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ws(8),
    marginBottom: wvs(16),
  },
  primaryButtonText: { fontSize: wms(16), fontWeight: '700', color: '#fff' },
  supportText: { fontSize: wms(13) },
  supportLink: { color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' },
});