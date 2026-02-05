# Architecture Patterns: Streaming Chatbot Integration

**Domain:** Streaming AI Chatbot for Medical Device Catalog
**Researched:** 2026-02-05
**Milestone:** Conversational AI Chatbot Addition
**Confidence:** HIGH (verified with official documentation)

## Executive Summary

The chatbot integrates with MedCatalog's existing Next.js 16 App Router architecture using:
1. **Route Handler** (`/api/chat/route.ts`) for streaming Gemini responses
2. **Vercel AI SDK** for unified streaming, tool calling, and message management
3. **Client Component** with `useChat` hook for real-time UI updates
4. **Tool Functions** that wrap existing server actions (getProducts, similarity search)

This architecture leverages existing patterns (server actions, Supabase queries, Zod schemas) while adding streaming capabilities through the established Route Handler pattern already used for `/api/categories`.

---

## Recommended Architecture

```
+----------------------------------------------------------------------+
|                           Client (Browser)                            |
+----------------------------------------------------------------------+
|  page.tsx (Server Component)                                          |
|    +-- CatalogClient (Client)                                         |
|          +-- DataTable, FilterSidebar (existing)                      |
|          +-- ChatWidget (NEW - Client Component)                      |
|                +-- ChatButton (floating trigger)                      |
|                +-- ChatPanel (slide-out or modal)                     |
|                |     +-- MessageList                                  |
|                |     |     +-- TextMessage                            |
|                |     |     +-- ToolInvocation (product card/table)    |
|                |     |     +-- ToolResult (web search results)        |
|                |     +-- ChatInput                                    |
|                +-- useChat() hook manages state                       |
+----------------------------------------------------------------------+
                                    |
                                    | POST /api/chat
                                    | { messages: UIMessage[] }
                                    v
+----------------------------------------------------------------------+
|                    Route Handler (Server)                             |
+----------------------------------------------------------------------+
|  /api/chat/route.ts                                                   |
|    +-- Validates request                                              |
|    +-- streamText({                                                   |
|    |     model: google("gemini-3-flash-preview"),                     |
|    |     messages: convertToModelMessages(messages),                  |
|    |     tools: { searchCatalog, webSearch, ... }                     |
|    |   })                                                             |
|    +-- return result.toUIMessageStreamResponse()                      |
+----------------------------------------------------------------------+
                                    |
                     Tool Execution | (server-side)
                                    v
+----------------------------------------------------------------------+
|                         Tool Functions                                |
+----------------------------------------------------------------------+
|  searchCatalog --> calls getProducts() from lib/queries.ts            |
|  findSimilar   --> calls findSimilarProducts() from lib/actions/      |
|  comparePrice  --> calls getProductPriceComparison()                  |
|  webSearch     --> calls external search API (Google/Bing)            |
+----------------------------------------------------------------------+
```

---

## Integration Points with Existing Architecture

### Existing Components (No Modification Needed)

| Component | Location | Chat Integration |
|-----------|----------|------------------|
| `getProducts()` | `lib/queries.ts` | Tool wraps this for catalog search |
| `findSimilarProducts()` | `lib/actions/similarity.ts` | Tool wraps this for "find similar" |
| `getProductPriceComparison()` | `lib/actions/similarity.ts` | Tool wraps for price comparison |
| `ProductWithRelations` | `lib/types.ts` | Used in tool response formatting |
| `extractedProductSchema` | `lib/schemas/extraction.ts` | Pattern for Zod schemas |

### Existing Components (Minor Modification)

| Component | Modification |
|-----------|--------------|
| `CatalogClient` | Add `ChatWidget` as sibling to existing UI |
| `page.tsx` | No changes needed - ChatWidget self-contained |

### Why Replace `@google/genai` with Vercel AI SDK

The existing Gemini client (`lib/gemini/client.ts`) uses `@google/genai` directly:

```typescript
// Current: lib/gemini/client.ts
import { GoogleGenAI } from "@google/genai";
const response = await ai.models.generateContent({...});
```

For streaming chat with tool calling, the Vercel AI SDK provides:
- **Unified streaming protocol** via `toUIMessageStreamResponse()`
- **Built-in tool execution** with automatic response handling
- **React hooks** (`useChat`) that manage message state
- **Provider abstraction** - same code works with OpenAI, Anthropic, etc.

**Recommendation:** Keep `@google/genai` for existing extraction features, add `@ai-sdk/google` for chat. Both can coexist.

---

## New Components Required

### Routes

