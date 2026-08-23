import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import CustomerNav from '@/components/CustomerNav';
import { getMyProfile, Profile } from '@/lib/api/profiles';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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

/* ─── Types ─── */
type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
};

/* ─── Reusable menu row ─── */
function MenuItem({ icon, label, subtitle, onPress, right, danger, cardBg, textColor, subColor }: MenuItemProps & { cardBg: string; textColor: string; subColor: string }) {
  return (
    <TouchableOpacity
      style={[mi.row, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={mi.iconWrap}>{icon}</View>
      <View style={mi.textGroup}>
        <Text style={[mi.label, { color: textColor }, danger && mi.labelDanger]}>{label}</Text>
        {subtitle ? <Text style={[mi.subtitle, { color: subColor }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (
        onPress
          ? <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          : null
      )}
    </TouchableOpacity>
  );
}

const mi = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 16,
  },
  iconWrap: { width: 24, alignItems: 'center' },
  textGroup: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500' },
  labelDanger: { color: COLORS.danger },
  subtitle: { fontSize: 12, marginTop: 2, fontWeight: '500', color: COLORS.primary },
});

/* ─── Section wrapper ─── */
function Section({ children, borderColor }: { children: React.ReactNode; borderColor: string }) {
  return <View style={[sec.wrap, { borderColor }]}>{children}</View>;
}

const sec = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
});

/* ─── Divider ─── */
function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, marginLeft: 60 }} />;
}

/* ─── Main Screen ─── */
export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const T = useThemeColors();

  const iconSize = 20;
  const iconColor = T.icon;

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
          {/* ── HERO / NAME CARD ── */}
          <View style={[styles.heroCard, { backgroundColor: T.card }]}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initialsOf(profile.full_name)}</Text>
              </View>
              <TouchableOpacity
                style={styles.cameraBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/profile-edit' as any)}
              >
                <Ionicons name="camera" size={15} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Name + rating */}
            <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: T.text }]}>{profile.full_name || 'Add your name'}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={15} color={COLORS.accent} />
                <Text style={[styles.ratingText, { color: T.text }]}> {profile.rating_avg.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => Alert.alert('Rating', `Based on your last ${profile.rating_count} jobs.`)}>
                  <Ionicons name="information-circle-outline" size={16} color={T.subText} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── STATS STRIP ── */}
          <View style={[styles.statsStrip, { backgroundColor: T.card, borderColor: T.border }]}>
            {[
              { value: '12', label: 'Jobs Posted' },
              { value: '8', label: 'Completed' },
              { value: '3', label: 'Saved' },
            ].map((stat, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.statItem, i < 2 && [styles.statBorder, { borderColor: T.border }]]}
                onPress={() => router.push('/bookings' as any)}
                activeOpacity={0.65}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: T.subText }]}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── SECTION 1: Account ── */}
          <Section borderColor={T.border}>
            <MenuItem cardBg={T.card} textColor={T.text} subColor={COLORS.primary}
              icon={<Ionicons name="person-circle-outline" size={iconSize} color={iconColor} />}
              label="Profile"
              subtitle={emailVerified ? undefined : 'Verify email address'}
              onPress={() => router.push('/profile-edit' as any)}
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={COLORS.primary}
              icon={<Ionicons name="help-circle-outline" size={iconSize} color={iconColor} />}
              label="Support"
              onPress={() => router.push('/support' as any)}
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={COLORS.primary}
              icon={<MaterialCommunityIcons name="shield-check-outline" size={iconSize} color={iconColor} />}
              label="Safety"
              onPress={() => router.push('/safety' as any)}
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={COLORS.primary}
              icon={<Ionicons name="location-outline" size={iconSize} color={iconColor} />}
              label="Saved Locations"
              onPress={() => router.push('/saved-locations' as any)}
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={COLORS.primary}
              icon={<Ionicons name="settings-outline" size={iconSize} color={iconColor} />}
              label="Settings"
              onPress={() => router.push('/settings' as any)}
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={COLORS.primary}
              icon={<Ionicons name="notifications-outline" size={iconSize} color={iconColor} />}
              label="Notifications"
              right={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
                  thumbColor="#fff"
                />
              }
            />
          </Section>

          {/* ── SECTION 2: Features ── */}
          <Section borderColor={T.border}>
            <MenuItem cardBg={T.card} textColor={T.text} subColor={T.subText}
              icon={<MaterialCommunityIcons name="tag-outline" size={iconSize} color={iconColor} />}
              label="Promotions"
              subtitle="Promo codes, offers and savings"
              onPress={() => router.push('/promotions' as any)}
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={T.subText}
              icon={<MaterialCommunityIcons name="briefcase-plus-outline" size={iconSize} color={iconColor} />}
              label="Post a Job"
              subtitle="Find skilled workers near you"
              onPress={() => router.push('/post-a-job' as any)}
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={T.subText}
              icon={<MaterialCommunityIcons name="account-hard-hat-outline" size={iconSize} color={iconColor} />}
              label="Worker Profile"
              subtitle="Offer your services and earn"
              onPress={() => router.push('/worker-gate' as any)}
            />
          </Section>

          {/* ── SECTION 3: App info ── */}
          <Section borderColor={T.border}>
            <MenuItem cardBg={T.card} textColor={T.text} subColor={T.subText}
              icon={<Ionicons name="star-outline" size={iconSize} color={iconColor} />}
              label="Rate the App"
              onPress={() =>
                Linking.openURL('https://play.google.com/store/apps').catch(() =>
                  Alert.alert('Rate', 'Could not open the app store. Please search for "AdwumaGo" manually.')
                )
              }
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={T.subText}
              icon={<Ionicons name="share-social-outline" size={iconSize} color={iconColor} />}
              label="Share with Friends"
              onPress={() =>
                Share.share({
                  title: 'AdwumaGo – Hire Skilled Workers in Ghana',
                  message: 'Need a plumber, electrician or carpenter? Download AdwumaGo and find trusted workers near you in minutes! 🇬🇭\nhttps://adwumago.com.gh',
                })
              }
            />
            <Divider color={T.divider} />
            <MenuItem cardBg={T.card} textColor={T.text} subColor={T.subText}
              icon={<Ionicons name="document-text-outline" size={iconSize} color={iconColor} />}
              label="Terms & Privacy Policy"
              onPress={() => router.push('/terms' as any)}
            />
          </Section>

          {/* ── SIGN OUT ── */}
          <Section borderColor={T.border}>
            <MenuItem cardBg={T.card} textColor={T.text} subColor={T.subText}
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
          </Section>

          {/* App version */}
          <Text style={styles.version}>AdwumaGo v1.0.0 · Made in Ghana 🇬🇭</Text>
        </ScreenContent>
      </ScrollView>

      <CustomerNav active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },

  /* Hero */
  heroCard: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '40',
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 5,
    lineHeight: 26,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  /* Stats */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginBottom: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statBorder: {
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },

  /* Version */
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 10,
    marginBottom: 4,
  },

});
