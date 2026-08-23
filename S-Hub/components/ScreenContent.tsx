import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { s } from '@/lib/scaling';

/**
 * Caps and centers screen content at the same width used by every screen
 * in the app (matches sign-in/sign-up sizing). Wrap the body of a screen's
 * scroll/content area in this so every page shares one true container size.
 */
export default function ScreenContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: s(544), alignSelf: 'center' },
});
