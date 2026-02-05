# Domain Pitfalls: Chatbot Interface for Product Search

**Domain:** Conversational AI chatbot for medical device catalog
**Researched:** 2026-02-05
**Confidence:** MEDIUM (verified with official docs and SDK patterns)

---

## Critical Pitfalls

Mistakes that cause rewrites or major user experience failures.

---

### Pitfall 1: Streaming Response Memory Leaks in Next.js

**What goes wrong:** SSE (Server-Sent Events) connections are not properly cleaned up when users navigate away, close the chat, or abort requests mid-stream. This causes memory leaks, connection pool exhaustion, and server instability under load.

**Why it happens:**
- Missing AbortController cleanup when component unmounts
- Not listening for `req.signal.abort` events on server routes
- Writers getting aborted but not fully closed, leaving streams in aborted state
- No heartbeat mechanism to detect stale connections

**Consequences:**
- `MaxListenersExceededWarning` memory leak warnings in production
- Connection pool exhaustion causing new users to fail
- Server crashes under moderate concurrent usage (100+ simultaneous chats)
- `ResponseAborted` unhandled rejection errors filling logs

**Warning signs:**
- Growing memory usage over time without correlation to active users
- Increasing number of open file descriptors/connections
- Intermittent failures on new chat sessions
- Console warnings about exceeded listener limits

**Prevention:**
```typescript
// Server-side: Always handle abort signals
export async function POST(req: Request) {
  const abortController = new AbortController();

  // Clean up when client disconnects
  req.signal.addEventListener('abort', () => {
    abortController.abort();
    // Close any open streams/writers
  });

  // Pass signal to Gemini SDK if supported
}

// Client-side: Cleanup on unmount
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

**Phase to address:** Phase 1 (Core streaming infrastructure)

**Sources:**
- [Next.js SSE Discussion #61972](https://github.com/vercel/next.js/discussions/61972)
- [Upstash SSE Streaming Guide](https://upstash.com/blog/sse-streaming-llm-responses)

---

### Pitfall 2: Gemini Parallel Function Call Response Ordering

**What goes wrong:** When Gemini returns multiple parallel function calls (e.g., searching products AND getting vendor details), the responses must be sent back together in the correct format. Interleaved or partial responses cause 400 errors.

**Why it happens:**
- Developer assumes function calls should be handled sequentially like single calls
- Results sent back one at a time as each completes
- Missing understanding that parallel calls require batch response

**Consequences:**
- 400 errors from Gemini API breaking the entire chat flow
- Lost conversation context requiring user to restart
- Intermittent failures that are hard to reproduce (depends on whether model chose parallel execution)

**Warning signs:**
- Sporadic 400 errors in chat that don't reproduce consistently
- Errors mentioning "function call" or "tool response" format
- Some queries work fine, others fail unpredictably

**Prevention:**
```typescript
// Wait for ALL parallel function calls to complete
const functionCalls = response.functionCalls(); // May be multiple

// Execute all in parallel
const results = await Promise.all(
  functionCalls.map(async (call) => ({
    name: call.name,
    response: await executeFunction(call.name, call.args),
  }))
);

// Send ALL results back together, not interleaved
const functionResponses = results.map((r) => ({
  functionResponse: { name: r.name, response: r.response },
}));

// Single call with all responses
await chat.sendMessage(functionResponses);
```

**Phase to address:** Phase 2 (Tool calling implementation)

**Sources:**
- [Gemini Function Calling Official Docs](https://ai.google.dev/gemini-api/docs/function-calling)
- [GoogleCloudPlatform Parallel Function Calling Example](https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/function-calling/parallel_function_calling.ipynb)

---

### Pitfall 3: Function Calling Mode Mismatch (AUTO vs ANY)

**What goes wrong:** Using `ANY` mode forces the model to always call a function, even when a natural language response would be appropriate. This creates awkward UX where simple questions trigger unnecessary tool calls.

**Why it happens:**
- Developer thinks `ANY` is "more reliable" than `AUTO`
- Misunderstanding that `ANY` means "use tools if needed" (it means "must use tools")
- Not testing conversational flows, only tool-using flows

**Consequences:**
- User asks "What is CE marking?" and chatbot calls `searchProducts` instead of explaining
- Infinite loops where function result causes another function call
- Unnatural conversation flow that frustrates users

**Warning signs:**
- Every user message triggers a tool call, even greetings
- High function call volume relative to actual searches
- User feedback about bot "not understanding simple questions"

**Prevention:**
```typescript
// Use AUTO mode (default) - model decides when to use tools
const config = {
  tools: [{ functionDeclarations }],
  toolConfig: {
    functionCallingConfig: {
      mode: "AUTO", // Not "ANY"
    },
  },
};

