import { StyleSheet, View, ViewProps } from 'react-native';
import { RADIUS, SHADOWS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';

type Props = ViewProps & {
  elevated?: boolean;
};

export default function Card({ elevated = false, style, children, ...rest }: Props) {
  const T = useThemeColors();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: T.card, borderColor: T.border },
        elevated && SHADOWS.sm,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
  },
});
