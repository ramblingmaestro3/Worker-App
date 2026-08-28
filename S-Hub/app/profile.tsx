import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import CustomerNav from '@/components/CustomerNav';
import { getMyProfile, Profile } from '@/lib/api/profiles';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { s, vs, ms } from '@/lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function memberSince(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/* ─── Reusable menu row — mirrors worker-profile-settings.tsx's MenuItem ─── */
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
      style={mi.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[mi.iconWrap, { backgroundColor: danger ? COLORS.dangerLight : T.inputBg }]}>{icon}</View>
      <View style={mi.textGroup}>
        <Text style={[mi.label, { color: danger ? COLORS.danger : T.text }]}>{label}</Text>
        {subtitle ? <Text style={[mi.subtitle, { color: T.subText }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={ms(15)} color={T.subText} /> : null)}
    </TouchableOpacity>
  );
}

const mi = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: s(16), paddingVertical: vs(13), gap: s(13),
  },
  iconWrap: {
    width: s(34), height: s(34), borderRadius: s(10),
    alignItems: 'center', justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  label: { fontSize: ms(13.5), fontWeight: '600' },
  subtitle: { fontSize: ms(10.5), marginTop: vs(1) },
});

/* ─── Main Screen ─── */
export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const T = useThemeColors();

  const iconSize = ms(17);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [profileResult, authResult] = await Promise.all([
          getMyProfile(),
          supabase.auth.getUser(),
        ]);
        if (cancelled) return;
        if (!profileResult.success) {
          router.replace('/sign-in' as any);
          return;
        }
        setProfile(profileResult.data ?? null);
        setEmailVerified(!!authResult.data.user?.email_confirmed_at);
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [])
  );

  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Content capped and centered the same way as sign-up.tsx / sign-in.tsx */}
        <ScreenContent>
          {/* ── HERO — mirrors worker-profile-settings.tsx's heroRow ── */}
          <View style={styles.heroRow}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primary + '18' }]}>
              <Text style={styles.avatarInitials}>{initialsOf(profile.full_name)}</Text>
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.heroName, { color: T.text }]}>{profile.full_name || 'Add your name'}</Text>
                {emailVerified && (
                  <Ionicons name="checkmark-circle" size={ms(15)} color={COLORS.primary} />
                )}
              </View>
              <Text style={[styles.heroSub, { color: T.subText }]}>
                {profile.created_at ? `Member since ${memberSince(profile.created_at)}` : 'Welcome to AdwumaGo'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: T.inputBg }]}
              onPress={() => router.push('/profile-edit' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={ms(15)} color={T.text} />
            </TouchableOpacity>
          </View>

          {/* ── STATS — mirrors worker-profile-settings.tsx's bordered statsStrip ── */}
          <View style={[styles.statsStrip, { backgroundColor: T.card, borderColor: T.border }]}>
            {[
              { value: profile.rating_avg.toFixed(1), label: 'Rating' },
              { value: '12', label: 'Jobs Posted' },
              { value: '8', label: 'Completed' },
              { value: '3', label: 'Saved' },
            ].map((stat, i, arr) => (
              <TouchableOpacity
                key={stat.label}
                style={[styles.stat, i < arr.length - 1 && [styles.statBorder, { borderColor: T.border }]]}
                onPress={() => router.push('/bookings' as any)}
                activeOpacity={0.65}
              >
                <Text style={[styles.statValue, { color: T.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: T.subText }]}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Account ── */}
          <Text style={[styles.sectionLabel, { color: T.subText }]}>Account</Text>
          <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
            <MenuItem T={T}
              icon={<Ionicons name="person-circle-outline" size={iconSize} color={COLORS.primary} />}
              label="Profile"
              subtitle={emailVerified ? 'Name, phone, email' : 'Verify email address'}
              onPress={() => router.push('/profile-edit' as any)}
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<Ionicons name="location-outline" size={iconSize} color={COLORS.primary} />}
              label="Saved Locations"
              onPress={() => router.push('/saved-locations' as any)}
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<MaterialCommunityIcons name="shield-check-outline" size={iconSize} color={COLORS.primary} />}
              label="Safety"
              onPress={() => router.push('/safety' as any)}
            />
          </View>

          {/* ── Features ── */}
          <Text style={[styles.sectionLabel, { color: T.subText }]}>Features</Text>
          <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
            <MenuItem T={T}
              icon={<MaterialCommunityIcons name="briefcase-plus-outline" size={iconSize} color={COLORS.primary} />}
              label="Post a Job"
              subtitle="Find skilled workers near you"
              onPress={() => router.push('/post-a-job' as any)}
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<MaterialCommunityIcons name="tag-outline" size={iconSize} color={COLORS.primary} />}
              label="Promotions"
              subtitle="Promo codes, offers and savings"
              onPress={() => router.push('/promotions' as any)}
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<MaterialCommunityIcons name="account-hard-hat-outline" size={iconSize} color={COLORS.primary} />}
              label="Worker Profile"
              subtitle="Offer your services and earn"
              onPress={() => router.push('/worker-gate' as any)}
            />
          </View>

          {/* ── General ── */}
          <Text style={[styles.sectionLabel, { color: T.subText }]}>General</Text>
          <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
            <MenuItem T={T}
              icon={<Ionicons name="notifications-outline" size={iconSize} color={COLORS.primary} />}
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
            <MenuItem T={T}
              icon={<Ionicons name="settings-outline" size={iconSize} color={COLORS.primary} />}
              label="Settings"
              onPress={() => router.push('/settings' as any)}
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<Ionicons name="help-circle-outline" size={iconSize} color={COLORS.primary} />}
              label="Support"
              onPress={() => router.push('/support' as any)}
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<Ionicons name="star-outline" size={iconSize} color={COLORS.primary} />}
              label="Rate the App"
              onPress={() =>
                Linking.openURL('https://play.google.com/store/apps').catch(() =>
                  Alert.alert('Rate', 'Could not open the app store. Please search for "AdwumaGo" manually.')
                )
              }
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<Ionicons name="share-social-outline" size={iconSize} color={COLORS.primary} />}
              label="Share with Friends"
              onPress={() =>
                Share.share({
                  title: 'AdwumaGo – Hire Skilled Workers in Ghana',
                  message: 'Need a plumber, electrician or carpenter? Download AdwumaGo and find trusted workers near you in minutes! 🇬🇭\nhttps://adwumago.com.gh',
                })
              }
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<Ionicons name="document-text-outline" size={iconSize} color={COLORS.primary} />}
              label="Terms & Privacy Policy"
              onPress={() => router.push('/terms' as any)}
            />
            <View style={[styles.divider, { backgroundColor: T.divider }]} />
            <MenuItem T={T}
              icon={<Ionicons name="log-out-outline" size={iconSize} color={COLORS.danger} />}
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

          {/* App version */}
          <Text style={[styles.version, { color: T.subText }]}>AdwumaGo v1.0.0 · Made in Ghana 🇬🇭</Text>
        </ScreenContent>
      </ScrollView>

      <CustomerNav active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: s(20), paddingBottom: vs(100) },

  /* Hero — mirrors worker-profile-settings.tsx's heroRow */
  heroRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(12), marginBottom: vs(16),
  },
  avatar: {
    width: s(54), height: s(54), borderRadius: s(27),
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: ms(18), fontWeight: '800', color: COLORS.primary },
  heroInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: s(6), marginBottom: vs(2) },
  heroName: { fontSize: ms(17), fontWeight: '800' },
  heroSub: { fontSize: ms(12.5) },
  editBtn: {
    width: s(36), height: s(36), borderRadius: s(18),
    alignItems: 'center', justifyContent: 'center',
  },

  /* Stats — mirrors worker-profile-settings.tsx's bordered statsStrip */
  statsStrip: {
    flexDirection: 'row', borderWidth: 1, borderRadius: s(16),
    marginBottom: vs(20),
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: vs(13) },
  statBorder: { borderRightWidth: 1 },
  statValue: { fontSize: ms(15), fontWeight: '800', marginBottom: vs(2) },
  statLabel: { fontSize: ms(10), fontWeight: '500' },

  /* Sections */
  sectionLabel: {
    fontSize: ms(12), fontWeight: '700',
    marginBottom: vs(8),
  },
  section: {
    borderRadius: s(16), borderWidth: 1, overflow: 'hidden',
    marginBottom: vs(20),
  },
  divider: { height: 1, marginLeft: s(63) },

  /* Version */
  version: {
    textAlign: 'center',
    fontSize: ms(11.5),
    marginTop: vs(4),
  },
});

