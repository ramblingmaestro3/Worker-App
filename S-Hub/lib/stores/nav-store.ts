import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CustomerTabKey, WorkerTabKey } from '@/navigation/types';

export type { CustomerTabKey, WorkerTabKey };

type NavState = {
  lastCustomerTab: CustomerTabKey;
  lastWorkerTab: WorkerTabKey;
  setLastCustomerTab: (tab: CustomerTabKey) => void;
  setLastWorkerTab: (tab: WorkerTabKey) => void;
};

/** Remembers which tab each role last landed on so a cold relaunch resumes there instead of always defaulting to the first tab. */
export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      lastCustomerTab: 'home',
      lastWorkerTab: 'worker-dashboard',
      setLastCustomerTab: (tab) => set({ lastCustomerTab: tab }),
      setLastWorkerTab: (tab) => set({ lastWorkerTab: tab }),
    }),
    {
      name: 'nav-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * True once the persisted last-tab values have been read back from
 * AsyncStorage. A Tabs navigator's `initialRouteName` is only consulted the
 * first time it mounts, so callers must wait for this before rendering
 * <Tabs> — otherwise it captures the pre-hydration default ('home' /
 * 'worker-dashboard') instead of the actually-remembered tab.
 */
export function useNavHydrated() {
  const [hydrated, setHydrated] = useState(useNavStore.persist.hasHydrated());

  useEffect(() => {
    if (useNavStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useNavStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
