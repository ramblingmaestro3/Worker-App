import { io, Socket } from 'socket.io-client';
import { getAccessToken, getSocketBaseUrl } from './api';

let socket: Socket | null = null;

/** A single authenticated, reconnecting socket prevents duplicate device connections. */
export function messagingSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;
  if (!socket) {
    socket = io(getSocketBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function disconnectMessagingSocket() {
  socket?.disconnect();
  socket = null;
}
