/**
 * A slide-in banner shown app-wide (rendered in App.tsx) whenever NetInfo
 * reports no connection.
 */
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';

/**
 * Persistent app-wide "you're offline" banner — rendered once at the root
 * (App.tsx) so every screen gets it for free, rather than instrumenting
 * every individual submit/send handler with its own connectivity check.
 * Write-path failures already surface their own error (see the app's
 * existing Alert.alert-on-failure convention); this banner is the proactive
 * signal that explains *why* those are about to fail, before the user taps
 * anything.
 *
 * isConnected (not isInternetReachable) is the trigger: it's immediate and
 * stable, whereas isInternetReachable can sit at null mid-probe and cause
 * the banner to flicker on every screen focus.
 */
export default function OfflineBanner() {
  const { isConnected } = useNetInfo();

  if (isConnected !== false) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea} pointerEvents="none">
      <View style={styles.banner}>
        <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
        <Text style={styles.text}>You&apos;re offline — some actions won&apos;t work</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.danger,
    paddingVertical: 6,
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
