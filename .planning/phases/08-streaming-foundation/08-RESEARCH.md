# Phase 8: Streaming Foundation - Research

**Researched:** 2026-02-05
**Domain:** AI Streaming Chat Interface with Vercel AI SDK
**Confidence:** HIGH

## Summary

This phase implements a floating chat widget with real-time streaming responses from Gemini. The Vercel AI SDK provides a complete solution with `@ai-sdk/google` for the provider, `@ai-sdk/react` for client-side hooks, and the core `ai` package for server-side streaming. The project already uses Motion (Framer Motion) which supports the required "expand in place" animation via `layoutId` shared element transitions.

The architecture follows Vercel's recommended pattern: a Route Handler at `/api/chat/route.ts` uses `streamText` to generate responses, while the client uses `useChat` hook for state management and automatic streaming. React-markdown with remark-gfm handles markdown rendering including tables and code blocks.

**Primary recommendation:** Use `useChat` hook with `DefaultChatTransport` pointing to `/api/chat`, implement abort via the `stop()` function with server-side `abortSignal` passthrough, and use Motion's `layoutId` to animate the button-to-panel transformation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | 6.x | Core SDK with `streamText`, `convertToModelMessages` | Official Vercel AI SDK, unified LLM interface |
| `@ai-sdk/react` | 3.x | `useChat` hook for chat state management | Official React bindings with streaming support |
| `@ai-sdk/google` | 3.x | Google/Gemini provider adapter | Official provider with Gemini 2.5/3 support |
| `react-markdown` | 10.x | Markdown rendering component | De-facto React markdown standard, ESM-only |
| `remark-gfm` | 4.x | GitHub Flavored Markdown plugin | Tables, task lists, strikethrough support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `rehype-highlight` | 7.x | Syntax highlighting for code blocks | If code block styling is needed |
| Motion (already installed) | 12.x | Panel animation | Expand-in-place animation with `layoutId` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useChat` | `useCompletion` | useCompletion is for single-turn, not conversational |
| `react-markdown` | `@mdx-js/react` | MDX is overkill for display-only markdown |
| `rehype-highlight` | `rehype-pretty-code` | Pretty-code uses Shiki (larger, more beautiful) |

**Installation:**
```bash
npm install ai @ai-sdk/react @ai-sdk/google react-markdown remark-gfm
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── chat/
│           └── route.ts        # Streaming endpoint
├── components/
│   └── chat/
│       ├── chat-widget.tsx     # Main widget container with AnimatePresence
│       ├── chat-button.tsx     # Floating pill button
│       ├── chat-panel.tsx      # Expanded chat panel
│       ├── message-list.tsx    # Scrollable message container
│       ├── message-bubble.tsx  # Individual message with markdown
│       └── chat-input.tsx      # Auto-expanding textarea with send button
└── lib/
    └── chat/
        └── constants.ts        # Model config, system prompt
```

### Pattern 1: Route Handler with Streaming
**What:** POST endpoint that accepts messages and returns streaming response
**When to use:** Always for chat functionality
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
// src/app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: 'You are a helpful medical device catalog assistant.',
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal, // Pass abort signal for cleanup
  });

  return result.toUIMessageStreamResponse();
}
```

### Pattern 2: useChat Hook Integration
**What:** Client-side hook managing chat state and streaming
**When to use:** In client components that need chat functionality
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
'use client';
import { useChat } from '@ai-sdk/react';

