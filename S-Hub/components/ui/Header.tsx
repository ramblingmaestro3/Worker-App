import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';

type Props = {
  title: string;
  variant?: 'flat' | 'solid';
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function Header({ title, variant = 'flat', onBack, right }: Props) {
  const T = useThemeColors();
  const solid = variant === 'solid';
  const iconColor = solid ? '#fff' : T.text;

  return (
    <View
      style={[
        styles.row,
        solid
          ? { backgroundColor: COLORS.primary }
          : { backgroundColor: T.bg, borderBottomColor: T.border, borderBottomWidth: 1 },
      ]}
    >
      <TouchableOpacity
        style={styles.side}
        onPress={onBack ?? (() => router.back())}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={22} color={iconColor} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: solid ? '#fff' : T.text }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 12,
  },
  side: { width: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