| Route | Purpose | File |
|-------|---------|------|
| `/api/chat` | Streaming chat endpoint | `app/api/chat/route.ts` |

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `ChatWidget` | Container managing chat open/close state | `components/chat/chat-widget.tsx` |
| `ChatPanel` | Slide-out panel with messages and input | `components/chat/chat-panel.tsx` |
| `ChatMessage` | Renders message based on `parts` type | `components/chat/chat-message.tsx` |
| `ChatInput` | Input field with send button | `components/chat/chat-input.tsx` |
| `ProductCard` | Tool result display for single product | `components/chat/tool-results/product-card.tsx` |
| `ProductTable` | Tool result display for product list | `components/chat/tool-results/product-table.tsx` |
| `WebSearchResult` | Tool result for external search | `components/chat/tool-results/web-search.tsx` |

---

## Data Flow: Chat to Gemini to Tools to Response

### Sequence Diagram

```
User          ChatWidget       /api/chat        Gemini          Tools
  |               |               |               |               |
  |--"Find hip"-->|               |               |               |
  |               |--POST-------->|               |               |
  |               |               |--streamText-->|               |
  |               |               |               |--tool_call--->|
  |               |               |               |  searchCatalog |
  |               |               |               |<--results-----|
  |               |               |<-stream text--|               |
  |               |<-chunk--------|               |               |
  |<-UI update----|               |               |               |
  |               |<-chunk--------|               |               |
  |<-UI update----|               |               |               |
  |               |<-done---------|               |               |
  |<-final UI-----|               |               |               |
```

### Message Structure

**UIMessage (from Vercel AI SDK):**
```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  createdAt?: Date;
}

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool-searchCatalog'; input: {...}; output?: ProductSummary[]; state: ToolState }
  | { type: 'tool-webSearch'; input: {...}; output?: WebSearchResult[]; state: ToolState }
```

**Tool States:**
- `input-streaming`: Tool arguments being generated
- `input-available`: Arguments ready, execution pending
- `output-available`: Tool completed successfully
- `output-error`: Tool execution failed

---

## Streaming Pattern (VERIFIED)

### Route Handler vs Server Actions for Streaming

| Approach | Streaming | Tool Calling | Recommendation |
|----------|-----------|--------------|----------------|
| **Route Handler** | Native support via `toUIMessageStreamResponse()` | Full support | **Use this** |
| Server Action | Limited (experimental) | Limited | Not for chat |

**Source:** [Vercel AI SDK - Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) confirms Route Handlers as the standard pattern for streaming chat.

### Implementation: Route Handler

**`app/api/chat/route.ts`:**
```typescript
import { streamText, UIMessage, convertToModelMessages, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getProducts } from '@/lib/queries';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-3-flash-preview'),
    system: `You are a medical device catalog assistant for MedCatalog.
Help users find orthopedic implants, compare prices across vendors, and understand
product specifications. Always cite product names and SKUs in your responses.

When users ask about products:
- Use searchCatalog to find products by name, category, or specifications
- Use findSimilar to find alternative products
- Use comparePrices to show price comparisons across vendors

Be concise but thorough. Format responses for readability.`,
    messages: await convertToModelMessages(messages),
    tools: {
      searchCatalog: tool({
        description: 'Search the product catalog by name, category, vendor, or specifications',
        parameters: z.object({
          search: z.string().optional().describe('Text search query'),
          category: z.string().optional().describe('EMDN category ID'),
          vendor: z.string().optional().describe('Vendor ID'),
          ceMarked: z.boolean().optional().describe('Filter by CE marking'),
          mdrClass: z.enum(['I', 'IIa', 'IIb', 'III']).optional(),
          limit: z.number().default(5).describe('Max results to return'),
        }),
        execute: async (params) => {
          const { data } = await getProducts({
            search: params.search,
            category: params.category,
            vendor: params.vendor,
            ceMarked: params.ceMarked?.toString(),
            mdrClass: params.mdrClass,
            pageSize: params.limit,
          });
          // Return minimal projection to keep stream size small
          return data.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            vendor: p.vendor?.name,
            category: p.emdn_category?.name,
            ceMarked: p.ce_marked,
            mdrClass: p.mdr_class,
          }));
        },
      }),
      // Additional tools defined similarly...
    },
  });

  return result.toUIMessageStreamResponse();
}
```

---

## Tool Calling Pattern (VERIFIED)

### Tool Definition Schema

**Source:** [Google Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling) and [Vercel AI SDK Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)

The Vercel AI SDK abstracts Gemini's native function calling format, allowing Zod schemas directly:

```typescript
tools: {
  searchCatalog: tool({
    description: 'Search product catalog',
    parameters: z.object({
      search: z.string(),
      // ...
    }),
    execute: async (params) => {
      // Server-side execution - runs in Route Handler
      return results;
    },
  }),
}
```

### Tool Types for MedCatalog

