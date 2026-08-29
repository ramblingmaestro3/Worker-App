import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = Omit<TouchableOpacityProps, 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

export default function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  fullWidth = true,
  onPress,
  ...rest
}: Props) {
  const T = useThemeColors();
  const isDisabled = disabled || loading;

  const fill =
    variant === 'primary' ? COLORS.primary
    : variant === 'danger' ? COLORS.danger
    : 'transparent';

  const border =
    variant === 'secondary' ? T.border
    : variant === 'ghost' ? 'transparent'
    : fill;

  const textColor =
    variant === 'primary' || variant === 'danger' ? '#fff'
    : variant === 'secondary' ? T.text
    : COLORS.primary;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: fill, borderColor: border, borderWidth: variant === 'ghost' ? 0 : 1.5 },
        variant === 'ghost' && styles.ghostPadding,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 20,
  },
  ghostPadding: { height: 44, paddingHorizontal: 4 },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '700' },
});
