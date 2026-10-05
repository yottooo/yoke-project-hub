import { useEffect, useState } from 'react';
import type { ChatMessage } from '@/api/types';
import { socket } from '@/lib/socket';

/** A received message, plus whether this tab sent it. */
export type DisplayedMessage = ChatMessage & { mine: boolean };

/**
 * A project's chat over the shared socket. The page must already be in the
 * project's room (useProjectRoom). Messages live in memory only: the API
 * does not store them, so they are gone after a reload.
 */
export function useProjectChat(projectId: number) {
  const [messages, setMessages] = useState<DisplayedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (message: ChatMessage) => {
      if (message.projectId !== projectId) return;
      // Decided on arrival: the socket id changes after a reconnect, but the
      // message keeps its answer.
      const mine = message.senderId === socket.id;
      setMessages((previous) => [...previous, { ...message, mine }]);
    };
    const onError = ({ message }: { message: string }) => setError(message);
    const onJoined = () => setError(null);

    socket.on('newMessage', onMessage);
    socket.on('error', onError);
    socket.on('joinedProject', onJoined);
    return () => {
      socket.off('newMessage', onMessage);
      socket.off('error', onError);
      socket.off('joinedProject', onJoined);
    };
  }, [projectId]);

  // No local echo: the server sends the message back to everyone in the
  // room, the sender included.
  const send = (text: string) => {
    socket.emit('sendMessage', { projectId, text });
  };

  return { messages, error, send };
}
