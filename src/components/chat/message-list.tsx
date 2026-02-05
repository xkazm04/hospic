'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './message-bubble';
import type { UIMessage } from 'ai';

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or content streams
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          <p>Ask me anything about medical devices...</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            content={typeof message.content === 'string' ? message.content : ''}
            role={message.role as 'user' | 'assistant'}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
