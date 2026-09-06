import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type PinnedConversationsState = {
  pinnedIds: string[];
  isPinned: (bookingId: string) => boolean;
  togglePin: (bookingId: string) => void;
};

/** Remembers which conversations (by booking id) the user has pinned to the top of their messages list. Device-local, not scoped per account — matches nav-store's existing unscoped convention. */
export const usePinnedConversationsStore = create<PinnedConversationsState>()(
  persist(
    (set, get) => ({
      pinnedIds: [],
      isPinned: (bookingId) => get().pinnedIds.includes(bookingId),
      togglePin: (bookingId) =>
        set((state) => ({
          pinnedIds: state.pinnedIds.includes(bookingId)
            ? state.pinnedIds.filter((id) => id !== bookingId)
            : [...state.pinnedIds, bookingId],
        })),
    }),
    {
      name: 'pinned-conversations-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
