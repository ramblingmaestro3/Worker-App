import { useNavigation } from '@react-navigation/native';
import { s } from '@/lib/scaling';
import type { CustomerTabKey, WorkerTabKey } from '@/navigation/types';
import NavPill, { type PillTab } from './NavPill';

type TabKey = 'home' | 'jobs' | 'messages' | 'profile';

type Tab = PillTab & { key: TabKey };

const CUSTOMER_TABS: (Tab & { tabScreen: CustomerTabKey })[] = [
  { key: 'home', icon: 'home-outline', iconActive: 'home', tabScreen: 'home' },
  { key: 'jobs', icon: 'briefcase-outline', iconActive: 'briefcase', tabScreen: 'bookings' },
  { key: 'messages', icon: 'chatbubble-outline', iconActive: 'chatbubble', tabScreen: 'messages' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person', tabScreen: 'profile' },
];

const WORKER_TABS: (Tab & { tabScreen: WorkerTabKey })[] = [
  { key: 'home', icon: 'home-outline', iconActive: 'home', tabScreen: 'worker-dashboard' },
  { key: 'jobs', icon: 'briefcase-outline', iconActive: 'briefcase', tabScreen: 'worker-jobs' },
  { key: 'messages', icon: 'chatbubble-outline', iconActive: 'chatbubble', tabScreen: 'worker-messages' },
  { key: 'profile', icon: 'person-outline', iconActive: 'person', tabScreen: 'worker-profile-settings' },
];

type Props = {
  role: 'customer' | 'worker';
  active?: TabKey;
};

/**
 * Manual, prop-driven floating pill nav for screens reached by pushing on
 * top of a tab (post-a-job.tsx, bid-comparison.tsx) — these aren't
 * themselves tab roots, so the real Tabs navigator's tabBar (see
 * CustomerTabBar/WorkerTabBar) never renders here; this keeps the pill
 * visible anyway by navigating into the tab navigator directly.
 */
export default function BottomNav({ role, active }: Props) {
  const navigation = useNavigation();
  const isCustomer = role === 'customer';
  const tabs = isCustomer ? CUSTOMER_TABS : WORKER_TABS;
  const byKey = Object.fromEntries(tabs.map((t) => [t.key, t.tabScreen]));

  return (
    <NavPill
      tabs={tabs}
      activeKey={active}
      maxWidth={isCustomer ? s(400) : s(320)}
      onPress={(key) => {
        if (key === active) return;
        if (isCustomer) {
          navigation.navigate('CustomerTabs' as never, { screen: byKey[key] } as never);
        } else {
          navigation.navigate('WorkerTabs' as never, { screen: byKey[key] } as never);
        }
      }}
      centerFab={isCustomer ? { icon: 'add', onPress: () => navigation.navigate('PostAJob' as never) } : undefined}
    />
  );
}
