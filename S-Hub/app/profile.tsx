import { COLORS } from '@/constants/theme';
import { useUnreadMessages } from '@/contexts/unread-messages';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
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
import { api, clearAuthSession } from '../lib/api';
import { disconnectMessagingSocket } from '../lib/messaging';

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
function MenuItem({ icon, label, subtitle, onPress, right, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={mi.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={mi.iconWrap}>{icon}</View>
      <View style={mi.textGroup}>
        <Text style={[mi.label, danger && mi.labelDanger]}>{label}</Text>
        {subtitle ? <Text style={mi.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (
        onPress
          ? <Ionicons name="chevron-forward" size={18} color="#BBBBBB" />
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
    backgroundColor: '#fff',
    gap: 16,
  },
  iconWrap: { width: 24, alignItems: 'center' },
  textGroup: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  labelDanger: { color: COLORS.danger },
  subtitle: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '500' },
});

/* ─── Section wrapper ─── */
function Section({ children }: { children: React.ReactNode }) {
  return <View style={sec.wrap}>{children}</View>;
}

const sec = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 10,
  },
});

/* ─── Divider ─── */
function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F5F5F5', marginLeft: 60 }} />;
}

/* ─── Main Screen ─── */
export default function ProfileScreen() {
  const { unreadCount } = useUnreadMessages();
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ posted: 0, completed: 0 });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadProfile() {
        try {
          const res = await api.getMe();
          if (active && res?.user) {
            setUser(res.user);
          }
        } catch (err) {
          console.error('Failed to fetch user:', err);
        }
      }
      async function loadStats() {
        try {
          const res = await api.getMyBookings({ per_page: 100 });
          if (!active) return;
          const items = res.items || [];
          setStats({
            posted: items.length,
            completed: items.filter((b: any) => b.status === 'completed').length,
          });
        } catch (err) {
          if (active) setStats({ posted: 0, completed: 0 });
        }
      }
      loadProfile();
      loadStats();
      return () => {
        active = false;
      };
    }, [])
  );

  const getInitials = (name?: string) => {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'U';
  };

  const iconSize = 20;
  const iconColor = '#444444';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF5" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── HERO / NAME CARD ── */}
        <View style={styles.heroCard}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{getInitials(user?.full_name)}</Text>
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
            <Text style={styles.heroName}>{user?.full_name || 'Loading...'}</Text>
            {user?.email ? (
              <Text style={styles.heroEmail}>{user.email}</Text>
            ) : null}
          </View>
        </View>

        {/* ── STATS STRIP ── */}
        <View style={styles.statsStrip}>
          {[
            { value: String(stats.posted), label: 'Jobs Posted' },
            { value: String(stats.completed), label: 'Completed' },
          ].map((stat, i, arr) => (
            <TouchableOpacity
              key={i}
              style={[styles.statItem, i < arr.length - 1 && styles.statBorder]}
              onPress={() => router.push('/bookings' as any)}
              activeOpacity={0.65}
            >
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SECTION 1: Account ── */}
        <Section>
          <MenuItem
            icon={<Ionicons name="person-circle-outline" size={iconSize} color={iconColor} />}
            label="Profile"
            subtitle={user?.email || "Verify email address"}
            onPress={() => router.push('/profile-edit' as any)}
          />
          <Divider />
          <MenuItem
            icon={<Ionicons name="card-outline" size={iconSize} color={iconColor} />}
            label="Payment Methods"
            onPress={() => router.push('/payment' as any)}
          />
          <Divider />
          <MenuItem
            icon={<Ionicons name="help-circle-outline" size={iconSize} color={iconColor} />}
            label="Support"
            onPress={() => router.push('/support' as any)}
          />
          <Divider />
          <MenuItem
            icon={<MaterialCommunityIcons name="shield-check-outline" size={iconSize} color={iconColor} />}
            label="Safety"
            onPress={() => router.push('/safety' as any)}
          />
          <Divider />
          <MenuItem
            icon={<Ionicons name="location-outline" size={iconSize} color={iconColor} />}
            label="Saved Locations"
            onPress={() => router.push('/saved-locations' as any)}
          />
          <Divider />
          <MenuItem
            icon={<Ionicons name="settings-outline" size={iconSize} color={iconColor} />}
            label="Settings"
            onPress={() => router.push('/settings' as any)}
          />
          <Divider />
          <MenuItem
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
        <Section>
          <MenuItem
            icon={<MaterialCommunityIcons name="tag-outline" size={iconSize} color={iconColor} />}
            label="Promotions"
            subtitle="Promo codes, offers and savings"
            onPress={() => router.push('/promotions' as any)}
          />
          <Divider />
          <MenuItem
            icon={<MaterialCommunityIcons name="briefcase-plus-outline" size={iconSize} color={iconColor} />}
            label="Post a Job"
            subtitle="Find skilled workers near you"
            onPress={() => router.push('/post-job' as any)}
          />
          <Divider />
          <MenuItem
            icon={<MaterialCommunityIcons name="account-hard-hat-outline" size={iconSize} color={iconColor} />}
            label="Worker Profile"
            subtitle="Offer your services and earn"
            onPress={() => router.push('/worker-setup' as any)}
          />
        </Section>

        {/* ── SECTION 3: App info ── */}
        <Section>
          <MenuItem
            icon={<Ionicons name="star-outline" size={iconSize} color={iconColor} />}
            label="Rate the App"
            onPress={() =>
              Linking.openURL('https://play.google.com/store/apps').catch(() =>
                Alert.alert('Rate', 'Could not open the app store. Please search for "Vaker" manually.')
              )
            }
          />
          <Divider />
          <MenuItem
            icon={<Ionicons name="share-social-outline" size={iconSize} color={iconColor} />}
            label="Share with Friends"
            onPress={() =>
              Share.share({
                title: 'Vaker – Hire Skilled Workers in Ghana',
                message: 'Need a plumber, electrician or carpenter? Download Vaker and find trusted workers near you in minutes! 🇬🇭\nhttps://vaker.com.gh',
              })
            }
          />
          <Divider />
          <MenuItem
            icon={<Ionicons name="document-text-outline" size={iconSize} color={iconColor} />}
            label="Terms & Privacy Policy"
            onPress={() => router.push('/terms' as any)}
          />
        </Section>

        {/* ── SIGN OUT ── */}
        <Section>
          <MenuItem
            icon={<Ionicons name="log-out-outline" size={iconSize} color={COLORS.danger} />}
            label="Sign Out"
            danger
            onPress={() =>
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => { disconnectMessagingSocket(); clearAuthSession(); router.replace('/login'); } },
              ])
            }
          />
        </Section>

        {/* App version */}
        <Text style={styles.version}>Vaker v1.0.0 · Made in Ghana 🇬🇭</Text>

      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={styles.bottomNav}>
        {[
          { icon: 'home-outline', iconActive: 'home', label: 'Home', route: '/(tabs)/home', active: false },
          { icon: 'briefcase-outline', iconActive: 'briefcase', label: 'Jobs', route: '/bookings', active: false },
          { icon: 'add', iconActive: 'add', label: '', route: '/post-job', center: true },
          { icon: 'chatbubble-outline', iconActive: 'chatbubble', label: 'Messages', route: '/messages', active: false },
          { icon: 'person', iconActive: 'person', label: 'Profile', route: '/profile', active: true },
        ].map((tab) =>
          (tab as any).center ? (
            <TouchableOpacity
              key="center"
              style={styles.centerBtn}
              activeOpacity={0.85}
              onPress={() => router.push(tab.route as any)}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={tab.label}
              style={styles.navTab}
              activeOpacity={0.7}
              onPress={() => router.push(tab.route as any)}
            >
              <View>
                <Ionicons
                  name={tab.active ? (tab.iconActive as any) : (tab.icon as any)}
                  size={22}
                  color={tab.active ? COLORS.primary : COLORS.muted}
                />
                {tab.label === 'Messages' && unreadCount > 0 && <View style={styles.navDot} />}
              </View>
              <Text style={[styles.navLabel, tab.active && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' },
  scroll: { paddingBottom: 100 },

  /* Hero */
  heroCard: {
    backgroundColor: '#fff',
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
    borderColor: '#fff',
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
    lineHeight: 26,
  },
  heroEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 6,
  },

  /* Stats */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statBorder: {
    borderRightWidth: 1,
    borderColor: '#F0F0F0',
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
    color: '#BBBBBB',
    marginTop: 10,
    marginBottom: 4,
  },

  /* Bottom nav */
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ECECEC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 22,
    paddingTop: 10,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.muted,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  navDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
