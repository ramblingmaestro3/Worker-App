import { router, type Href } from 'expo-router';
import { s } from '@/lib/scaling';
import NavPill, { type PillTab } from './NavPill';

type TabKey = 'home' | 'jobs' | 'messages' | 'profile';

type Tab = PillTab & { key: TabKey; route: Href };

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

/**
 * Manual, prop-driven floating pill nav for screens reached by pushing on
 * top of a tab (post-a-job.tsx, bid-comparison.tsx) — these aren't
 * themselves tab roots, so the real Tabs navigator's tabBar (see
 * CustomerTabBar/WorkerTabBar) never renders here; this keeps the pill
 * visible anyway by navigating with router.replace directly.
 */
export default function BottomNav({ role, active }: Props) {
  const isCustomer = role === 'customer';
  const tabs = isCustomer ? CUSTOMER_TABS : WORKER_TABS;
  const byKey = Object.fromEntries(tabs.map((t) => [t.key, t.route]));

  return (
    <NavPill
      tabs={tabs}
      activeKey={active}
      maxWidth={isCustomer ? s(400) : s(320)}
      onPress={(key) => {
        if (key !== active) router.replace(byKey[key]);
      }}
      centerFab={isCustomer ? { icon: 'add', onPress: () => router.push('/post-a-job') } : undefined}
    />
  );
}
