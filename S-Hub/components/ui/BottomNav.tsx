import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { s } from '@/lib/scaling';
import type { CustomerTabKey, RootStackParamList, WorkerTabKey } from '@/navigation/types';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isCustomer = role === 'customer';
  const tabs = isCustomer ? CUSTOMER_TABS : WORKER_TABS;
  const customerByKey = Object.fromEntries(CUSTOMER_TABS.map((t) => [t.key, t.tabScreen])) as Record<TabKey, CustomerTabKey>;
  const workerByKey = Object.fromEntries(WORKER_TABS.map((t) => [t.key, t.tabScreen])) as Record<TabKey, WorkerTabKey>;

  return (
    <NavPill
      tabs={tabs}
      activeKey={active}
      maxWidth={isCustomer ? s(400) : s(320)}
      onPress={(key) => {
        if (key === active) return;
        const tabKey = key as TabKey;
        if (isCustomer) {
          navigation.navigate('CustomerTabs', { screen: customerByKey[tabKey] });
        } else {
          navigation.navigate('WorkerTabs', { screen: workerByKey[tabKey] });
        }
      }}
      centerFab={isCustomer ? { icon: 'add', onPress: () => navigation.navigate('PostAJob', {}) } : undefined}
    />
  );
}
