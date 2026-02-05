# Project Research Summary

**Project:** MedCatalog v1.2 Chatbot Interface
**Domain:** Conversational AI for Medical Device Product Search
**Researched:** 2026-02-05
**Confidence:** MEDIUM-HIGH

## Executive Summary

MedCatalog v1.2 adds a floating chatbot widget that enables natural language queries against the existing orthopedic medical device catalog, with Gemini-powered web search for discovering EU market alternatives not in the database. The recommended approach uses **Vercel AI SDK** (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) rather than extending the existing `@google/genai` extraction client. This separation is deliberate: the AI SDK provides streaming protocol, React hooks (`useChat`), and tool calling abstractions that would require 60% more boilerplate to implement manually. The existing extraction pipeline remains untouched.

The architecture leverages existing infrastructure extensively. Tool functions wrap `getProducts()`, `findSimilarProducts()`, and `getProductPriceComparison()` directly. The chat widget integrates into `CatalogClient` as a floating panel. The read-only design (no mutations) keeps scope manageable while delivering the core differentiators: inline price comparison tables, interactive quick-action buttons, and web-grounded alternative discovery.

Key risks center on streaming infrastructure reliability and tool calling correctness. SSE connection cleanup is critical -- memory leaks from unaborted streams under rapid open/close cycles can crash production servers. Gemini's parallel function call response ordering requires careful handling: results must be batched, not sent piecemeal. The existing circuit breaker (50 req/10s) may trip during normal chat usage, requiring either higher limits for chat context or a separate circuit.

---

## Key Findings

### Recommended Stack Additions

The chatbot requires 5 new npm packages while reusing existing infrastructure (Supabase, Radix UI, TanStack Table patterns, Tailwind).

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `ai` | 6.0.x | Vercel AI SDK core | `streamText`, `UIMessage`, streaming protocol |
| `@ai-sdk/react` | 3.0.x | React hooks | `useChat` manages messages, streaming state, tool calls |
| `@ai-sdk/google` | 3.0.x | Gemini provider | Unified API with built-in Google Search grounding |
| `react-markdown` | 9.x | Markdown rendering | Renders AI responses with proper formatting |
| `remark-gfm` | 4.x | GFM support | Enables tables in chat responses |

**Estimated bundle impact:** ~45KB gzipped (AI SDK is tree-shakeable)

**What NOT to add:**
- LangChain (overkill for single-model chat)
- assistant-ui (adds persistence complexity not needed)
- WebSocket transport (SSE is sufficient)
- Separate chat database (messages are ephemeral)

### Expected Features

**Must Have (Table Stakes):**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Natural language product search | MEDIUM | Translate NL to existing filter params |
| Show search results as cards | LOW | Reuse product data structure |
| Filter by category/vendor/price | LOW | Wraps existing `getProducts()` |
| Suggested starter prompts | LOW | 3-5 examples visible on open |
| Quick action buttons | LOW | "Compare prices", "Show more", "Filter by vendor" |
| Conversation context | MEDIUM | Track current filters, last search |
| Inline price comparison tables | MEDIUM | Leverages existing `getProductPriceComparison()` RPC |

**Should Have (Differentiators):**

| Feature | Complexity | Notes |
|---------|------------|-------|
| "Find alternatives" via web search | HIGH | Google Search grounding via Gemini |
| EMDN category suggestions | MEDIUM | When query is ambiguous, suggest relevant categories |
| "Open in catalog" button | LOW | Apply chat-defined filters to main view |
| Interactive product cards | MEDIUM | Rich cards with action buttons |

