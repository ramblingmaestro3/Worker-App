import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import Button from './Button';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  const T = useThemeColors();

  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={48} color={COLORS.primary + '55'} />
      <Text style={[styles.title, { color: T.text }]}>{title}</Text>
      <Text style={[styles.body, { color: T.subText }]}>{body}</Text>
      {!!actionLabel && !!onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  action: { marginTop: 6 },
});
