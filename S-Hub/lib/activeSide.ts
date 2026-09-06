import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActiveSide = 'client' | 'worker';

const ACTIVE_SIDE_KEY = 'active-side';

/**
 * Persists the side (client/worker) the user last explicitly selected — via
 * the sign-in toggle or a "Switch to X Mode" action. Read back by
 * routeSignedInUserByRole (lib/auth.ts) whenever it's asked to route with no
 * explicit preference (cold-start relaunch, an already-signed-in user
 * landing back on an entry screen), so those cases land on whichever side
 * the user actually chose last instead of silently re-deriving it from
 * `profiles.role`.
 */
export async function setActiveSide(side: ActiveSide): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SIDE_KEY, side);
}

/** The last explicitly-selected side, or null if the user has never made an explicit choice on this device (e.g. a brand new account). */
export async function getActiveSide(): Promise<ActiveSide | null> {
  const value = await AsyncStorage.getItem(ACTIVE_SIDE_KEY);
  return value === 'client' || value === 'worker' ? value : null;
}
