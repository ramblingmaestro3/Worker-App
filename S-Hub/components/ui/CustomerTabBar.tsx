import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { s } from '@/lib/scaling';
import { useNavStore, type CustomerTabKey } from '@/lib/stores/nav-store';
import NavPill, { type PillTab } from './NavPill';

const TAB_META: Record<CustomerTabKey, Omit<PillTab, 'key'>> = {
  home: { icon: 'home-outline', iconActive: 'home' },
  bookings: { icon: 'briefcase-outline', iconActive: 'briefcase' },
  messages: { icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  profile: { icon: 'person-outline', iconActive: 'person' },
};

/** tabBar for app/(customer)/(tabs)/_layout.tsx — reproduces the floating pill visual, driven by the real Tabs navigator state so each tab keeps its own stack. */
export default function CustomerTabBar({ state, navigation }: BottomTabBarProps) {
  const setLastCustomerTab = useNavStore((store) => store.setLastCustomerTab);

  const tabs: PillTab[] = state.routes.map((route) => ({
    key: route.name,
    ...TAB_META[route.name as CustomerTabKey],
  }));
  const activeKey = state.routes[state.index].name;

  return (
    <NavPill
      tabs={tabs}
      activeKey={activeKey}
      maxWidth={s(400)}
      onPress={(key) => {
        if (key !== activeKey) {
          navigation.navigate(key);
          setLastCustomerTab(key as CustomerTabKey);
        }
      }}
      centerFab={{ icon: 'add', onPress: () => router.push('/post-a-job') }}
    />
  );
}
