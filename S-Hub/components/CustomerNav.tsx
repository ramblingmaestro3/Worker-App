import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { s } from '@/lib/scaling';

const TABS = [
  { key: 'home', icon: 'home-outline', iconFocused: 'home', route: '/home', center: false },
  { key: 'jobs', icon: 'briefcase-outline', iconFocused: 'briefcase', route: '/bookings', center: false },
  { key: 'center', icon: 'add', route: '/post-a-job', center: true },
  { key: 'messages', icon: 'chatbubble-outline', iconFocused: 'chatbubble', route: '/messages', center: false },
  { key: 'profile', icon: 'person-outline', iconFocused: 'person', route: '/profile', center: false },
] as const;

export default function CustomerNav({ active }: { active?: 'home' | 'jobs' | 'messages' | 'profile' }) {
  const T = useThemeColors();

  return (
    <View style={styles.floatWrap} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: T.navBg, borderColor: T.navBorder }]}>
        {TABS.map((tab) => {
          if (tab.center) {
            return (
              <TouchableOpacity
                key="center"
                style={[styles.centerBtn, { borderColor: T.bg }]}
                activeOpacity={0.85}
                onPress={() => router.push(tab.route as any)}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </TouchableOpacity>
            );
          }
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
                  name={(isActive ? tab.iconFocused : tab.icon) as any}
                  size={20}
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
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: s(400),
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