// Only use ANY mode for specific turn where tool MUST be used
// e.g., "Search for hip implants" -> mode: "ANY"
// vs. "What's the difference between cemented and uncemented?" -> mode: "AUTO"
```

**Phase to address:** Phase 2 (Tool calling implementation)

**Sources:**
- [Gemini Function Calling Modes](https://ai.google.dev/gemini-api/docs/function-calling)

---

### Pitfall 4: Context Window Exhaustion in Long Conversations

**What goes wrong:** Chat history accumulates tokens until it exceeds model limits or becomes too expensive. Naive truncation loses important early context (user preferences, product requirements).

**Why it happens:**
- No strategy for managing conversation history
- Treating chat like stateless request/response
- Including full tool responses (large product arrays) in history

**Consequences:**
- Conversations fail after 15-20 exchanges
- Bot "forgets" user preferences established early in conversation
- API costs spike as context grows
- Latency increases quadratically with context size

**Warning signs:**
- Token usage per request growing linearly with conversation length
- Errors about context length after extended conversations
- Bot asking questions user already answered
- Increasing response times for longer sessions

**Prevention:**
```typescript
// Implement sliding window with summary
interface ManagedHistory {
  systemPrompt: string;           // ~500 tokens (fixed)
  conversationSummary: string;    // ~200 tokens (rolling summary of old turns)
  recentMessages: Message[];      // ~2000 tokens (last 5-10 exchanges)
  currentToolContext: string;     // ~500 tokens (recent search results summary)
}

// Summarize tool results before adding to history
function summarizeToolResult(products: Product[]): string {
  return `Found ${products.length} products. Top results: ${
    products.slice(0, 3).map(p => p.name).join(', ')
  }`;
}

// Don't include full product arrays in chat history
```

**Phase to address:** Phase 3 (Context management)

**Sources:**
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [Google Gemini Context Windows](https://www.datastudios.org/post/google-gemini-context-window-token-limits-model-comparison-and-workflow-strategies-for-late-2025)

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

---

### Pitfall 5: Interactive Buttons Without State Synchronization

**What goes wrong:** Chat message buttons (e.g., "View Details", "Add to Compare") trigger actions but the button state doesn't reflect the action. Users click multiple times or lose track of what they selected.

**Why it happens:**
- Treating buttons as one-shot actions without feedback
- Button component doesn't update when action completes
- No loading states during async operations

**Consequences:**
- Users click "View Details" multiple times while loading
- No visual feedback that button was clicked
- Confusion about which products were selected

**Prevention:**
```typescript
interface ActionButton {
  id: string;
  label: string;
  action: string;
  productId: string;
  state: 'idle' | 'loading' | 'completed' | 'error';
}

// Update button state in message after action
function updateMessageButton(messageId: string, buttonId: string, newState: ButtonState) {
  setMessages(prev => prev.map(msg =>
    msg.id === messageId
      ? { ...msg, buttons: msg.buttons.map(b =>
          b.id === buttonId ? { ...b, state: newState } : b
        )}
      : msg
  ));
}
```

**Phase to address:** Phase 4 (Interactive UI components)

---

### Pitfall 6: Existing Gemini Client Conflict

**What goes wrong:** The project already has a Gemini client singleton (`lib/gemini/client.ts`) for extraction. Creating a separate client for chat causes API key management issues and inconsistent configuration.

**Why it happens:**
- Not reviewing existing code before implementing chat
- Different team members working on extraction vs chat
- Copy-pasting Gemini setup from tutorials

**Consequences:**
- Two API key configurations to maintain
- Inconsistent model versions between features
- Confusion about which client to use where
- Double initialization overhead

**Prevention:**
```typescript
// Extend existing client.ts rather than creating new
// lib/gemini/client.ts
export const CHAT_MODEL = "gemini-3-flash-preview"; // Same or different from extraction

// lib/gemini/chat.ts
import { getAIClient } from "./client";