| Tool | Description | Wraps | Input | Output |
|------|-------------|-------|-------|--------|
| `searchCatalog` | Query products by filters | `getProducts()` | search, category, vendor, etc. | `ProductSummary[]` |
| `findSimilar` | Find similar products | `findSimilarProducts()` | productId or name | `SimilarProduct[]` |
| `comparePrices` | Compare prices across vendors | `getProductPriceComparison()` | productId | `ProductPriceComparison[]` |
| `getCategoryInfo` | Explain EMDN category | `getEMDNCategories()` | categoryId or code | Category details |
| `webSearch` | Search external sources | External API | query | External results |

### Rendering Tool Results (Client Side)

```tsx
// In ChatMessage component
function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <div>
      {message.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <Markdown key={i}>{part.text}</Markdown>;

          case 'tool-searchCatalog':
            if (part.state === 'input-streaming') {
              return <div key={i} className="animate-pulse">Searching catalog...</div>;
            }
            if (part.state === 'output-error') {
              return <Alert key={i} variant="warning">Search failed. Try again.</Alert>;
            }
            if (part.state === 'output-available') {
              return <ProductTable key={i} products={part.output} />;
            }
            return null;

          case 'tool-webSearch':
            // Similar pattern for web search results
            break;
        }
        return null;
      })}
    </div>
  );
}
```

---

## Client Component Structure

### ChatWidget (Container)

```tsx
'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { ChatPanel } from './chat-panel';
import { ChatButton } from './chat-button';

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  const {
    messages,
    input,
    setInput,
    sendMessage,
    status,
    error,
  } = useChat({
    api: '/api/chat',
    id: 'medcatalog-chat', // Persists across component mounts
  });

  return (
    <>
      <ChatButton onClick={() => setOpen(true)} />
      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={() => sendMessage({ text: input })}
        status={status}
        error={error}
      />
    </>
  );
}
```

### Message State Management

The `useChat` hook manages all state internally:

| State | Type | Purpose |
|-------|------|---------|
| `messages` | `UIMessage[]` | Full conversation history |
| `input` | `string` | Current input field value |
| `status` | `'ready' \| 'submitted' \| 'streaming' \| 'error'` | Connection state |
| `error` | `Error \| undefined` | Latest error |

**No manual state management needed** - the hook handles streaming updates, message appending, and error recovery.

---

## Package Dependencies

### New Dependencies Required

```bash
npm install ai @ai-sdk/react @ai-sdk/google
```

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | `^4.x` | Core Vercel AI SDK (streamText, tool, types) |
| `@ai-sdk/react` | `^1.x` | useChat hook for React |
| `@ai-sdk/google` | `^1.x` | Gemini provider |

### Existing Dependencies (Compatible)

| Package | Status | Notes |
|---------|--------|-------|
| `@google/genai` ^1.39.0 | Keep | Still used for extraction features |
| `zod` ^4.3.6 | Compatible | Used for tool parameter schemas |
| `next` 16.1.6 | Compatible | Fully supports AI SDK streaming |
| `react` 19.2.3 | Compatible | AI SDK supports React 19 |

---

## Patterns to Follow

### Pattern 1: Typed Tool Parts

**What:** Define TypeScript types for each tool's input/output to get typed `parts`.

**When:** Always for type-safe message rendering.

```typescript
// types/chat.ts
export interface ProductSummary {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  vendor: string | null;
  category: string | null;
  ceMarked: boolean;
  mdrClass: string | null;
}

// Tool returns this type
execute: async (params): Promise<ProductSummary[]> => {
  // ...
}
```

### Pattern 2: Graceful Degradation for Tool States

**What:** Show fallback content when tools fail or stream slowly.

**When:** For all tool invocations.

```tsx
case 'tool-searchCatalog':
  if (part.state === 'input-streaming') {
    return <Skeleton variant="table" />;
  }
  if (part.state === 'output-error') {
    return <Alert variant="warning">Search failed. Try again.</Alert>;
  }
  if (part.state === 'output-available' && part.output?.length === 0) {
    return <div>No products found matching your criteria.</div>;
  }
  return <ProductTable products={part.output} />;
```

### Pattern 3: Minimal Tool Response Projections

**What:** Return only necessary fields from tools, not full database rows.

**When:** Always - keeps stream size small and responses fast.

```typescript
// Good: Minimal projection
return data.map(p => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  price: p.price,
  vendor: p.vendor?.name,
}));

// Bad: Full object with nested relations
return data; // Includes all fields, nested vendor, category objects
```

### Pattern 4: Streaming Throttle for Performance

**What:** Use `experimental_throttle` to batch UI updates if needed.

**When:** If re-renders cause performance issues during streaming.

