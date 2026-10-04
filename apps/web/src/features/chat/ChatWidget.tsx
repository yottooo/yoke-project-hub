import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocketConnected } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useProjectChat, type DisplayedMessage } from './useProjectChat';

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

function MessageBubble({ message }: { message: DisplayedMessage }) {
  const { mine } = message;

  return (
    <li
      className={cn(
        'flex flex-col gap-0.5',
        mine ? 'items-end' : 'items-start',
      )}
    >
      <span className="text-[0.7rem] text-muted-foreground">
        {/* The API has no users yet, so others are known by their socket id. */}
        {mine ? 'You' : `User ${message.senderId.slice(0, 4)}`} ·{' '}
        {timeFormat.format(new Date(message.sentAt))}
      </span>
      <p
        className={cn(
          'max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm wrap-break-word',
          mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {message.text}
      </p>
    </li>
  );
}

/** Floating project chat in the bottom-right corner of the board. */
export function ChatWidget({ projectId }: { projectId: number }) {
  // Mounted even while closed, so messages keep arriving and can be counted.
  const { messages, error, send } = useProjectChat(projectId);
  const connected = useSocketConnected();
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const unread = open ? 0 : messages.length - seenCount;

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages.length]);

  if (!open) {
    return (
      <Button
        size="icon-lg"
        aria-label={unread > 0 ? `Open chat, ${unread} unread` : 'Open chat'}
        className="fixed right-6 bottom-6 z-40 size-12 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-white">
            {unread}
          </span>
        )}
      </Button>
    );
  }

  return (
    <section
      aria-label="Project chat"
      className="fixed right-6 bottom-6 z-40 flex h-112 max-h-[calc(100svh-6rem)] w-80 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10"
    >
      <header className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-medium">Project chat</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close chat"
          onClick={() => {
            setSeenCount(messages.length);
            setOpen(false);
          }}
        >
          <X />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-3 p-3">
          {messages.length === 0 && (
            <li className="py-6 text-center text-xs text-muted-foreground">
              No messages yet. Messages are not saved, so the chat starts empty
              after a reload.
            </li>
          )}
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
        </ul>
        <div ref={endRef} />
      </ScrollArea>

      {error && (
        <p role="alert" className="shrink-0 px-3 pb-1 text-xs text-destructive">
          {error}
        </p>
      )}

      <form
        className="flex shrink-0 gap-2 border-t p-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          send(text);
          setDraft('');
        }}
      >
        <Input
          aria-label="Message"
          placeholder={connected ? 'Write a message…' : 'Reconnecting…'}
          // Sending while offline would reach the server before the room is
          // rejoined, and the sender would never see the message come back.
          disabled={!connected}
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send"
          disabled={!connected || !draft.trim()}
        >
          <Send />
        </Button>
      </form>
    </section>
  );
}
