import { useEffect, useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSession } from '@/api/session';
import type { ChatMessage, Project, Task } from '@/api/types';

interface ServerToClientEvents {
  joinedProject: (payload: { projectId: number }) => void;
  error: (payload: { message: string }) => void;
  newMessage: (message: ChatMessage) => void;
  // Not sent by the API yet; see the contract in apps/web/README.md.
  taskCreated: (task: Task) => void;
  taskUpdated: (task: Task) => void;
  taskDeleted: (payload: { id: number; projectId: number }) => void;
  projectCreated: (project: Project) => void;
  projectUpdated: (project: Project) => void;
  projectRemoved: (payload: { id: number }) => void;
}

interface ClientToServerEvents {
  joinProject: (payload: { projectId: number }) => void;
  leaveProject: (payload: { projectId: number }) => void;
  sendMessage: (payload: { projectId: number; text: string }) => void;
}

/**
 * The one socket of the app, shared by the chat and the live updates.
 * No URL: it connects to the page's own address, and Vite forwards
 * /socket.io to the API. AppLayout opens it after login and closes it on
 * logout.
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: false,
  // The API ignores the token today; it is here for when the gateway checks it.
  auth: (cb) => cb({ token: getSession()?.accessToken }),
});

function subscribeToConnection(onChange: () => void): () => void {
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
}

/** Whether the socket is connected right now. Re-renders when that changes. */
export function useSocketConnected(): boolean {
  return useSyncExternalStore(subscribeToConnection, () => socket.connected);
}

/** Keeps the socket in a project's room while the calling page is shown. */
export function useProjectRoom(projectId: number): void {
  useEffect(() => {
    const join = () => {
      socket.emit('joinProject', { projectId });
    };

    if (socket.connected) join();
    // Runs on every connect, including reconnects: the server forgets the
    // rooms of a socket that dropped.
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      // The API has no leaveProject handler yet and ignores this. Until it
      // has one, listeners check the projectId of what they receive.
      if (socket.connected) socket.emit('leaveProject', { projectId });
    };
  }, [projectId]);
}
