import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';

export default function VerifiedScreen() {
  const T = useThemeColors();

  const handleGoToDashboard = () => {
    router.replace('/worker-dashboard' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.header}>
        <Text style={styles.logo}>AdwumaGo</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.badgeWrap, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="shield-checkmark" size={wms(56)} color={COLORS.primary} />
        </View>

        <Text style={[styles.title, { color: T.text }]}>You're Verified!</Text>
        <Text style={[styles.subtitle, { color: T.subText }]}>
          Congratulations! You've been approved to work on{' '}
          <Text style={{ fontWeight: '800', color: COLORS.primary }}>AdwumaGo</Text>. You can now
          start bidding on jobs.
        </Text>

        <View style={[styles.infoBox, { backgroundColor: T.card, borderColor: T.border }]}>
          <Ionicons name="information-circle-outline" size={wms(20)} color={COLORS.accentDark} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: T.text }]}>Welcome to Worker Mode</Text>
            <Text style={[styles.infoBody, { color: T.subText }]}>
              You can jump back into worker mode anytime from the &ldquo;Worker Profile&rdquo; option in
              your profile menu.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToDashboard} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Switch to Worker Mode</Text>
          <Ionicons name="arrow-forward" size={wms(18)} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.footerNote, { color: T.subText }]}>Ready to take your first job? Let's go!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: wvs(12) },
  logo: { fontSize: wms(22), fontWeight: '900', color: COLORS.primary },
  content: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center', alignItems: 'center', paddingHorizontal: ws(24), paddingTop: wvs(24) },
  badgeWrap: {
    width: ws(120),
    height: ws(120),
    borderRadius: ws(60),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: wvs(24),
  },
  title: { fontSize: wms(26), fontWeight: '800', textAlign: 'center', marginBottom: wvs(12) },
  subtitle: { fontSize: wms(14), textAlign: 'center', lineHeight: wms(21), marginBottom: wvs(28) },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    gap: ws(12),
    borderWidth: ws(1),
    borderRadius: ws(16),
    padding: ws(16),
    marginBottom: wvs(28),
  },
  infoTitle: { fontSize: wms(14), fontWeight: '700', marginBottom: wvs(4) },
  infoBody: { fontSize: wms(13), lineHeight: wms(19) },
  primaryButton: {
    width: '100%',
    height: wvs(56),
    borderRadius: ws(999),
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ws(8),
    marginBottom: wvs(16),
  },
  primaryButtonText: { fontSize: wms(16), fontWeight: '700', color: '#fff' },
  footerNote: { fontSize: wms(13) },
});