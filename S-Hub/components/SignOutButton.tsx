import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { signOut } from '@/lib/auth';
import { s, vs, ms } from '@/lib/scaling';
import { resetToSplash } from '@/navigation/navigationRef';

/**
 * Drives a sign-out confirmation without relying on `Alert.alert` — on web,
 * react-native-web's Alert is a no-op and this app's fallback (lib/Alert.ts)
 * shells out to the browser's own window.confirm(), which looks like a raw
 * browser popup instead of part of the app. This hook instead just tracks
 * whether an in-app confirmation modal should be showing, so the caller can
 * render its own themed dialog (see ConfirmSignOutModal below).
 */
export function useSignOutConfirm() {
  const [visible, setVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const request = () => setVisible(true);
  const cancel = () => setVisible(false);
  const confirm = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setVisible(false);
    resetToSplash();
  };

  return { visible, signingOut, request, cancel, confirm };
}

function ConfirmSignOutModal({
  visible, signingOut, title, message, confirmLabel, onCancel, onConfirm,
}: {
  visible: boolean;
  signingOut: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const T = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconWrap, { backgroundColor: COLORS.dangerLight }]}>
            <Ionicons name="log-out-outline" size={ms(24)} color={COLORS.danger} />
          </View>
          <Text style={[styles.title, { color: T.text }]}>{title}</Text>
          <Text style={[styles.message, { color: T.subText }]}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: T.border }]} onPress={onCancel} activeOpacity={0.7} disabled={signingOut}>
              <Text style={[styles.cancelText, { color: T.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.85} disabled={signingOut}>
              <Text style={styles.confirmText}>{signingOut ? 'Signing out…' : confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type Props = {
  /** 'menuItem' matches the customer/worker profile menu rows; 'button' matches the standalone Settings screen button. */
  variant?: 'menuItem' | 'button';
  label?: string;
  /** menuItem variant only. */
  subtitle?: string;
  confirmTitle?: string;
  confirmMessage?: string;
};

/**
 * Sign-out trigger + its own themed confirmation modal — the one sign-out
 * flow shared by Settings, and the customer/worker profile menus, previously
 * duplicated three times (and, before that, routed through the OS/browser
 * confirm dialog via Alert.alert).
 */
export default function SignOutButton({
  variant = 'menuItem',
  label = 'Sign Out',
  subtitle,
  confirmTitle = 'Sign Out',
  confirmMessage = 'Are you sure you want to sign out?',
}: Props) {
  const T = useThemeColors();
  const { visible, signingOut, request, cancel, confirm } = useSignOutConfirm();

  return (
    <>
      {variant === 'button' ? (
        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={request}>
          <Ionicons name="log-out-outline" size={ms(18)} color={COLORS.danger} />
          <Text style={styles.buttonText}>{label}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={request}>
          <View style={[styles.rowIconWrap, { backgroundColor: COLORS.dangerLight }]}>
            <Ionicons name="log-out-outline" size={ms(17)} color={COLORS.danger} />
          </View>
          <View style={styles.textGroup}>
            <Text style={[styles.rowLabel, { color: COLORS.danger }]}>{label}</Text>
            {subtitle ? <Text style={[styles.rowSubtitle, { color: T.subText }]}>{subtitle}</Text> : null}
          </View>
        </TouchableOpacity>
      )}

      <ConfirmSignOutModal
        visible={visible}
        signingOut={signingOut}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={label}
        onCancel={cancel}
        onConfirm={confirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // menuItem variant
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: s(16), paddingVertical: vs(13), gap: s(13),
  },
  rowIconWrap: {
    width: s(34), height: s(34), borderRadius: s(10),
    alignItems: 'center', justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  rowLabel: { fontSize: ms(13.5), fontWeight: '600' },
  rowSubtitle: { fontSize: ms(10.5), marginTop: vs(1) },

  // button variant
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(8),
    height: vs(52), borderRadius: RADIUS.md, backgroundColor: COLORS.dangerLight,
  },
  buttonText: { fontSize: ms(15), fontWeight: '700', color: COLORS.danger },

  // confirmation modal
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: s(24),
  },
  card: {
    width: '100%', maxWidth: s(340), borderRadius: s(20), borderWidth: 1,
    padding: s(20), alignItems: 'center',
  },
  iconWrap: {
    width: s(52), height: s(52), borderRadius: s(26),
    alignItems: 'center', justifyContent: 'center', marginBottom: vs(14),
  },
  title: { fontSize: ms(17), fontWeight: '700', marginBottom: vs(6), textAlign: 'center' },
  message: { fontSize: ms(13.5), lineHeight: ms(19), textAlign: 'center', marginBottom: vs(20) },
  actions: { flexDirection: 'row', gap: s(10), width: '100%' },
  cancelBtn: {
    flex: 1, height: vs(46), borderRadius: RADIUS.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: ms(14), fontWeight: '600' },
  confirmBtn: {
    flex: 1, height: vs(46), borderRadius: RADIUS.md, backgroundColor: COLORS.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { fontSize: ms(14), fontWeight: '700', color: '#fff' },
});
