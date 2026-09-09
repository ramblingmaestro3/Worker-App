import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import AppBackground from '@/components/AppBackground';
import { useThemeColors } from '@/contexts/ThemeContext';

/**
 * Wraps a navigator screen in its own opaque wallpaper layer. Screens paint a
 * transparent `T.bg` so the tool pattern shows through their empty areas — but
 * because every screen carries its own opaque copy of it, a screen fully
 * covers whatever's behind it (a pushed screen, an inactive tab) instead of
 * letting it bleed through. Used via `screenLayout` on every navigator.
 */
export default function WallpaperLayout({ children }: { children: ReactNode }) {
  const T = useThemeColors();
  return (
    <View style={[styles.fill, { backgroundColor: T.bgSolid }]}>
      <AppBackground />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
