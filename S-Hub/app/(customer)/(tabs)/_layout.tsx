import { Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import CustomerTabBar from '@/components/ui/CustomerTabBar';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useNavHydrated, useNavStore } from '@/lib/stores/nav-store';

export default function CustomerTabsLayout() {
  const hydrated = useNavHydrated();
  const lastCustomerTab = useNavStore((s) => s.lastCustomerTab);
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
      initialRouteName={lastCustomerTab}
      tabBar={(props) => <CustomerTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
