'use client';

import { STARTER_PROMPTS } from '@/lib/chat/constants';

interface StarterPromptsProps {
  onSelect: (prompt: string) => void;
}

export function StarterPrompts({ onSelect }: StarterPromptsProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">
        Try asking about medical devices
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full border border-border transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
