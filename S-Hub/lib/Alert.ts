import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Drop-in replacement for react-native's `Alert.alert` — same call
 * signature, so every existing call site works unchanged; only the import
 * source moves from 'react-native' to here.
 *
 * react-native-web's own Alert is a complete no-op
 * (node_modules/react-native-web/src/exports/Alert: `static alert() {}`),
 * which silently breaks every confirm/cancel dialog AND every single-button
 * "OK -> do X" flow in this app on the web build — confirmed live 2026-09:
 * tapping a confirm button produced zero network requests, no dialog, and
 * the onPress callback never ran. This uses window.confirm/alert on web
 * instead, and delegates straight to the real native Alert everywhere else.
 */
function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  // window.confirm only has OK/Cancel -- the 'cancel'-styled button (or the
  // first button, if none is marked) maps to Cancel; the first remaining
  // button maps to OK/confirm.
  const cancelIndex = buttons.findIndex((b) => b.style === 'cancel');
  const confirmIndex = buttons.findIndex((b, i) => i !== cancelIndex);
  const confirmButton = confirmIndex >= 0 ? buttons[confirmIndex] : buttons[buttons.length - 1];
  const cancelButton = cancelIndex >= 0 ? buttons[cancelIndex] : undefined;

  if (window.confirm(text)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}

export const Alert = { alert };
