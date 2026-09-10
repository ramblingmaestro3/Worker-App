/** Renders the floating pill tab bar for CustomerTabs; drives the messages-tab unread dot from unread-store. */
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { s } from '@/lib/scaling';
import { useNavStore, type CustomerTabKey } from '@/lib/stores/nav-store';
import { useUnreadStore } from '@/lib/stores/unread-store';
import NavPill, { type PillTab } from './NavPill';

const TAB_META: Record<CustomerTabKey, Omit<PillTab, 'key'>> = {
  home: { icon: 'home-outline', iconActive: 'home' },
  bookings: { icon: 'briefcase-outline', iconActive: 'briefcase' },
  messages: { icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  profile: { icon: 'person-outline', iconActive: 'person' },
};

/** tabBar for navigation/CustomerTabs.tsx — reproduces the floating pill visual, driven by the real Tabs navigator state so each tab keeps its own stack. */
export default function CustomerTabBar({ state, navigation }: BottomTabBarProps) {
  const setLastCustomerTab = useNavStore((store) => store.setLastCustomerTab);
  const hasUnreadMessages = useUnreadStore((store) => store.messageCount > 0);

  const tabs: PillTab[] = state.routes.map((route) => ({
    key: route.name,
    ...TAB_META[route.name as CustomerTabKey],
    badge: route.name === 'messages' && hasUnreadMessages,
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
      centerFab={{ icon: 'add', onPress: () => navigation.navigate('PostAJob' as never) }}
    />
  );
}
