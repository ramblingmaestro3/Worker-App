import { create } from 'zustand';
import { countMyUnreadMessages } from '@/lib/api/messages';
import { useAuthStore } from './auth-store';

type UnreadState = {
  /** Count of messages sent to the signed-in user that they haven't read yet. */
  messageCount: number;
  /** Re-reads the count from the server. Safe to call often — it's a HEAD query. */
  refreshMessages: () => Promise<void>;
  /** Clears local state, e.g. on sign-out. */
  reset: () => void;
};

/**
 * App-wide unread-message tally that drives the red dot on the Messages tab.
 * Kept in a store (not a screen hook) because the tab bar is always mounted
 * and needs the number to survive tab switches. Refreshed from: App.tsx on
 * sign-in + on any realtime notification, the Chat screen after it marks a
 * thread read, and the conversation-list screens on focus.
 */
export const useUnreadStore = create<UnreadState>((set) => ({
  messageCount: 0,
  refreshMessages: async () => {
    if (!useAuthStore.getState().user) {
      set({ messageCount: 0 });
      return;
    }
    const result = await countMyUnreadMessages();
    if (result.success) set({ messageCount: result.data ?? 0 });
  },
  reset: () => set({ messageCount: 0 }),
}));
