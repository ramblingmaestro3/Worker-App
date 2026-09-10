/** Bottom-tab navigator for a verified worker: dashboard / jobs / messages / settings. Custom pill tab bar; each tab scene gets its own wallpaper layer. */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import WorkerTabBar from '@/components/ui/WorkerTabBar';
import WallpaperLayout from '@/components/WallpaperLayout';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useNavHydrated, useNavStore } from '@/lib/stores/nav-store';
import WorkerDashboard from '@/screens/worker/tabs/WorkerDashboard';
import WorkerJobs from '@/screens/worker/tabs/WorkerJobs';
import WorkerMessages from '@/screens/worker/tabs/WorkerMessages';
import WorkerProfileSettings from '@/screens/worker/tabs/WorkerProfileSettings';
import type { WorkerTabParamList } from './types';

const Tab = createBottomTabNavigator<WorkerTabParamList>();

export default function WorkerTabs() {
  const hydrated = useNavHydrated();
  const lastWorkerTab = useNavStore((s) => s.lastWorkerTab);
  const T = useThemeColors();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator size="large" color={T.text} />
      </View>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName={lastWorkerTab}
      tabBar={(props) => <WorkerTabBar {...props} />}
      screenLayout={({ children }) => <WallpaperLayout>{children}</WallpaperLayout>}
    >
      <Tab.Screen name="worker-dashboard" component={WorkerDashboard} />
      <Tab.Screen name="worker-jobs" component={WorkerJobs} />
      <Tab.Screen name="worker-messages" component={WorkerMessages} />
      <Tab.Screen name="worker-profile-settings" component={WorkerProfileSettings} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
