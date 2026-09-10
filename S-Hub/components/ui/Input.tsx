/** Themed single-line text field with an optional leading icon and error text. */
import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
};

const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, icon, trailing, style, ...rest },
  ref
) {
  const T = useThemeColors();

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={[styles.label, { color: T.subText }]}>{label}</Text>}
      <View
        style={[
          styles.row,
          { backgroundColor: T.inputBg, borderColor: error ? COLORS.danger : 'transparent' },
        ]}
      >
        {icon}
        <TextInput
          ref={ref}
          style={[styles.input, { color: T.text }, style]}
          placeholderTextColor={T.subText}
          {...rest}
        />
        {trailing}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 14 },
  error: { fontSize: 12, color: COLORS.danger, marginTop: 6 },
});
