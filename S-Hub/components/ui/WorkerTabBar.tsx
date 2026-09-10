/** Renders the floating pill tab bar for WorkerTabs; drives the messages-tab unread dot from unread-store. */
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { s } from '@/lib/scaling';
import { useNavStore, type WorkerTabKey } from '@/lib/stores/nav-store';
import { useUnreadStore } from '@/lib/stores/unread-store';
import NavPill, { type PillTab } from './NavPill';

const TAB_META: Record<WorkerTabKey, Omit<PillTab, 'key'>> = {
  'worker-dashboard': { icon: 'home-outline', iconActive: 'home' },
  'worker-jobs': { icon: 'briefcase-outline', iconActive: 'briefcase' },
  'worker-messages': { icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  'worker-profile-settings': { icon: 'person-outline', iconActive: 'person' },
};

/** tabBar for app/(worker)/(tabs)/_layout.tsx — same NavPill visual as CustomerTabBar, no center FAB. */
export default function WorkerTabBar({ state, navigation }: BottomTabBarProps) {
  const setLastWorkerTab = useNavStore((store) => store.setLastWorkerTab);
  const hasUnreadMessages = useUnreadStore((store) => store.messageCount > 0);

  const tabs: PillTab[] = state.routes.map((route) => ({
    key: route.name,
    ...TAB_META[route.name as WorkerTabKey],
    badge: route.name === 'worker-messages' && hasUnreadMessages,
  }));
  const activeKey = state.routes[state.index].name;

  return (
    <NavPill
      tabs={tabs}
      activeKey={activeKey}
      maxWidth={s(320)}
      onPress={(key) => {
        if (key !== activeKey) {
          navigation.navigate(key);
          setLastWorkerTab(key as WorkerTabKey);
        }
      }}
    />
  );
}
