import { Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import WorkerTabBar from '@/components/ui/WorkerTabBar';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useNavHydrated, useNavStore } from '@/lib/stores/nav-store';

export default function WorkerTabsLayout() {
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
    <Tabs
      initialRouteName={lastWorkerTab}
      tabBar={(props) => <WorkerTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="worker-dashboard" />
      <Tabs.Screen name="worker-jobs" />
      <Tabs.Screen name="worker-messages" />
      <Tabs.Screen name="worker-profile-settings" />
    </Tabs>
  );
}
