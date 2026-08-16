import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api, getAccessToken, onAuthChange } from '../lib/api';
import { messagingSocket } from '../lib/messaging';

type UnreadMessagesContextValue = {
  unreadCount: number;
  unreadByConversation: Record<number, number>;
  refreshUnreadCount: () => void;
  markConversationRead: (conversationId: number) => void;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextValue>({
  unreadCount: 0,
  unreadByConversation: {},
  refreshUnreadCount: () => {},
  markConversationRead: () => {},
});

/** Shared everywhere so the footer nav badge stays in sync with the messages list without every screen re-fetching. */
export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const [unreadByConversation, setUnreadByConversation] = useState<Record<number, number>>({});

  const refreshUnreadCount = useCallback(() => {
    if (!getAccessToken()) { setUnreadByConversation({}); return; }
    api.getConversations().then(r => {
      const next: Record<number, number> = {};
      r.items.forEach((c: any) => { next[c.id] = c.unreadCount || 0; });
      setUnreadByConversation(next);
    }).catch(() => {});
  }, []);

  const markConversationRead = useCallback((conversationId: number) => {
    setUnreadByConversation(prev => (prev[conversationId] ? { ...prev, [conversationId]: 0 } : prev));
  }, []);

  useEffect(() => {
    let socket: Socket | null = messagingSocket();
    socket?.on('conversation:updated', refreshUnreadCount);

    const unsubscribeAuth = onAuthChange(authenticated => {
      socket?.off('conversation:updated', refreshUnreadCount);
      if (authenticated) {
        refreshUnreadCount();
        socket = messagingSocket();
        socket?.on('conversation:updated', refreshUnreadCount);
      } else {
        setUnreadByConversation({});
        socket = null;
      }
    });

    if (getAccessToken()) refreshUnreadCount();

    return () => { unsubscribeAuth(); socket?.off('conversation:updated', refreshUnreadCount); };
  }, [refreshUnreadCount]);

  const unreadCount = Object.values(unreadByConversation).reduce((sum, n) => sum + n, 0);

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, unreadByConversation, refreshUnreadCount, markConversationRead }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}
