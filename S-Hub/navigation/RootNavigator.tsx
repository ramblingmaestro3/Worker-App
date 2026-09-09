import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import AppBackground from '@/components/AppBackground';
import { useThemeColors } from '@/contexts/ThemeContext';
import CustomerTabs from './CustomerTabs';
import WorkerTabs from './WorkerTabs';
import { authScreens } from './authScreens';
import { commonScreens } from './commonScreens';
import { customerScreens } from './customerScreens';
import { workerScreens } from './workerScreens';
import type { RootStackParamList } from './types';

// Every screen renders inside one centred column of this width — the same size
// the home screen caps its content at — so the app looks identical on phones
// (where it's a no-op) and on wide web/tablet windows (where it would otherwise
// stretch edge-to-edge). Screens that also cap their own content stay unaffected;
// this only reins in the ones that don't.
const APP_MAX_WIDTH = 540;

const Stack = createNativeStackNavigator<RootStackParamList>();

const flatScreens: { name: keyof RootStackParamList; component: ComponentType<any> }[] = [
  ...commonScreens,
  ...authScreens,
  ...workerScreens,
  ...customerScreens,
];

export default function RootNavigator() {
  const T = useThemeColors();

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      // Wrap every screen in its own opaque wallpaper layer. Screens paint a
      // transparent T.bg so this shows through their empty areas — but because
      // each screen carries its own opaque copy, a pushed screen fully covers
      // the one under it during and after the transition (no bleed-through).
      screenLayout={({ children }) => (
        <View style={[styles.screen, { backgroundColor: T.bgSolid }]}>
          <AppBackground />
          {children}
        </View>
      )}
      screenOptions={{
        contentStyle: { flex: 1, width: '100%', maxWidth: APP_MAX_WIDTH, alignSelf: 'center' },
      }}
    >
      {flatScreens.map(({ name, component }) => (
        <Stack.Screen key={name} name={name as any} component={component} />
      ))}
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="WorkerTabs" component={WorkerTabs} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
