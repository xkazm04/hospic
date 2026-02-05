# Technology Stack: Chatbot Interface Additions

**Domain:** Conversational AI Chatbot for Medical Device Catalog
**Researched:** 2026-02-05
**Focus:** Stack ADDITIONS for chatbot milestone (builds on existing v1.0 stack)

## Executive Summary

This milestone adds a floating chat widget to MedCatalog that queries the product database AND uses Gemini with web search grounding to find EU market alternatives. The architecture choice is critical: **use Vercel AI SDK** rather than extending the existing `@google/genai` client directly.

**Why Vercel AI SDK over direct @google/genai:**
1. Built-in streaming abstraction eliminates manual ReadableStream construction
2. `useChat` hook handles all client-side state (messages, loading, errors)
3. Google Search grounding is supported via `@ai-sdk/google` provider
4. Message parts system handles text, tool calls, and citations cleanly
5. ~60% less boilerplate than manual streaming implementation

## Stack Additions

### AI Streaming & Chat Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ai | 6.0.x | Vercel AI SDK core | Provides `streamText`, `UIMessage`, streaming protocol. Current version as of Feb 2026. |
| @ai-sdk/google | 3.0.x | Google provider | Wraps Gemini models with unified API. Built-in `google.tools.googleSearch()` for grounding. |
| @ai-sdk/react | 3.0.x | React hooks | `useChat` hook manages messages, streaming state, tool calls. Works with App Router. |

**Integration Point:** The existing `@google/genai` client in `lib/gemini/client.ts` remains for document extraction. The new Vercel AI SDK handles chat-specific needs separately - this is cleaner than trying to unify them.

**Current Package Versions (verified Feb 5, 2026):**
- `ai@6.0.71` - Core SDK
- `@ai-sdk/react@3.0.73` - React hooks
- `@ai-sdk/google@3.0.21` - Google/Gemini provider

### Markdown Rendering for Chat

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-markdown | 9.x | Markdown rendering | Stable, widely used. Renders AI responses with proper formatting. |
| remark-gfm | 4.x | GitHub Flavored Markdown | Enables tables, task lists, strikethrough in responses. Required for comparison tables. |

**Alternative Considered:** Streamdown (drop-in replacement optimized for AI streaming). However, react-markdown + remark-gfm is sufficient and avoids adding another dependency. Streamdown's main benefit (handling incomplete markdown chunks) is handled by AI SDK's streaming protocol.

### Chat UI Components

| Approach | Recommendation |
|----------|----------------|
| **Option A: Build custom** | RECOMMENDED for this project |
| Option B: assistant-ui | Overkill - adds persistence, complex state |
| Option C: chatscope/chat-ui-kit | Too opinionated styling, hard to match existing design |

**Rationale for custom components:**
- Chat widget is relatively simple (messages, input, buttons)
- Existing Radix UI + Tailwind foundation provides all primitives needed
- Full control over styling to match MedCatalog design system
- No additional dependencies beyond AI SDK

**Components to build:**
- `ChatWidget` - Floating button + expandable container
- `ChatMessage` - Renders text, tables, buttons, citations
- `ChatInput` - Auto-resize textarea + send button
- `SuggestionChips` - Quick action buttons
- `ProductTable` - Inline comparison table (reuse existing TanStack Table patterns)

## Implementation Patterns

### Route Handler Setup

```typescript
// app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60; // Allow longer responses for web search

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const supabase = await createClient();

  // Get product context from database
  const { data: products } = await supabase
    .from('products')
    .select('name, sku, vendor:vendors(name), price')
    .limit(100);

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: buildSystemPrompt(products),
    messages: await convertToModelMessages(messages),
    tools: {
      // Enable Google Search for EU market alternatives
      google_search: google.tools.googleSearch({}),
      // Custom tool for database queries
      search_products: {
        description: 'Search the product catalog',
        parameters: z.object({
          query: z.string(),
          category: z.string().optional(),
        }),
        execute: async ({ query, category }) => {
          return searchProducts(supabase, query, category);
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Client Component Pattern

```typescript
// components/chat/chat-widget.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <ChatPanel
          messages={messages}
          onSend={sendMessage}
          status={status}
        />
      ) : (
        <ChatButton onClick={() => setIsOpen(true)} />
      )}
    </div>
  );
}

function ChatPanel({ messages, onSend, status }) {
  return (
    <div className="w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
      <ChatInput onSend={onSend} disabled={status !== 'ready'} />
    </div>
  );
}

function ChatMessage({ message }) {
  return (
    <div className={message.role === 'user' ? 'text-right' : 'text-left'}>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <table className="min-w-full border-collapse">
                    {children}
                  </table>
                ),
              }}
            >
              {part.text}
            </ReactMarkdown>
          );
        }
        if (part.type === 'tool-google_search') {
          return <SourcesCitation key={i} sources={part.result} />;
        }
        return null;
      })}
    </div>
  );
}
```

### Google Search Grounding Response Handling

```typescript
// The AI SDK automatically handles grounding metadata
// Access via message parts with type 'tool-google_search'

interface GroundingResult {
  webSearchQueries: string[];
  groundingChunks: Array<{
    web: { uri: string; title: string };
  }>;
  groundingSupports: Array<{
    segment: { text: string };
    groundingChunkIndices: number[];
  }>;
}

