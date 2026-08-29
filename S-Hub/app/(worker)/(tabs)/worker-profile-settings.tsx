import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import BottomNav from '@/components/ui/BottomNav';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';
import { getMyProfile, Profile } from '@/lib/api/profiles';
import { getMyWorkerProfile, WorkerProfile } from '@/lib/api/workerProfiles';
import { countMyCompletedBookings } from '@/lib/api/bookings';
import { signOut } from '@/lib/auth';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function memberSince(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* ─── Reusable menu row ─── */
function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  right,
  danger,
  T,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  T: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      style={menuStyles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[menuStyles.iconWrap, { backgroundColor: danger ? COLORS.dangerLight : T.inputBg }]}>{icon}</View>
      <View style={menuStyles.textGroup}>
        <Text style={[menuStyles.label, { color: danger ? COLORS.danger : T.text }]}>{label}</Text>
        {subtitle ? <Text style={[menuStyles.subtitle, { color: T.subText }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={wms(15)} color={T.subText} /> : null)}
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: ws(16), paddingVertical: wvs(13), gap: ws(13),
  },
  iconWrap: {
    width: ws(34), height: ws(34), borderRadius: ws(10),
    alignItems: 'center', justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  label: { fontSize: wms(13.5), fontWeight: '600' },
  subtitle: { fontSize: wms(10.5), marginTop: wvs(1) },
});

export default function WorkerProfileSettingsScreen() {
  const T = useThemeColors();
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [profileResult, workerResult, completedResult] = await Promise.all([
          getMyProfile(),
          getMyWorkerProfile(),
          countMyCompletedBookings(),
        ]);
        if (cancelled) return;
        if (!profileResult.success) {
          router.replace('/sign-in' as any);
          return;
        }
        setProfile(profileResult.data ?? null);
        setWorkerProfile(workerResult.data ?? null);
        setCompletedJobs(completedResult.data ?? 0);
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [])
  );

  if (loading || !profile) {
    return (
      <RequireVerifiedWorker>
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </SafeAreaView>
      </RequireVerifiedWorker>
    );
  }

  const primaryService = workerProfile?.skills?.[0] ?? 'Worker';

  return (
    <RequireVerifiedWorker>
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.pageInner}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Hero ── */}
        <View style={styles.heroRow}>
          <View style={[styles.avatar, { backgroundColor: COLORS.primary + '18' }]}>
            <Text style={styles.avatarInitials}>{initialsOf(profile.full_name)}</Text>
          </View>
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.heroName, { color: T.text }]}>{profile.full_name || 'Add your name'}</Text>
              {workerProfile?.verification_status === 'verified' && (
                <Ionicons name="checkmark-circle" size={wms(15)} color={COLORS.primary} />
              )}
            </View>
            <Text style={[styles.heroService, { color: T.subText }]}>{primaryService}</Text>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: T.inputBg }]}
            onPress={() => router.push('/worker-personal-info' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={wms(15)} color={T.text} />
          </TouchableOpacity>
        </View>

        {/* ── Stats Strip ── */}
        <View style={[styles.statsStrip, { backgroundColor: T.card, borderColor: T.border }]}>
          {[
            { value: String(completedJobs), label: 'Jobs' },
            { value: (workerProfile?.rating_avg ?? 0).toFixed(1), label: 'Rating' },
            { value: String(workerProfile?.rating_count ?? 0), label: 'Reviews' },
            { value: workerProfile?.years_experience ? `${workerProfile.years_experience} yrs` : '—', label: 'Experience' },
          ].map((stat, i, arr) => (
            <View key={stat.label} style={[styles.stat, i < arr.length - 1 && [styles.statBorder, { borderColor: T.border }]]}>
              <Text style={[styles.statValue, { color: T.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: T.subText }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Manage ── */}
        <Text style={[styles.sectionLabel, { color: T.subText }]}>Manage</Text>
        <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
          <MenuItem
            T={T}
            icon={<Ionicons name="person-outline" size={wms(17)} color={COLORS.primary} />}
            label="Personal Info"
            subtitle="Name, phone, location"
            onPress={() => router.push('/worker-personal-info' as any)}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="construct-outline" size={wms(17)} color={COLORS.primary} />}
            label="Skills & Services"
            subtitle="Manage your skill categories"
            onPress={() => router.push('/worker-skills' as any)}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="calendar-outline" size={wms(17)} color={COLORS.primary} />}
            label="Availability"
            subtitle="Working days & hours"
            onPress={() => router.push('/worker-availability' as any)}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="pricetag-outline" size={wms(17)} color={COLORS.primary} />}
            label="Pricing"
            subtitle="Hourly rate & job pricing"
            onPress={() => router.push('/worker-pricing' as any)}
          />
        </View>

        {/* ── General ── */}
        <Text style={[styles.sectionLabel, { color: T.subText }]}>General</Text>
        <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
          <MenuItem
            T={T}
            icon={<Ionicons name="notifications-outline" size={wms(17)} color={COLORS.primary} />}
            label="Notifications"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: T.border, true: COLORS.primaryLight }}
                thumbColor={notifications ? COLORS.primary : '#ccc'}
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="settings-outline" size={wms(17)} color={COLORS.primary} />}
            label="Settings"
            onPress={() => router.push('/settings' as any)}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<MaterialCommunityIcons name="swap-horizontal" size={wms(17)} color={COLORS.primary} />}
            label="Switch to Client Mode"
            subtitle="Post jobs and hire workers instead"
            onPress={() => router.replace('/home' as any)}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="log-out-outline" size={wms(17)} color={COLORS.danger} />}
            label="Sign Out"
            danger
            onPress={() =>
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out', style: 'destructive', onPress: async () => {
                    await signOut();
                    router.replace('/sign-in' as any);
                  },
                },
              ])
            }
          />
        </View>

        <Text style={[styles.version, { color: T.subText }]}>
          {profile.created_at ? `Member since ${memberSince(profile.created_at)}` : ''}
        </Text>
      </ScrollView>
      </View>

      <BottomNav role="worker" active="profile" />
    </SafeAreaView>
    </RequireVerifiedWorker>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },
  scroll: { padding: ws(20), paddingBottom: wvs(100) },

  /* Hero */
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: ws(12), marginBottom: wvs(16) },
  avatar: {
    width: ws(54), height: ws(54), borderRadius: ws(27),
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: wms(18), fontWeight: '800', color: COLORS.primary },
  heroInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: ws(6), marginBottom: wvs(2) },
  heroName: { fontSize: wms(17), fontWeight: '800' },
  heroService: { fontSize: wms(12.5) },
  editBtn: {
    width: ws(36), height: ws(36), borderRadius: ws(18),
    alignItems: 'center', justifyContent: 'center',
  },

  /* Stats */
  statsStrip: {
    flexDirection: 'row', borderWidth: 1, borderRadius: ws(16),
    marginBottom: wvs(20),
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: wvs(13) },
  statBorder: { borderRightWidth: 1 },
  statValue: { fontSize: wms(15), fontWeight: '800', marginBottom: wvs(2) },
  statLabel: { fontSize: wms(10), fontWeight: '500' },

  /* Sections */
  sectionLabel: {
    fontSize: wms(12), fontWeight: '700',
    marginBottom: wvs(8),
  },
  section: {
    borderRadius: ws(16), borderWidth: 1, overflow: 'hidden',
    marginBottom: wvs(20),
  },
  divider: { height: 1, marginLeft: ws(63) },

  /* Version */
  version: {
    textAlign: 'center', fontSize: wms(11.5),
  },
});

