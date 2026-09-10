/**
 * App-wide crash guard. When a render throws, React unmounts the entire tree —
 * which in this app means a blank screen (the Notifications notification-type
 * drift was exactly this). This catches the throw, shows a recover screen, and
 * lets the user re-mount the tree without the OS killing the process.
 *
 * A class component is the only way to implement `componentDidCatch` /
 * `getDerivedStateFromError`, so the themed fallback UI is delegated to a small
 * function child that can use hooks. It sits *inside* ThemeProvider (see
 * App.tsx) so `useThemeColors()` is safe here.
 */
import { Ionicons } from '@expo/vector-icons';
import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';

type Props = { children: ReactNode };
type State = { error: Error | null };

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const T = useThemeColors();
  return (
    <View style={[styles.wrap, { backgroundColor: T.bgSolid }]}>
      <Ionicons name="warning-outline" size={48} color={COLORS.danger} />
      <Text style={[styles.title, { color: T.text }]}>Something went wrong</Text>
      <Text style={[styles.body, { color: T.subText }]}>
        This screen hit an unexpected error. Your data is safe — try again.
      </Text>
      <Pressable
        style={styles.btn}
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Reload the app"
      >
        <Text style={styles.btnText}>Reload</Text>
      </Pressable>
    </View>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Last-resort log until a crash reporter (Sentry) is wired in.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return <ErrorFallback onReset={this.reset} />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  btn: {
    marginTop: 8,
    paddingHorizontal: 28,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