export function createChatSession(history?: Content[]) {
  const ai = getAIClient(); // Reuse singleton
  return ai.chats.create({
    model: CHAT_MODEL,
    history,
    // chat-specific config
  });
}
```

**Phase to address:** Phase 1 (Architecture planning)

---

### Pitfall 7: Floating Widget Z-Index Wars

**What goes wrong:** Chat widget appears behind modals, dropdowns, or other positioned elements. Or it blocks critical UI elements when open.

**Why it happens:**
- Using arbitrary z-index values (9999) without a system
- Not accounting for Radix UI portal z-indexes
- Widget position conflicts with existing sticky/fixed elements

**Consequences:**
- Chat hidden behind extraction modal
- Chat blocking filter sidebar interactions
- Visual glitches on mobile when keyboard appears

**Warning signs:**
- QA reports "chat disappeared" in certain flows
- Users can't close chat because close button is hidden
- Clicking chat area triggers underlying elements

**Prevention:**
```typescript
// Establish z-index scale consistent with existing Radix components
const Z_INDEX = {
  dropdown: 50,
  modal: 100,      // Radix Dialog default
  chatWidget: 80,  // Below modals, above content
  chatPopover: 85,
  toast: 110,      // Above everything
};

// Use Radix Portal for proper stacking context
<Portal>
  <div style={{ zIndex: Z_INDEX.chatWidget }}>
    <ChatWidget />
  </div>
</Portal>
```

**Phase to address:** Phase 4 (UI implementation)

**Sources:**
- [Floating UI Documentation](https://floating-ui.com/docs/misc)

---

### Pitfall 8: Circuit Breaker Tripping from Chat Queries

**What goes wrong:** The existing circuit breaker (50 req/10s) trips during normal chat usage because each tool call queries the database.

**Why it happens:**
- Circuit breaker designed for page-level rate limiting
- Chat generates rapid successive queries (search, filter, search again)
- Tool execution bypasses expected request patterns

**Consequences:**
- Users locked out mid-conversation for 30 seconds
- Confusing error messages about "too many requests"
- Chat feels broken when circuit trips

**Warning signs:**
- CircuitBreakerError appearing in chat-related logs
- Users reporting "Please wait 30s" errors during chat
- Chat working fine with single queries, failing with follow-ups

**Prevention:**
```typescript
// Option 1: Higher limits for chat context
const CHAT_CIRCUIT_CONFIG = {
  maxRequests: 100,  // Higher for chat
  windowMs: 10_000,
  cooldownMs: 15_000,
};

// Option 2: Separate circuit for chat
function chatQueryWithCircuit<T>(queryFn: () => Promise<T>): Promise<T> {
  checkCircuit(CHAT_CIRCUIT_CONFIG);
  return queryFn();
}

// Option 3: Debounce/batch chat queries
const debouncedSearch = useDebouncedCallback(
  (query: string) => searchProducts(query),
  300
);
```

**Phase to address:** Phase 2 (Integration with existing infrastructure)

---

### Pitfall 9: Tool Schema Drift from Database Schema

**What goes wrong:** Function declarations for Gemini define parameter types that don't match actual database query capabilities. Model requests filters that don't exist or uses wrong field names.

**Why it happens:**
- Tool schemas written based on "ideal" API, not actual queries.ts
- Database schema evolves but tool schemas don't update
- Different naming conventions (camelCase vs snake_case)

**Consequences:**
- Model passes `vendorId` but query expects `vendor`
- Model requests `priceRange` filter that doesn't exist
- Silent failures where invalid filters are ignored

**Prevention:**
```typescript
// Derive tool schemas from actual query interface
import type { GetProductsParams } from "@/lib/queries";

// Generate function declaration from TypeScript types
const searchProductsDeclaration = {
  name: "searchProducts",
  description: "Search the medical device catalog",
  parameters: {
    type: "object",
    properties: {
      search: { type: "string", description: "Text search query" },
      vendor: { type: "string", description: "Comma-separated vendor IDs" },
      category: { type: "string", description: "EMDN category ID (includes descendants)" },
      // ... mirror GetProductsParams exactly
    },
  },
};