function SourcesCitation({ sources }: { sources: GroundingResult }) {
  if (!sources?.groundingChunks?.length) return null;

  return (
    <div className="mt-2 text-sm text-muted-foreground">
      <span className="font-medium">Sources:</span>
      <ul className="mt-1 space-y-1">
        {sources.groundingChunks.map((chunk, i) => (
          <li key={i}>
            <a
              href={chunk.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {chunk.web.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Interactive Buttons in Messages

For interactive buttons (like "Compare these products" or "Show alternatives"), use tool calls with client-side execution:

```typescript
// In route handler
tools: {
  show_comparison: {
    description: 'Display a comparison table for products',
    parameters: z.object({
      productIds: z.array(z.string()),
    }),
    // No execute - handled client-side
  },
  suggest_actions: {
    description: 'Suggest follow-up actions to the user',
    parameters: z.object({
      actions: z.array(z.object({
        label: z.string(),
        prompt: z.string(),
      })),
    }),
  },
},

// In client component
function ChatMessage({ message, onSend }) {
  return message.parts.map((part, i) => {
    if (part.type === 'tool-suggest_actions' && part.result) {
      return (
        <div key={i} className="flex flex-wrap gap-2 mt-2">
          {part.result.actions.map((action, j) => (
            <button
              key={j}
              onClick={() => onSend({ text: action.prompt })}
              className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20"
            >
              {action.label}
            </button>
          ))}
        </div>
      );
    }
    // ... other part types
  });
}
```

## Installation

```bash
# AI SDK (new dependencies)
npm install ai @ai-sdk/google @ai-sdk/react

# Markdown rendering
npm install react-markdown remark-gfm
```

**Total new dependencies:** 5 packages
**Estimated bundle impact:** ~45KB gzipped (AI SDK is tree-shakeable)

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LangChain | Overkill for single-model chat with tools | Vercel AI SDK |
| assistant-ui | Adds complexity (persistence, analytics) not needed for MVP | Custom components |
| WebSocket for streaming | SSE is sufficient and simpler | AI SDK's default SSE transport |
| Separate chat database | Messages are ephemeral for this use case | In-memory via useChat |
| @google/genai for chat | Would require manual streaming implementation | @ai-sdk/google provider |

## Model Selection

| Model | Use Case | Cost |
|-------|----------|------|
| gemini-2.5-flash | Default for chat | Low (fast, cheap) |
| gemini-2.5-pro | Complex comparisons (if flash insufficient) | Higher |

**Grounding billing note:** With Gemini 3+ models, Google Search grounding is billed per search query executed, not per prompt. Gemini 2.5 models are billed per prompt. Using gemini-2.5-flash keeps costs predictable.

## Environment Variables

Add to existing `.env`:
```env
# Existing
GEMINI_API_KEY=...  # Already configured, reused by @ai-sdk/google

# No new env vars needed - AI SDK uses same GEMINI_API_KEY
# (or GOOGLE_GENERATIVE_AI_API_KEY if you prefer)
```

## Integration Points with Existing Stack

| Existing | How Chat Uses It |
|----------|------------------|
| Supabase client (`lib/supabase/server.ts`) | Database queries for product context |
| Product types (`lib/schemas/`) | Type-safe product data in chat responses |
| TanStack Table patterns | Reuse for inline comparison tables |
| Radix UI Dialog | Chat widget container |
| Motion | Chat widget open/close animations |
| Tailwind | All chat UI styling |

## Architecture Boundary

```
Existing (@google/genai)          New (Vercel AI SDK)
-------------------------          -------------------
- Document extraction             - Chat streaming
- PDF processing                  - Google Search grounding
- Structured JSON output          - Tool execution
- lib/gemini/client.ts            - app/api/chat/route.ts
```

Keep these separate. The existing extraction pipeline works well and doesn't need the streaming overhead. Chat has different requirements (streaming, tools, citations) that AI SDK handles better.

## Confidence Assessment

| Area | Confidence | Verification |
|------|------------|--------------|
| AI SDK setup | HIGH | Official docs, Feb 2026 releases |
| Google Search grounding | HIGH | Verified syntax in official Gemini API docs |
| Streaming in Next.js 16 | HIGH | Next.js 16 blog, AI SDK docs |
| react-markdown + remark-gfm | HIGH | Stable, widely used |
| Custom chat UI approach | MEDIUM | Recommendation based on project context |
| Tool call buttons pattern | MEDIUM | AI SDK 6 redesigned tool parts |

## Sources

- [Vercel AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6) - Major version features
- [AI SDK Getting Started](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) - Next.js App Router setup
- [AI SDK Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Google Search grounding syntax
- [Gemini API Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search) - Grounding metadata structure
- [GitHub vercel/ai releases](https://github.com/vercel/ai/releases) - Current version verification
- [GitHub js-genai streaming sample](https://github.com/googleapis/js-genai/blob/main/sdk-samples/generate_content_streaming.ts) - Direct SDK streaming pattern
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) - GFM table support
- [assistant-ui](https://www.assistant-ui.com/) - Considered but not recommended for this scope

---
*Stack research for: Chatbot Interface Milestone*
*Researched: 2026-02-05*