export function ChatPanel() {
  const {
    messages,
    sendMessage,
    status,
    stop,
    error
  } = useChat();

  const isStreaming = status === 'streaming';

  return (
    // ... UI that uses messages, sendMessage, stop
  );
}
```

### Pattern 3: Shared Layout Animation (Button to Panel)
**What:** Button morphs into panel using Motion's `layoutId`
**When to use:** Expand-in-place UI pattern
**Example:**
```typescript
// Source: https://motion.dev/docs/react-layout-animations
import { motion, AnimatePresence } from 'motion/react';

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4">
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.button
            key="button"
            layoutId="chat-container"
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-accent text-white rounded-full"
          >
            Chat
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            layoutId="chat-container"
            className="w-[450px] h-[600px] bg-background rounded-lg shadow-lg"
          >
            {/* Panel content */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Pattern 4: Auto-Expanding Textarea
**What:** Textarea that grows with content up to a max height
**When to use:** Chat input fields
**Example:**
```typescript
// Source: Community pattern verified across multiple sources
function AutoExpandingTextarea({ value, onChange, onSubmit }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      rows={1}
      className="resize-none overflow-hidden"
      style={{ maxHeight: '150px' }}
    />
  );
}
```

### Anti-Patterns to Avoid
- **Manual SSE parsing:** Don't hand-roll Server-Sent Events handling; use `toUIMessageStreamResponse()`
- **Polling for updates:** The SDK handles streaming; don't implement polling
- **Global chat state:** Keep chat state in the component using `useChat`, not in global store
- **Fixed textarea height:** Always auto-expand for better UX

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming | Custom EventSource parsing | `toUIMessageStreamResponse()` | Handles encoding, errors, partial chunks |
| Message state | Custom useState for messages | `useChat` hook | Manages optimistic updates, streaming, errors |
| Abort handling | Manual AbortController management | `stop()` + `abortSignal` passthrough | Properly cleans up both client and server |
| Markdown rendering | dangerouslySetInnerHTML | `react-markdown` | XSS protection, proper AST parsing |
| Shared element animation | CSS transforms + JS timing | Motion `layoutId` | FLIP technique, GPU-accelerated, handles edge cases |

**Key insight:** The Vercel AI SDK abstracts significant complexity around streaming, error handling, and state management. Manual implementations miss edge cases like partial JSON chunks, connection drops, and proper cleanup.

## Common Pitfalls

### Pitfall 1: Forgetting abortSignal Passthrough
**What goes wrong:** User clicks stop but server keeps generating (wasted tokens, orphan processes)
**Why it happens:** `stop()` only aborts client-side fetch, not server-side generation
**How to avoid:** Pass `req.signal` to `streamText({ abortSignal: req.signal })`
**Warning signs:** Token usage continues after stop, delayed responses pile up

### Pitfall 2: AnimatePresence Conditional Placement
**What goes wrong:** Exit animation doesn't play, component just disappears
**Why it happens:** Conditional outside AnimatePresence removes it before exit can animate
**How to avoid:** Always put conditional inside AnimatePresence: `<AnimatePresence>{isOpen && <Component />}</AnimatePresence>`
**Warning signs:** Panel snaps closed instead of animating

### Pitfall 3: Textarea Height Reset Race Condition
**What goes wrong:** Textarea height jumps or doesn't update smoothly
**Why it happens:** Setting height directly without resetting to 'auto' first
**How to avoid:** Always set `height: 'auto'` then `height: scrollHeight + 'px'` in same effect
**Warning signs:** Textarea gets stuck at wrong height, requires multiple keystrokes to update

### Pitfall 4: Markdown Rendering Without GFM Plugin
**What goes wrong:** Tables render as plain text, strikethrough doesn't work
**Why it happens:** Standard markdown doesn't include table syntax
**How to avoid:** Always include `remarkPlugins={[remarkGfm]}`
**Warning signs:** Pipe characters (|) appear literally instead of table cells

### Pitfall 5: Memory Leak on Unmount During Streaming
**What goes wrong:** Console errors, memory leaks, state updates on unmounted component
**Why it happens:** Stream continues after component unmounts
**How to avoid:** Call `stop()` in cleanup effect when panel closes
**Warning signs:** React warnings about state updates on unmounted components

### Pitfall 6: Missing Environment Variable for @ai-sdk/google
**What goes wrong:** Runtime error about missing API key
**Why it happens:** `@ai-sdk/google` defaults to `GOOGLE_GENERATIVE_AI_API_KEY`, not `GEMINI_API_KEY`
**How to avoid:** Either rename env var or use `createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })`
**Warning signs:** "API key not found" errors

## Code Examples

Verified patterns from official sources:

### Complete Route Handler
```typescript
// Source: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
// src/app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Use existing GEMINI_API_KEY env var
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: `You are MedCatalog Assistant, helping users find orthopedic medical devices.
Be concise and professional. When discussing products, mention key specs like material, dimensions, and regulatory status.`,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
```

### useChat Client Integration
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
'use client';
import { useChat } from '@ai-sdk/react';
import { useEffect } from 'react';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const {
    messages,
    sendMessage,
    status,
    stop,
    error
  } = useChat();

  // Cleanup on close - abort any streaming
  useEffect(() => {
    if (!isOpen && status === 'streaming') {
      stop();
    }
  }, [isOpen, status, stop]);

  const handleSubmit = (text: string) => {
    if (text.trim()) {
      sendMessage({ text });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isStreaming={status === 'streaming'} />
      <ChatInput
        onSubmit={handleSubmit}
        disabled={status === 'streaming'}
      />
      {status === 'streaming' && (
        <button onClick={stop}>Stop generating</button>
      )}
    </div>
  );
}
```

### Markdown Message Bubble
```typescript
// Source: https://github.com/remarkjs/react-markdown
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
}

