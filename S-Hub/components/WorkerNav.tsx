import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws } from '@/lib/scaling';

const TABS = [
  { key: 'home', icon: 'home-outline', iconActive: 'home', label: 'Home', route: '/worker-dashboard' },
  { key: 'jobs', icon: 'briefcase-outline', iconActive: 'briefcase', label: 'Jobs', route: '/worker-jobs' },
  { key: 'messages', icon: 'chatbubble-outline', iconActive: 'chatbubble', label: 'Messages', route: '/worker-messages' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person', label: 'Profile', route: '/worker-profile-settings' },
] as const;

export default function WorkerNav({ active }: { active: 'home' | 'jobs' | 'messages' | 'profile' }) {
  const T = useThemeColors();

  return (
    <View style={styles.floatWrap} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: T.navBg, borderColor: T.navBorder }]}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (!isActive) router.replace(tab.route as any);
              }}
            >
              <View style={[styles.iconChip, isActive && { backgroundColor: COLORS.primary }]}>
                <Ionicons
                  name={(isActive ? tab.iconActive : tab.icon) as any}
                  size={ws(20)}
                  color={isActive ? '#fff' : T.subText}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: ws(24), paddingBottom: ws(28),
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: ws(320),
    borderRadius: 999, borderWidth: 1,
    paddingHorizontal: ws(10), paddingVertical: ws(8),
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center', width: ws(46), height: ws(46) },
  iconChip: {
    width: ws(40), height: ws(40), borderRadius: ws(20),
    alignItems: 'center', justifyContent: 'center',
  },
});
