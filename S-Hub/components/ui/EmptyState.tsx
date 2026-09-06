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
  /** 'error' tints the icon and action button danger-red so a failed fetch reads as distinct from a genuinely empty list, not the same visual. Defaults to 'default'. */
  tone?: 'default' | 'error';
};

/** Shared empty/error placeholder for any data-fetching screen — pass tone="error" with a retry actionLabel/onAction for a failed fetch, omit it for a genuine "nothing here yet" state. */
export default function EmptyState({ icon, title, body, actionLabel, onAction, tone = 'default' }: Props) {
  const T = useThemeColors();
  const iconColor = tone === 'error' ? COLORS.danger + '80' : COLORS.primary + '55';

  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={48} color={iconColor} />
      <Text style={[styles.title, { color: T.text }]}>{title}</Text>
      <Text style={[styles.body, { color: T.subText }]}>{body}</Text>
      {!!actionLabel && !!onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} variant={tone === 'error' ? 'danger' : 'primary'} />
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
