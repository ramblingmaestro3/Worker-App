import { createNavigationContainerRef } from '@react-navigation/native';
import type { CustomerTabKey, RootStackParamList, WorkerTabKey } from './types';

/**
 * Lets non-component code (lib/auth.ts's routeSignedInUserByRole, called from
 * several screens as a plain async helper, not a hook) trigger navigation
 * without needing a `navigation` prop threaded through. See
 * https://reactnavigation.org/docs/navigating-without-navigation-prop/
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function resetTo(routeName: keyof RootStackParamList) {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({ index: 0, routes: [{ name: routeName } as never] });
}

/**
 * Collapses the stack onto the customer tabs, landing specifically on the
 * Home tab — used after sign-in/sign-up/sign-out-adjacent flows so the back
 * button can't return to a screen from before the switch. Explicitly
 * targets the nested 'home' screen rather than leaving CustomerTabs to fall
 * back to its own initialRouteName (nav-store's remembered last-open tab),
 * matching the original router.replace('/home') behavior exactly.
 */
export function resetToCustomerHome() {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [{ name: 'CustomerTabs', state: { routes: [{ name: 'home' }] } } as never],
  });
}

/** Collapses the stack onto the worker tabs, landing specifically on the Worker Dashboard tab — see resetToCustomerHome. */
export function resetToWorkerHome() {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({
    index: 0,
    routes: [{ name: 'WorkerTabs', state: { routes: [{ name: 'worker-dashboard' }] } } as never],
  });
}

export function resetToSignIn() {
  resetTo('SignIn');
}

/** Used after a deliberate sign-out — lands back on the marketing welcome
 * screen (Get Started / Sign in) rather than dropping straight into the
 * sign-in form. Not used for session-expiry (App.tsx's watcher goes
 * straight to SignIn instead, since that's urgent re-auth, not a choice). */
export function resetToSplash() {
  resetTo('Splash');
}

export function resetToBecomeWorker() {
  resetTo('BecomeWorker');
}

export function resetToVerificationPending() {
  resetTo('VerificationPending');
}

export function resetToVerified() {
  resetTo('Verified');
}

/** Used by the password-recovery deep link handler, which needs to land on this screen regardless of whatever else is on the stack. */
export function navigateToResetPassword() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('ResetPassword');
}

/** Jump into a specific tab of the customer tab navigator from outside it (e.g. from a pushed screen, or from non-component code). */
export function navigateToCustomerTab(screen: CustomerTabKey) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('CustomerTabs', { screen } as never);
}

/** Jump into a specific tab of the worker tab navigator from outside it. */
export function navigateToWorkerTab(screen: WorkerTabKey) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('WorkerTabs', { screen } as never);
}
