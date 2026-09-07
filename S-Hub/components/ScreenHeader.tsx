import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenContent from '@/components/ScreenContent';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/lib/scaling';

type Props = {
  title: string;
  /** Shown inline right after the title (e.g. an unread-count badge). */
  titleRight?: ReactNode;
  /** A second, smaller line under the title (e.g. a job's category). */
  subtitle?: string;
  /** Called when the back arrow is pressed. Omit to hide the back arrow. */
  onBack?: () => void;
  /** Right-aligned slot (e.g. a "Mark all read" action). */
  right?: ReactNode;
};

/**
 * The compact, embedded page-title row used across the app in place of the
 * native stack header — matches the Splash/auth screens' header treatment,
 * so every screen's heading is the same height and style instead of relying
 * on React Navigation's own (differently-styled, differently-sized) header.
 */
export default function ScreenHeader({ title, titleRight, subtitle, onBack, right }: Props) {
  const T = useThemeColors();
  return (
    <View style={[styles.wrap, { backgroundColor: T.header, borderBottomColor: T.border }]}>
      <ScreenContent style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={8} style={styles.backBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={ms(22)} color={T.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.titleGroup}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: T.text }]} numberOfLines={1}>{title}</Text>
            {titleRight}
          </View>
          {subtitle ? <Text style={[styles.subtitle, { color: T.subText }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={styles.rightSlot}>{right}</View>
      </ScreenContent>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(8), paddingVertical: vs(10) },
  backBtn: { width: s(38), height: s(38), alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flex: 1, paddingLeft: s(2) },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  title: { fontSize: ms(17), fontWeight: '700' },
  subtitle: { fontSize: ms(12), marginTop: vs(1) },
  rightSlot: { minWidth: s(38), alignItems: 'flex-end' },
});