export function MessageBubble({ content, role }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-accent text-accent-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <Markdown
            remarkPlugins={[remarkGfm]}
            className="prose prose-sm max-w-none"
            components={{
              // Custom table styling for theme
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full border-collapse">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border bg-table-header px-2 py-1 text-left">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-2 py-1">
                  {children}
                </td>
              ),
              // Code block styling
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={`block bg-muted p-2 rounded overflow-x-auto ${className}`} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
```

### Widget with Layout Animation
```typescript
// Source: https://motion.dev/docs/react-layout-animations
'use client';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.button
            key="chat-button"
            layoutId="chat-container"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-green-hover transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Chat</span>
          </motion.button>
        ) : (
          <motion.div
            key="chat-panel"
            layoutId="chat-container"
            className="w-[450px] h-[600px] bg-background rounded-lg shadow-lg border border-border overflow-hidden flex flex-col"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold">MedCatalog Assistant</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat content */}
            <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `StreamingTextResponse` | `toUIMessageStreamResponse()` | AI SDK 5.x | Better UI state sync, typed messages |
| `useChat` with `api` prop | `useChat` with `transport` | AI SDK 5.x | More flexible transport options |
| Manual message state | `UIMessage` type with `parts` | AI SDK 5.x | Structured content (text, tool calls) |
| `@ai-sdk/google` env `GOOGLE_API_KEY` | `GOOGLE_GENERATIVE_AI_API_KEY` | Recent | More explicit naming |
| Framer Motion package | `motion` package | Motion 10+ | Smaller bundle, same API |

**Deprecated/outdated:**
- `StreamingTextResponse`: Use `toUIMessageStreamResponse()` for UI hooks
- `useChat({ api })`: Replaced with `transport` prop in AI SDK 5+
- Direct message string content: Now uses `parts` array with typed content

## Open Questions

Things that couldn't be fully resolved:

1. **Exact AI SDK version compatibility**
   - What we know: AI SDK 6.x is current, uses `UIMessage` and `toUIMessageStreamResponse()`
   - What's unclear: Whether AI SDK 5.x patterns still work, version pinning strategy
   - Recommendation: Install latest (`ai@latest`), test immediately, pin if issues

2. **Gemini model availability**
   - What we know: `gemini-2.5-flash` is recommended for general use
   - What's unclear: Whether `gemini-3-flash-preview` (used in extraction) should be used for chat too
   - Recommendation: Use `gemini-2.5-flash` for chat (stable), keep `gemini-3-flash-preview` for extraction

3. **Code syntax highlighting necessity**
   - What we know: `rehype-highlight` adds syntax highlighting
   - What's unclear: Whether users will see code blocks frequently enough to justify extra dependency
   - Recommendation: Defer `rehype-highlight` until code blocks are actually rendered; basic styling sufficient initially

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK Core Overview](https://ai-sdk.dev/docs/ai-sdk-core/overview) - streamText architecture
- [Vercel AI SDK UI Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) - useChat hook details
- [Vercel AI SDK Getting Started Next.js](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) - Route handler pattern
- [Vercel AI SDK useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - Complete API
- [@ai-sdk/google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Gemini setup
- [Vercel AI SDK Stopping Streams](https://ai-sdk.dev/docs/advanced/stopping-streams) - Abort handling
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) - Markdown rendering setup

### Secondary (MEDIUM confidence)
- [Motion Layout Animations](https://motion.dev/docs/react-layout-animations) - layoutId pattern
- [Motion AnimatePresence](https://motion.dev/docs/react-animate-presence) - Exit animation pattern
- WebSearch: Auto-expanding textarea patterns (consistent across multiple sources)
- WebSearch: rehype-highlight usage (verified with GitHub repo)

### Tertiary (LOW confidence)
- Blog posts on Framer Motion layout animations (patterns verified but examples incomplete)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Vercel AI SDK documentation is comprehensive
- Architecture: HIGH - Route handler + useChat pattern is well-documented
- Animation patterns: MEDIUM - Motion docs accessible but code examples required manual assembly
- Pitfalls: HIGH - Multiple sources document abort handling and AnimatePresence gotchas

**Research date:** 2026-02-05
**Valid until:** 30 days (AI SDK is stable, Motion is mature)