```typescript
const { messages } = useChat({
  api: '/api/chat',
  experimental_throttle: 50, // Update UI max every 50ms
});
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server Actions for Streaming Chat

**What:** Using `"use server"` actions for chat responses.

**Why bad:** Server Actions don't support native streaming responses. You'd need polling or custom implementations.

**Instead:** Use Route Handlers with `toUIMessageStreamResponse()`.

### Anti-Pattern 2: Manual Message State Management

**What:** Managing messages with `useState` instead of `useChat`.

**Why bad:** Duplicates logic, misses streaming updates, breaks tool state management.

**Instead:** Let `useChat` own the message state. Use `setMessages` only for clearing/resetting.

### Anti-Pattern 3: Blocking Tool Execution

**What:** Running tools sequentially when they could parallelize.

**Why bad:** Slows response time.

**Instead:** Let Gemini handle tool orchestration. It supports parallel calls automatically.

### Anti-Pattern 4: Large Tool Responses

**What:** Returning full `ProductWithRelations[]` with all nested data.

**Why bad:** Bloats stream size, slows rendering, wastes bandwidth.

**Instead:** Return minimal projection with only display-needed fields.

### Anti-Pattern 5: Mixing Gemini Clients

**What:** Using `@google/genai` for chat features instead of AI SDK.

**Why bad:** No streaming protocol, no `useChat` integration, manual tool handling.

**Instead:** Use `@ai-sdk/google` for chat, keep `@google/genai` for extraction.

---

## Suggested Build Order

Based on dependencies and incremental validation:

### Phase 1: Streaming Foundation (2-3 hours)
1. Install AI SDK packages (`ai`, `@ai-sdk/react`, `@ai-sdk/google`)
2. Create `/api/chat/route.ts` with basic `streamText` (no tools yet)
3. Create minimal `ChatWidget` with `useChat` hook
4. Create basic `ChatPanel` and `ChatInput` components
5. **Verify:** Streaming text response works end-to-end

### Phase 2: Core Tool - Catalog Search (2-3 hours)
1. Add `searchCatalog` tool wrapping `getProducts()`
2. Define `ProductSummary` type for tool response
3. Create `ProductTable` component for rendering search results
4. Add tool state rendering (loading, error, results)
5. **Verify:** Natural language queries convert to catalog filters

### Phase 3: Additional Catalog Tools (2-3 hours)
1. Add `findSimilar` tool wrapping `findSimilarProducts()`
2. Add `comparePrices` tool wrapping `getProductPriceComparison()`
3. Add `getCategoryInfo` tool for EMDN explanations
4. Create corresponding result components
5. **Verify:** Multi-tool conversations work

### Phase 4: External Web Search (2-3 hours)
1. Choose and integrate web search API (Google Custom Search, Bing, or Tavily)
2. Add `webSearch` tool with external API call
3. Create `WebSearchResult` component
4. **Verify:** Chatbot can search for alternatives not in catalog

### Phase 5: UI Polish (2-3 hours)
1. Add typing indicators during streaming
2. Add message timestamps
3. Implement chat history persistence (localStorage initially)
4. Add i18n support matching existing `next-intl` setup
5. Add suggested prompts / quick actions
6. **Verify:** Full UX is polished and localized

---

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | Mitigation |
|---------|--------------|--------------|------------|
| Streaming connections | No issue | Consider Edge runtime | Deploy to Vercel Edge Functions |
| Tool execution | Supabase handles | Add caching | Redis cache for repeated queries |
| Message history | localStorage | DB persistence | Add `chat_sessions` table |
| Gemini API costs | ~$5/month | ~$500/month | Rate limit per user, caching |
| Concurrent requests | No issue | Queue system | Add Bull/BullMQ for heavy queries |

---

## Environment Variables

Add to existing `.env.local`:

```env
# Existing
GEMINI_API_KEY=...  # Used by @google/genai (extraction)

# New for AI SDK (same key works)
GOOGLE_GENERATIVE_AI_API_KEY=...  # Used by @ai-sdk/google (chat)

# Optional: Web search
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
```

---

## Sources

### HIGH Confidence (Official Documentation)
- [Vercel AI SDK - Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) - Streaming setup
- [Vercel AI SDK - useChat Hook](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) - Client-side state management
- [Vercel AI SDK - Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) - Tool rendering patterns
- [Vercel AI SDK - Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Gemini integration
- [Google Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling) - Native tool format
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) - Streaming responses

### MEDIUM Confidence (Verified Tutorials)
- [Using Vercel AI SDK with Google Gemini - DEV](https://dev.to/buildandcodewithraman/using-vercel-ai-sdk-with-google-gemini-complete-guide-5g68)
- [Real-time AI in Next.js - LogRocket](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/)
- [Full-Stack React.js Chat with AI SDK](https://www.robinwieruch.de/react-ai-sdk-chat/)

---

## Quality Gate Checklist

- [x] Integration points with existing components clearly identified
- [x] New vs modified components explicit
- [x] Streaming pattern for Next.js verified with official docs
- [x] Tool calling flow documented with code examples
- [x] Build order with dependencies specified
- [x] Anti-patterns documented to prevent common mistakes
