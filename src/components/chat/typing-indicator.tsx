'use client';

export function TypingIndicator() {
  return (
    <div className="px-4 py-2 flex items-center gap-1">
      <span className="text-sm text-muted-foreground animate-pulse">
        Generating response
      </span>
      <span className="flex gap-0.5">
        <span
          className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </span>
    </div>
  );
}
