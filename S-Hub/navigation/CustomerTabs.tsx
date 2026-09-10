/** Bottom-tab navigator for a signed-in client: home / bookings / messages / profile. Custom pill tab bar; each tab scene gets its own wallpaper layer. */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import CustomerTabBar from '@/components/ui/CustomerTabBar';
import WallpaperLayout from '@/components/WallpaperLayout';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useNavHydrated, useNavStore } from '@/lib/stores/nav-store';
import Home from '@/screens/customer/tabs/Home';
import Bookings from '@/screens/customer/tabs/Bookings';
import Messages from '@/screens/customer/tabs/Messages';
import Profile from '@/screens/customer/tabs/Profile';
import type { CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export default function CustomerTabs() {
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
    <Tab.Navigator
      initialRouteName={lastCustomerTab}
      tabBar={(props) => <CustomerTabBar {...props} />}
      // Each tab scene carries its own opaque wallpaper so an inactive tab
      // can't bleed through the active one (they're transparent otherwise).
      screenLayout={({ children }) => <WallpaperLayout>{children}</WallpaperLayout>}
    >
      <Tab.Screen name="home" component={Home} />
      <Tab.Screen name="bookings" component={Bookings} />
      <Tab.Screen name="messages" component={Messages} />
      <Tab.Screen name="profile" component={Profile} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
