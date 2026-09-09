import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import EmptyState from '@/components/ui/EmptyState';
import { ws, wvs, wms } from '@/lib/scaling';
import { getMyProfile, Profile } from '@/lib/api/profiles';
import { getMyWorkerProfile, WorkerProfile } from '@/lib/api/workerProfiles';
import { countMyCompletedBookings } from '@/lib/api/bookings';
import SignOutButton from '@/components/SignOutButton';
import { setActiveSide } from '@/lib/activeSide';
import { resetToCustomerHome } from '@/navigation/navigationRef';
import type { RootStackParamList, WorkerTabParamList } from '@/navigation/types';

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

type Props = CompositeScreenProps<
  BottomTabScreenProps<WorkerTabParamList, 'worker-profile-settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function WorkerProfileSettingsScreen({ navigation }: Props) {
  const T = useThemeColors();
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setLoadError(false);
        const [profileResult, workerResult, completedResult] = await Promise.all([
          getMyProfile(),
          getMyWorkerProfile(),
          countMyCompletedBookings(),
        ]);
        if (cancelled) return;
        // A failed fetch here doesn't necessarily mean the session is
        // invalid — that's handled globally now (App.tsx's session-expiry
        // watcher, driven by real auth state, not a guess from one query
        // failing). Could just as easily be a dropped connection, so this
        // offers a retry instead of forcing the user back to sign-in.
        if (!profileResult.success) {
          setLoadError(true);
          setLoading(false);
          return;
        }
        setProfile(profileResult.data ?? null);
        setWorkerProfile(workerResult.data ?? null);
        setCompletedJobs(completedResult.data ?? 0);
        setLoading(false);
      })();
      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadKey])
  );

  if (loadError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top']}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load your profile"
          body="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => setReloadKey((k) => k + 1)}
          tone="error"
        />
      </SafeAreaView>
    );
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const primaryService = workerProfile?.skills?.[0] ?? 'Worker';

  return (
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
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitials}>{initialsOf(profile.full_name)}</Text>
            )}
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
            onPress={() => navigation.navigate('WorkerPersonalInfo')}
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
            onPress={() => navigation.navigate('WorkerPersonalInfo')}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="construct-outline" size={wms(17)} color={COLORS.primary} />}
            label="Skills & Services"
            subtitle="Manage your skill categories"
            onPress={() => navigation.navigate('WorkerSkills')}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="calendar-outline" size={wms(17)} color={COLORS.primary} />}
            label="Availability"
            subtitle="Working days & hours"
            onPress={() => navigation.navigate('WorkerAvailability')}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<Ionicons name="pricetag-outline" size={wms(17)} color={COLORS.primary} />}
            label="Pricing"
            subtitle="Hourly rate & job pricing"
            onPress={() => navigation.navigate('WorkerPricing')}
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
            onPress={() => navigation.navigate('Settings')}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <MenuItem
            T={T}
            icon={<MaterialCommunityIcons name="swap-horizontal" size={wms(17)} color={COLORS.primary} />}
            label="Switch to Client Mode"
            subtitle="Post jobs and hire workers instead"
            onPress={() => {
              void setActiveSide('client');
              resetToCustomerHome();
            }}
          />
          <View style={[styles.divider, { backgroundColor: T.divider }]} />
          <SignOutButton />
        </View>

        <Text style={[styles.version, { color: T.subText }]}>
          {profile.created_at ? `Member since ${memberSince(profile.created_at)}` : ''}
        </Text>
      </ScrollView>
      </View>

    </SafeAreaView>
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
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
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
