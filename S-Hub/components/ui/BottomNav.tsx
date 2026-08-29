import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s } from '@/lib/scaling';

type TabKey = 'home' | 'jobs' | 'messages' | 'profile';

type Tab = {
  key: TabKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
  route: string;
};

const CUSTOMER_TABS: Tab[] = [
  { key: 'home', icon: 'home-outline', iconActive: 'home', route: '/home' },
  { key: 'jobs', icon: 'briefcase-outline', iconActive: 'briefcase', route: '/bookings' },
  { key: 'messages', icon: 'chatbubble-outline', iconActive: 'chatbubble', route: '/messages' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person', route: '/profile' },
];

const WORKER_TABS: Tab[] = [
  { key: 'home', icon: 'home-outline', iconActive: 'home', route: '/worker-dashboard' },
  { key: 'jobs', icon: 'briefcase-outline', iconActive: 'briefcase', route: '/worker-jobs' },
  { key: 'messages', icon: 'chatbubble-outline', iconActive: 'chatbubble', route: '/worker-messages' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person', route: '/worker-profile-settings' },
];

type Props = {
  role: 'customer' | 'worker';
  active?: TabKey;
};

function TabButton({
  tab,
  active,
  T,
}: {
  tab: Tab;
  active: TabKey | undefined;
  T: ReturnType<typeof useThemeColors>;
}) {
  const isActive = tab.key === active;
  return (
    <TouchableOpacity
      style={styles.tabBtn}
      activeOpacity={0.7}
      onPress={() => {
        if (!isActive) router.replace(tab.route as any);
      }}
    >
      <View style={[styles.iconChip, isActive && { backgroundColor: COLORS.primary }]}>
        <Ionicons
          name={isActive ? tab.iconActive : tab.icon}
          size={20}
          color={isActive ? '#fff' : T.subText}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function BottomNav({ role, active }: Props) {
  const T = useThemeColors();
  const isCustomer = role === 'customer';
  const tabs = isCustomer ? CUSTOMER_TABS : WORKER_TABS;

  return (
    <View style={styles.floatWrap} pointerEvents="box-none">
      <View
        style={[
          styles.pill,
          { backgroundColor: T.navBg, borderColor: T.navBorder, maxWidth: isCustomer ? s(400) : s(320) },
        ]}
      >
        {tabs.slice(0, isCustomer ? 2 : tabs.length).map((tab) => (
          <TabButton key={tab.key} tab={tab} active={active} T={T} />
        ))}

        {isCustomer && (
          <TouchableOpacity
            style={[styles.centerBtn, { borderColor: T.bg }]}
            activeOpacity={0.85}
            onPress={() => router.push('/post-a-job' as any)}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        )}

        {isCustomer && tabs.slice(2).map((tab) => (
          <TabButton key={tab.key} tab={tab} active={active} T={T} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%',
    borderRadius: 999, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center', width: 46, height: 46 },
  iconChip: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  centerBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: -20,
    borderWidth: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
