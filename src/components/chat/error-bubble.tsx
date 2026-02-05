'use client';

interface ErrorBubbleProps {
  message: string;
  isRetryable: boolean;
  onRetry?: () => void;
}

export function ErrorBubble({ message, isRetryable, onRetry }: ErrorBubbleProps) {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl rounded-bl-md">
        <p className="text-sm">{message}</p>
        {isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