// Add integration test that validates schema alignment
```

**Phase to address:** Phase 2 (Tool implementation)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

---

### Pitfall 10: Missing Typing Indicators

**What goes wrong:** No visual feedback during AI response generation. Users don't know if the bot is working or frozen.

**Why it happens:** Focus on streaming text display, forgetting the state before first token arrives.

**Prevention:**
- Show typing indicator immediately on send
- Replace with streaming text once first token arrives
- Different indicator for "thinking" vs "searching catalog"

**Phase to address:** Phase 4 (UI polish)

---

### Pitfall 11: No Graceful Degradation for API Failures

**What goes wrong:** Gemini API timeout or error shows raw error message or crashes the widget.

**Prevention:**
```typescript
const FALLBACK_RESPONSES = {
  timeout: "I'm taking longer than expected. Would you like to try a simpler search?",
  rateLimit: "I'm receiving many requests right now. Please try again in a moment.",
  unknown: "Something went wrong. You can still use the search filters in the sidebar.",
};
```

**Phase to address:** Phase 3 (Error handling)

---

### Pitfall 12: Hardcoded English in Tool Responses

**What goes wrong:** Project uses next-intl for i18n but tool responses and chat prompts are hardcoded in English.

**Why it happens:** System prompts and function descriptions written in English, not considering existing i18n setup.

**Prevention:**
- Use translation keys in system prompts
- Include user's locale in chat context
- Translate product field labels in responses

**Phase to address:** Phase 5 (Polish and i18n)

---

### Pitfall 13: Over-Returning Product Data

**What goes wrong:** Tool function returns entire ProductWithRelations objects when chat only needs name, SKU, and price. Wastes tokens and exposes unnecessary data.

**Prevention:**
```typescript
// Don't return this to chat
type ProductWithRelations = { /* 20+ fields */ };

// Return this instead
interface ChatProductSummary {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  vendor_name: string;
  emdn_category: string;
}

function formatForChat(products: ProductWithRelations[]): ChatProductSummary[] {
  return products.slice(0, 10).map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    vendor_name: p.vendor?.name ?? 'Unknown',
    emdn_category: p.emdn_category?.code ?? 'Uncategorized',
  }));
}
```

**Phase to address:** Phase 2 (Tool implementation)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|----------------|------------|
| 1. Streaming Infrastructure | Memory leaks, connection cleanup | Test with rapid open/close cycles |
| 2. Tool Calling | Parallel response ordering, schema drift | Match schemas to queries.ts exactly |
| 3. Conversation Management | Context exhaustion, bot amnesia | Implement summarization early |
| 4. Interactive UI | Z-index conflicts, button state sync | Use Radix Portal, explicit state management |
| 5. Integration | Circuit breaker trips, API conflicts | Extend existing patterns, don't duplicate |

---

## Integration Considerations

### Existing Gemini Usage
The project already uses `@google/genai` v1.39.0 with `gemini-3-flash-preview` model for extraction. Key integration points:
- Reuse `getAIClient()` singleton from `lib/gemini/client.ts`
- Maintain consistent model versions across features
- Leverage existing Zod schema patterns for chat responses

### Existing Circuit Breaker
The `lib/supabase/circuit-breaker.ts` protects against infinite loops. Chat tools will need either:
- Higher thresholds for chat context
- Separate circuit with chat-appropriate limits
- Query batching to reduce request count

### Existing Query Patterns
The `lib/queries.ts` module provides `getProducts()` with comprehensive filtering. Tool declarations should exactly mirror `GetProductsParams` interface to avoid schema drift.

---

## Sources

### Official Documentation
- [Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling) - HIGH confidence
- [Firebase AI Logic Streaming](https://firebase.google.com/docs/ai-logic/stream-responses) - HIGH confidence
- [Floating UI Documentation](https://floating-ui.com/docs/misc) - HIGH confidence

### Community Resources
- [Next.js SSE Discussions](https://github.com/vercel/next.js/discussions/48427) - MEDIUM confidence
- [Context Window Management](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - MEDIUM confidence
- [LLM Rich Content Best Practices](https://www.twilio.com/en-us/blog/developers/best-practices/llm-rich-content-messages-tips) - MEDIUM confidence
- [Vercel AI SDK Streaming Guide](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/) - MEDIUM confidence

### Model Deprecation Notice
**IMPORTANT:** Gemini 2.0 Flash and Flash-Lite models will be retired on March 3, 2026. If the project is using `gemini-2.0-flash`, plan migration to `gemini-2.5-flash` or `gemini-3-flash-preview` before that date.

---

*Chatbot pitfalls research for: MedCatalog Medical Device Catalog*
*Researched: 2026-02-05*
