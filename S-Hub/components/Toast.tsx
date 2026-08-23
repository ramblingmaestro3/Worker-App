import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';

export type ToastVariant = 'success' | 'info' | 'warning';

export type ToastState = {
  message: string;
  variant: ToastVariant;
  key: number;
} | null;

const VARIANT_ICON: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  info: 'information-circle',
  warning: 'alert-circle',
};

const VARIANT_COLOR: Record<ToastVariant, string> = {
  success: COLORS.accent,
  info: COLORS.verified,
  warning: COLORS.danger,
};

/**
 * Self-contained bottom banner — pass the latest ToastState in (or null to
 * hide) and it animates in/out and auto-dismisses. No provider/context;
 * each screen that wants toasts owns its own `useState<ToastState>` and
 * bumps `key` on each new message so re-triggering the same text still animates.
 */
export default function Toast({ toast, bottomOffset = wvs(100) }: { toast: ToastState; bottomOffset?: number }) {
  const T = useThemeColors();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast?.key]);

  if (!toast) return null;

  const color = VARIANT_COLOR[toast.variant];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { bottom: bottomOffset, backgroundColor: T.card, borderColor: color, transform: [{ translateY }], opacity },
      ]}
    >
      <Ionicons name={VARIANT_ICON[toast.variant]} size={wms(20)} color={color} />
      <Text style={[styles.text, { color: T.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: ws(16),
    right: ws(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: ws(10),
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingHorizontal: ws(14),
    paddingVertical: wvs(12),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  text: { flex: 1, fontSize: wms(13), fontWeight: '600' },
});
