import { io } from 'socket.io-client';

// Socket connects through the same-origin reverse proxy at /socket.io
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');

let socket = null;

export const getSocket = () => {
  const token = localStorage.getItem('apurva_admin_token');

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log(`[Socket KDS/Admin] Connected with ID: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket KDS/Admin] Disconnected: ${reason}`);
    });
  } else {
    // Keep auth token in sync if user re-authenticates
    socket.auth = { token };
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
