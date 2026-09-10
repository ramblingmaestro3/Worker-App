/** Wraps a conversation row with a swipe-left reveal for the pin/unpin action. */
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  pinned: boolean;
  onTogglePin: () => void;
};

export default function SwipeableRow({ children, pinned, onTogglePin }: Props) {
  const swipeableRef = useRef<Swipeable | null>(null);

  return (
    <Swipeable
      ref={swipeableRef}
      overshootRight={false}
      rightThreshold={40}
      renderRightActions={() => (
        <TouchableOpacity
          style={[styles.action, { backgroundColor: pinned ? COLORS.muted : COLORS.primary }]}
          activeOpacity={0.85}
          onPress={() => {
            onTogglePin();
            swipeableRef.current?.close();
          }}
          accessibilityRole="button"
          accessibilityLabel={pinned ? 'Unpin conversation' : 'Pin conversation'}
        >
          <Ionicons name={pinned ? 'pin-outline' : 'pin'} size={18} color="#fff" />
          <Text style={styles.actionText}>{pinned ? 'Unpin' : 'Pin'}</Text>
        </TouchableOpacity>
      )}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: { width: 76, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
