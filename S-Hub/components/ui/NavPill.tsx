import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';

export type PillTab = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
  /** Shows a small red dot on the icon — e.g. unread messages on the chat tab. */
  badge?: boolean;
};

type Props = {
  tabs: PillTab[];
  activeKey: string | undefined;
  onPress: (key: string) => void;
  maxWidth: number;
  /** Renders a raised center button splitting the tabs in two, e.g. customer's "post a job" FAB. */
  centerFab?: { icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void };
};

function TabButton({
  tab,
  active,
  onPress,
  T,
}: {
  tab: PillTab;
  active: boolean;
  onPress: () => void;
  T: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity style={styles.tabBtn} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconChip, active && { backgroundColor: COLORS.primary }]}>
        <Ionicons name={active ? tab.iconActive : tab.icon} size={20} color={active ? '#fff' : T.subText} />
        {tab.badge && <View style={[styles.badgeDot, { borderColor: T.navBg }]} />}
      </View>
    </TouchableOpacity>
  );
}

/** Shared floating-pill visual behind both the manual BottomNav (drill-down screens) and the Tabs-driven *TabBar components. */
export default function NavPill({ tabs, activeKey, onPress, maxWidth, centerFab }: Props) {
  const T = useThemeColors();
  const splitIndex = centerFab ? 2 : tabs.length;

  return (
    <View style={styles.floatWrap} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: T.navBg, borderColor: T.navBorder, maxWidth }]}>
        {tabs.slice(0, splitIndex).map((tab) => (
          <TabButton key={tab.key} tab={tab} active={tab.key === activeKey} onPress={() => onPress(tab.key)} T={T} />
        ))}

        {centerFab && (
          <TouchableOpacity
            style={[styles.centerBtn, { borderColor: T.navBg }]}
            activeOpacity={0.85}
            onPress={centerFab.onPress}
          >
            <Ionicons name={centerFab.icon} size={26} color="#fff" />
          </TouchableOpacity>
        )}

        {centerFab && tabs.slice(splitIndex).map((tab) => (
          <TabButton key={tab.key} tab={tab} active={tab.key === activeKey} onPress={() => onPress(tab.key)} T={T} />
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
  badgeDot: {
    position: 'absolute', top: 6, right: 6,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.danger, borderWidth: 1.5,
  },
  centerBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: -20,
    borderWidth: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