**Defer to v1.3+:**
- Voice input (nice-to-have, not blocking)
- Multi-product comparison widget (complex UI)
- Chat history persistence (adds storage complexity)
- Full-page chat replacement (chat supplements, doesn't replace catalog)

### Architecture Approach

The chatbot integrates into the existing Next.js 16 App Router architecture using a **Route Handler** (`/api/chat/route.ts`) for streaming, the **Vercel AI SDK** for unified streaming and tool calling, and **client components** with the `useChat` hook for real-time UI updates.

**Component Structure:**

```
page.tsx (Server Component)
  +-- CatalogClient (Client)
        +-- DataTable, FilterSidebar (existing)
        +-- ChatWidget (NEW)
              +-- ChatButton (floating trigger)
              +-- ChatPanel (slide-out)
                    +-- MessageList
                    +-- ChatInput
```

**Integration Points:**

| Existing Component | Chat Usage |
|-------------------|------------|
| `getProducts()` | Wrapped by `searchCatalog` tool |
| `findSimilarProducts()` | Wrapped by `findSimilar` tool |
| `getProductPriceComparison()` | Wrapped by `comparePrices` tool |
| `ProductWithRelations` type | Used in tool response formatting |
| Radix UI Dialog | Chat widget container |
| TanStack Table patterns | Inline comparison tables |

**New Routes:**
- `/api/chat` - Streaming chat endpoint

**New Components:**
- `components/chat/chat-widget.tsx` - Container with open/close state
- `components/chat/chat-panel.tsx` - Slide-out panel
- `components/chat/chat-message.tsx` - Renders based on `parts` type
- `components/chat/chat-input.tsx` - Input with send button
- `components/chat/tool-results/product-card.tsx` - Single product display
- `components/chat/tool-results/product-table.tsx` - Product list display

### Critical Pitfalls

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 1 | **SSE Memory Leaks** - Unclean connection cleanup causes memory exhaustion under load | Handle `req.signal.abort` on server, cleanup `AbortController` on client unmount | Phase 1 |
| 2 | **Parallel Function Call Ordering** - Gemini parallel tool calls require batched responses, not piecemeal | Use `Promise.all()` to execute all calls, send results together | Phase 2 |
| 3 | **Function Calling Mode Mismatch** - `ANY` mode forces tool calls even for simple questions | Use `AUTO` mode (default) to let model decide when tools are needed | Phase 2 |
| 4 | **Context Window Exhaustion** - Chat history accumulates until limits or costs explode | Implement sliding window with summarization, don't include full tool responses in history | Phase 3 |
| 5 | **Circuit Breaker Trips** - Existing 50 req/10s limit may trip during normal chat usage | Higher limits for chat context, or separate circuit with chat-appropriate thresholds | Phase 2 |

**Additional Moderate Pitfalls:**
- Tool schema drift from database schema (match `GetProductsParams` exactly)
- Z-index conflicts with existing modals (use Radix Portal, establish z-index scale)
- Existing Gemini client conflict (extend `lib/gemini/client.ts`, don't duplicate)

---

## Implications for Roadmap

Based on dependencies discovered in research, the chatbot milestone naturally decomposes into 5 sequential phases:

### Phase 1: Streaming Foundation
**Rationale:** Core infrastructure must work before any features. Streaming reliability is the foundation for everything else.
**Delivers:** Basic chat widget with streaming text responses (no tools yet)
**Addresses:** Table stakes (chat widget, basic conversation)
**Avoids:** SSE Memory Leaks (Pitfall 1) by implementing proper cleanup from the start
**Estimated effort:** 2-3 hours

**Components:**
- Install AI SDK packages
- `/api/chat/route.ts` with basic `streamText`
- `ChatWidget` with `useChat` hook
- `ChatPanel` and `ChatInput` components
- AbortController cleanup on both client and server

### Phase 2: Catalog Search Tools
**Rationale:** Core value proposition - natural language queries against the catalog. Builds on streaming foundation.
**Delivers:** NL-to-filter translation via Gemini tool calling
**Uses:** `getProducts()`, `findSimilarProducts()`, `getProductPriceComparison()` wrapped as tools
**Implements:** Tool execution pattern with typed responses
**Avoids:** Parallel Function Call Ordering (Pitfall 2), Mode Mismatch (Pitfall 3), Schema Drift (Pitfall 9)
**Estimated effort:** 2-3 hours

**Tools to implement:**
- `searchCatalog` - wraps `getProducts()`
- `findSimilar` - wraps `findSimilarProducts()`
- `comparePrices` - wraps `getProductPriceComparison()`
- `getCategoryInfo` - explains EMDN categories

**Circuit breaker consideration:** May need adjustment for chat query patterns.

### Phase 3: Context and Error Handling
**Rationale:** Conversations need to maintain context without exhausting token limits. Error handling is critical for production reliability.
**Delivers:** Conversation memory, graceful degradation, error recovery
**Addresses:** Conversation context (table stake), long conversation support
**Avoids:** Context Window Exhaustion (Pitfall 4), API failures (Pitfall 11)
**Estimated effort:** 2-3 hours

**Key patterns:**
- Sliding window with summarization
- Tool result summarization before adding to history
- Fallback responses for timeout, rate limit, unknown errors

### Phase 4: External Web Search
**Rationale:** Key differentiator - find EU market alternatives not in catalog. Requires working chat and tools first.
**Delivers:** "Find alternatives" capability via Gemini Google Search grounding
**Uses:** `google.tools.googleSearch()` from `@ai-sdk/google`
**Addresses:** "Find alternatives" (differentiator)
**Estimated effort:** 2-3 hours

**Considerations:**
- Grounding results include source citations
- Must clearly label as "external suggestions" not catalog data
- Compliance disclaimer for medical device context

### Phase 5: UI Polish and Integration
**Rationale:** Polish after core functionality works. i18n last because it touches all user-facing strings.
**Delivers:** Production-ready UX, localization, visual polish
**Addresses:** Quick action buttons, suggested prompts, "Open in catalog"
**Avoids:** Z-index Wars (Pitfall 7), Hardcoded English (Pitfall 12)
**Estimated effort:** 2-3 hours

**Polish items:**
- Typing indicators during streaming
- Message timestamps
- Suggested starter prompts
- Quick action buttons after responses
- i18n via existing `next-intl` setup
- Z-index scale consistent with Radix components

### Phase Ordering Rationale

1. **Streaming before tools:** Tools depend on streaming infrastructure. If streaming leaks memory, tools won't matter.
2. **Catalog tools before web search:** Internal catalog search is table stakes. Web search is a differentiator that builds on established patterns.
3. **Context management before polish:** Long conversations will fail without context management. Better to have working but ugly than polished but broken.
4. **i18n last:** Touches all user-facing strings; easier to localize when strings are finalized.

### Research Flags

**Phases needing attention during implementation:**

| Phase | Flag | Reason |
|-------|------|--------|
| Phase 1 | VERIFY | AbortController cleanup patterns - test with rapid open/close cycles |
| Phase 2 | VERIFY | Parallel tool response batching - test with queries that trigger multiple tools |
| Phase 4 | VERIFY | Google Search grounding response format - confirm citation handling |

**Phases with standard patterns (lower risk):**

| Phase | Reason |
|-------|--------|
| Phase 3 | Context windowing is well-documented pattern |
| Phase 5 | UI polish uses existing Radix/Tailwind patterns |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs verified, Feb 2026 releases confirmed |
| Features | MEDIUM | Industry patterns established, some chatbot UX is speculative |
| Architecture | HIGH | Verified with Vercel AI SDK docs, matches Next.js 16 patterns |
| Pitfalls | MEDIUM-HIGH | Mix of official docs and community resources |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

| Gap | How to Handle |
|-----|---------------|
| Exact Google Search grounding response shape | Verify during Phase 4 implementation with test queries |
| Circuit breaker threshold for chat | Measure during Phase 2, adjust based on actual query patterns |
| Tool response size limits | Test with large product result sets in Phase 2 |
| Mobile UX for floating widget | Defer to post-launch unless issues arise during testing |

---

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6) - Major version features
- [AI SDK Getting Started](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) - Next.js App Router setup
- [AI SDK Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Google Search grounding syntax
- [Gemini API Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search) - Grounding metadata structure
- [Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling) - Tool calling patterns
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) - Streaming responses

### Secondary (MEDIUM confidence)
- [Chatbot UX Design Guide](https://www.parallelhq.com/blog/chatbot-ux-design) - UX patterns
- [NN/g Prompt Controls](https://www.nngroup.com/articles/prompt-controls-genai/) - Quick action button patterns
- [Context Window Management](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - Sliding window strategies
- [Next.js SSE Discussion #61972](https://github.com/vercel/next.js/discussions/61972) - Connection cleanup patterns

### Existing Codebase (HIGH confidence)
- `src/lib/queries.ts` - Product query infrastructure with filters
- `src/lib/actions/similarity.ts` - Price comparison and similarity search RPC
- `src/lib/schemas/product.ts` - Product data structure
- `src/lib/gemini/client.ts` - Existing Gemini client pattern
- `src/lib/supabase/circuit-breaker.ts` - Rate limiting pattern

---

**Model Deprecation Notice:** Gemini 2.0 Flash and Flash-Lite will be retired March 3, 2026. Use `gemini-2.5-flash` or `gemini-3-flash-preview` for this milestone.

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
