# Phase 9: Catalog Search Tools - Research

**Researched:** 2026-02-05
**Domain:** Vercel AI SDK Tool Calling for Product Search
**Confidence:** HIGH

## Summary

This phase adds tool calling to the existing Phase 8 chat widget, enabling natural language product search, price comparison, and EMDN category suggestions. The Vercel AI SDK (already installed: `ai@6.0.71`, `@ai-sdk/react@3.0.73`, `@ai-sdk/google@3.0.21`) provides comprehensive tool calling support via `streamText` with `tools` parameter and client-side rendering through typed message parts.

The existing codebase has three server-side functions ready to be wrapped as tools: `getProducts()` in `lib/queries.ts`, `findSimilarProducts()` and `getProductPriceComparison()` in `lib/actions/similarity.ts`. These handle all database queries; tools should be thin wrappers that translate natural language parameters to function calls, not duplicate logic.

**Primary recommendation:** Define three tools (`searchProducts`, `comparePrices`, `suggestCategories`) in the existing `/api/chat/route.ts`, enable multi-step execution with `stopWhen: stepCountIs(3)`, and render custom ProductCard/ComparisonTable components based on `part.type === "tool-searchProducts"` etc. in the message parts.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | 6.0.71 | `streamText` with `tools`, `stopWhen` for multi-step | Official Vercel AI SDK |
| `@ai-sdk/react` | 3.0.73 | `useChat` with typed message parts for tool rendering | Official React bindings |
| `@ai-sdk/google` | 3.0.21 | Gemini provider, tool calling support | Official provider |
| `zod` | 4.3.6 | Tool `inputSchema` definitions with `.describe()` | Already in project |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-markdown` | 10.1.0 | Markdown in assistant text responses | Text parts of messages |
| `remark-gfm` | 4.0.1 | Tables in markdown responses | When AI generates tables directly |
| `lucide-react` | 0.563.0 | Icons for product cards, buttons | UI components |
| `motion` | 12.29.3 | Card expand/collapse animations | Product card details toggle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom tool rendering | AI Elements library | AI Elements adds dependencies; custom is sufficient for 3 tools |
| Server-side tools | Client-side tools with `addToolOutput` | Server-side is simpler for read-only operations |
| Separate API routes per tool | Single `/api/chat` with tools | Single route is cleaner, tools auto-execute |

**No new installations required.** All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── chat/
│           └── route.ts        # Add tools parameter to existing route
├── components/
│   └── chat/
│       ├── chat-widget.tsx     # Existing (no changes needed)
│       ├── chat-panel.tsx      # Update to pass tool rendering to MessageList
│       ├── message-list.tsx    # Update to render tool parts
│       ├── message-bubble.tsx  # Existing markdown rendering (minimal changes)
│       ├── product-card.tsx    # NEW: Compact product card component
│       ├── product-card-expanded.tsx  # NEW: Expanded product details
│       ├── comparison-table.tsx  # NEW: Price comparison table
│       └── category-chips.tsx  # NEW: EMDN category suggestion buttons
└── lib/
    └── chat/
        ├── constants.ts        # Update SYSTEM_PROMPT for tool awareness
        └── tools.ts            # NEW: Tool definitions with Zod schemas
```

### Pattern 1: Server-Side Tool Definitions
**What:** Define tools in the API route with execute functions that wrap existing queries
**When to use:** Always for read-only operations like search/comparison
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
// src/lib/chat/tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { getProducts } from '@/lib/queries';
import { getProductPriceComparison, findSimilarProducts } from '@/lib/actions/similarity';

export const searchProducts = tool({
  description: 'Search the product catalog for medical devices. Use when user asks to find, show, or search for products.',
  inputSchema: z.object({
    query: z.string().describe('Natural language search term (e.g., "titanium knee implants")'),
    category: z.string().optional().describe('EMDN category ID to filter by'),
    vendor: z.string().optional().describe('Vendor ID to filter by'),
    material: z.string().optional().describe('Material ID to filter by (e.g., titanium, PEEK)'),
    minPrice: z.number().optional().describe('Minimum price in EUR'),
    maxPrice: z.number().optional().describe('Maximum price in EUR'),
    limit: z.number().default(5).describe('Number of results to return (default 5)'),
  }),
  execute: async ({ query, category, vendor, material, minPrice, maxPrice, limit }) => {
    const result = await getProducts({
      search: query,
      category,
      vendor,
      material,
      minPrice,
      maxPrice,
      pageSize: limit,
    });
    return {
      products: result.data,
      totalCount: result.count,
      showing: result.data.length,
    };
  },
});

export const comparePrices = tool({
  description: 'Compare prices for a product across different vendors. Use when user asks to compare prices or see vendor pricing.',
  inputSchema: z.object({
    productId: z.string().describe('UUID of the product to compare'),
  }),
  execute: async ({ productId }) => {
    const result = await getProductPriceComparison(productId);
    if (!result.success) {
      return { error: result.error, products: [] };
    }
    return {
      products: result.data || [],
      count: result.data?.length || 0,
    };
  },
});

export const suggestCategories = tool({
  description: 'Suggest EMDN categories when user query is ambiguous or broad. Use to help narrow down search.',
  inputSchema: z.object({
    query: z.string().describe('The ambiguous or broad search term'),
  }),
  execute: async ({ query }) => {
    // This tool returns category suggestions based on the query
    // The AI will use these to offer refinement options
    const result = await getProducts({
      search: query,
      pageSize: 50, // Get enough to analyze category distribution
    });

    // Extract unique categories from results
    const categoryMap = new Map<string, { id: string; code: string; name: string; count: number }>();
    result.data.forEach(product => {
      if (product.emdn_category) {
        const cat = product.emdn_category;
        const existing = categoryMap.get(cat.id);
        if (existing) {
          existing.count++;
        } else {
          categoryMap.set(cat.id, { id: cat.id, code: cat.code, name: cat.name, count: 1 });
        }
      }
    });

    // Sort by count descending, take top 5
    const suggestions = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      suggestions,
      totalProducts: result.count,
    };
  },
});
```

### Pattern 2: Multi-Step Tool Execution
**What:** Enable AI to call multiple tools and synthesize results
**When to use:** For queries like "find titanium implants and compare prices for the cheapest"
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
// src/app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { SYSTEM_PROMPT, CHAT_MODEL } from '@/lib/chat/constants';
import { searchProducts, comparePrices, suggestCategories } from '@/lib/chat/tools';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(CHAT_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      searchProducts,
      comparePrices,
      suggestCategories,
    },
    stopWhen: stepCountIs(3), // Allow up to 3 steps for complex queries
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
```

### Pattern 3: Typed Tool Part Rendering
**What:** Render custom components based on tool type in message parts
**When to use:** Always for tool results display
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
// In message-list.tsx or message rendering component
{message.parts?.map((part, i) => {
  switch (part.type) {
    case 'text':
      return <MarkdownContent key={i} content={part.text} />;

    case 'tool-searchProducts':
      if (part.state === 'output-available' && part.output) {
        return (
          <ProductResults
            key={part.toolCallId}
            products={part.output.products}
            totalCount={part.output.totalCount}
            showing={part.output.showing}
          />
        );
      }
      return <LoadingSpinner key={part.toolCallId} text="Searching catalog..." />;

    case 'tool-comparePrices':
      if (part.state === 'output-available' && part.output) {
        return (
          <ComparisonTable
            key={part.toolCallId}
            products={part.output.products}
          />
        );
      }
      return <LoadingSpinner key={part.toolCallId} text="Comparing prices..." />;

    case 'tool-suggestCategories':
      if (part.state === 'output-available' && part.output) {
        return (
          <CategoryChips
            key={part.toolCallId}
            suggestions={part.output.suggestions}
            onSelect={(categoryId) => {
              // Send new message with category filter
              sendMessage({ text: `Search in category ${categoryId}` });
            }}
          />
        );
      }
      return <LoadingSpinner key={part.toolCallId} text="Finding categories..." />;

    default:
      return null;
  }
})}
```

### Pattern 4: Clickable Action Buttons on Cards
**What:** Product cards with "Compare prices" and "View in catalog" buttons
**When to use:** For all product card results
**Example:**
```typescript
// Source: Community pattern, verified approach
interface ProductCardProps {
  product: ProductWithRelations;
  onCompare: (productId: string) => void;
  onViewInCatalog: (productId: string) => void;
}

export function ProductCard({ product, onCompare, onViewInCatalog }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="border rounded-lg p-3 mb-2"
      layout
    >
      {/* Compact view */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-sm">{product.name}</h4>
          <p className="text-xs text-muted-foreground">
            {product.vendor?.name} - {formatPrice(product.price)}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-muted rounded"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t"
          >
            <dl className="text-xs space-y-1">
              <div><dt className="inline font-medium">SKU:</dt> <dd className="inline">{product.sku}</dd></div>
              <div><dt className="inline font-medium">Material:</dt> <dd className="inline">{product.material?.name || 'N/A'}</dd></div>
              <div><dt className="inline font-medium">EMDN:</dt> <dd className="inline">{product.emdn_category?.code || 'N/A'}</dd></div>
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onCompare(product.id)}
          className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded"
        >
          Compare prices
        </button>
        <button
          onClick={() => onViewInCatalog(product.id)}
          className="text-xs px-2 py-1 bg-accent text-accent-foreground hover:bg-green-hover rounded"
        >
          View in catalog
        </button>
      </div>
    </motion.div>
  );
}
```

### Anti-Patterns to Avoid
- **Duplicating query logic in tools:** Tools should call `getProducts()`, not write new Supabase queries
- **Client-side tools for database operations:** Use server-side tools with `execute` for all DB access
- **Generic tool UI for all states:** Show custom LoadingSpinner during tool execution, not debug output
- **Hardcoding tool names in switch:** Use `part.type.startsWith('tool-')` for future extensibility
- **Ignoring `part.state`:** Always check state before rendering; `input-streaming` and errors need different UI

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool parameter validation | Manual type checking | Zod schema in `inputSchema` | Auto-validates, provides descriptions to LLM |
| Tool result streaming | Custom SSE handling | `toUIMessageStreamResponse()` | Handles partial chunks, encoding |
| Multi-step tool chaining | Manual conversation loops | `stopWhen: stepCountIs(n)` | Built-in step management |
| Price comparison data | New Supabase query | `getProductPriceComparison()` | Already handles similarity matching |
| Product search with filters | New query builder | `getProducts()` | Already supports all filter types |
| Category tree traversal | Recursive queries | `get_category_descendants` RPC | Database-side efficiency |

**Key insight:** The existing `lib/queries.ts` and `lib/actions/similarity.ts` already implement the complex logic. Tools are wrappers that map natural language parameters to function calls.

## Common Pitfalls

### Pitfall 1: Not Passing Abort Signal to Tools
**What goes wrong:** Tool execution continues after user stops generation
**Why it happens:** `streamText` abort doesn't automatically propagate to `execute` functions
**How to avoid:** Pass abort signal through to long-running operations if needed (our tools are fast, less critical)
**Warning signs:** Server processes continue after "Stop" clicked

### Pitfall 2: Rendering Tool Parts Before Output Available
**What goes wrong:** Crash or undefined errors when accessing `part.output`
**Why it happens:** Part exists in `input-streaming` or `input-available` states without output
**How to avoid:** Always check `part.state === 'output-available'` before accessing `part.output`
**Warning signs:** "Cannot read property of undefined" errors

### Pitfall 3: Vague Tool Descriptions
**What goes wrong:** LLM picks wrong tool or doesn't call tools when it should
**Why it happens:** Tool description doesn't clearly explain when to use it
**How to avoid:** Use action verbs: "Search the catalog when user asks to find/show/search products"
**Warning signs:** User asks "find implants" but AI responds without calling searchProducts

### Pitfall 4: Missing Parameter Descriptions
**What goes wrong:** LLM provides wrong values or omits optional parameters
**Why it happens:** LLM doesn't know what format the parameter expects
**How to avoid:** Use `.describe()` on every Zod field: `z.string().describe('EMDN category ID')`
**Warning signs:** LLM passes category name instead of ID, or price as string

### Pitfall 5: Ignoring No-Results Case
**What goes wrong:** Empty product cards render, confusing UX
**Why it happens:** Component doesn't check if `products.length === 0`
**How to avoid:** Render "No results found" message with search suggestions
**Warning signs:** Blank space where results should appear

### Pitfall 6: Treating Single-Vendor as Table
**What goes wrong:** Comparison table with one row looks silly
**Why it happens:** Same component for all comparison results
**How to avoid:** Per CONTEXT.md: Single vendor shows as text "Available from [Vendor] at [Price]"
**Warning signs:** Table with header row and single data row

## Code Examples

Verified patterns from official sources:

### Updated System Prompt
```typescript
// src/lib/chat/constants.ts
export const CHAT_MODEL = 'gemini-2.5-flash';

export const SYSTEM_PROMPT = `You are MedCatalog Assistant, a helpful AI for orthopedic medical device procurement.

Your capabilities:
- Search the product catalog using the searchProducts tool
- Compare prices across vendors using the comparePrices tool
- Suggest EMDN categories when searches are broad using suggestCategories tool

Guidelines:
- Be concise - procurement professionals value efficiency
- When user asks to find/show/search products, use searchProducts tool
- When user asks to compare prices, use comparePrices tool
- When search is broad or ambiguous (e.g., "implants"), use suggestCategories to help narrow down
- After showing products, mention the total count: "Showing 5 of 47 results"
- Include key specs when discussing products: material, price, vendor, regulatory status
- If no results found, suggest alternative search terms or categories
- Use markdown for formatting responses around tool results

Current limitations:
- Cannot modify products or place orders (read-only)
- Cannot search external websites (catalog only)
- Price information is from vendor catalogs, may not reflect negotiated pricing`;
```

### Comparison Table Component
```typescript
// Source: CONTEXT.md decisions
// src/components/chat/comparison-table.tsx
import { formatPrice } from '@/lib/utils/format-price';
import type { ProductPriceComparison } from '@/lib/actions/similarity';

interface ComparisonTableProps {
  products: ProductPriceComparison[];
}

export function ComparisonTable({ products }: ComparisonTableProps) {
  // Single vendor: show as text per CONTEXT.md
  if (products.length === 1) {
    const p = products[0];
    return (
      <p className="text-sm text-muted-foreground">
        Available from <strong>{p.vendor_name}</strong> at{' '}
        <strong>{formatPrice(p.price)}</strong>
      </p>
    );
  }

  // Multiple vendors: show as table, sorted by price low to high
  const sorted = [...products].sort((a, b) => (a.price || 0) - (b.price || 0));

  return (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="px-3 py-2 text-left font-medium border">Vendor</th>
            <th className="px-3 py-2 text-left font-medium border">Price</th>
            <th className="px-3 py-2 text-left font-medium border">SKU</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className="hover:bg-muted/50">
              <td className="px-3 py-2 border">{p.vendor_name || 'Unknown'}</td>
              <td className="px-3 py-2 border">{formatPrice(p.price)}</td>
              <td className="px-3 py-2 border font-mono">{p.sku}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Category Chips Component
```typescript
// Source: CONTEXT.md decisions - clickable chips for EMDN categories
// src/components/chat/category-chips.tsx
interface CategorySuggestion {
  id: string;
  code: string;
  name: string;
  count: number;
}

interface CategoryChipsProps {
  suggestions: CategorySuggestion[];
  onSelect: (categoryId: string, categoryName: string) => void;
}

export function CategoryChips({ suggestions, onSelect }: CategoryChipsProps) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-muted-foreground">No category suggestions available.</p>;
  }

  return (
    <div className="my-2">
      <p className="text-sm text-muted-foreground mb-2">
        Your search is broad. Select a category to narrow results:
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id, cat.name)}
            className="px-3 py-1.5 text-xs bg-muted hover:bg-accent hover:text-accent-foreground rounded-full border transition-colors"
          >
            {cat.name}
            <span className="ml-1 text-muted-foreground">({cat.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Loading State Component
```typescript
// src/components/chat/loading-spinner.tsx
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text: string;
}

export function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{text}</span>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `onToolCall` client callback | Server-side `execute` in tools | AI SDK 5+ | Simpler for read-only tools |
| Generic `tool-invocation` part type | Typed `tool-{toolName}` parts | AI SDK 5.0 | Better TypeScript inference |
| Manual conversation loops | `stopWhen: stepCountIs(n)` | AI SDK 5+ | Built-in multi-step |
| Separate UI route for tools | Tools in chat route | AI SDK 6 | Single endpoint |

**Current best practice (AI SDK 6.x):**
- Define tools with `execute` for server-side read operations
- Use typed part names (`tool-searchProducts`) for rendering
- Use `stopWhen` for multi-step queries
- Return structured data from tools, render custom components

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal stepCountIs value**
   - What we know: 3 steps allows search -> compare -> synthesize
   - What's unclear: Whether 5 would be better for complex queries
   - Recommendation: Start with 3, increase if users hit limit

2. **Category chip click handler integration**
   - What we know: Need to send new message with category filter
   - What's unclear: Best UX - should chip click clear previous results or add to conversation?
   - Recommendation: Add new message "Show [category name] products", let AI search

3. **"Show more" implementation**
   - What we know: CONTEXT.md says "via natural language"
   - What's unclear: Should searchProducts track offset for pagination?
   - Recommendation: Keep simple - user says "show more", AI calls searchProducts with higher limit (10, 15, etc.)

## Sources

### Primary (HIGH confidence)
- [AI SDK Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) - Tool definition patterns
- [AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Complete API
- [AI SDK Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) - Client-side rendering
- [Vercel Academy Multi-Step & Generative UI](https://vercel.com/academy/ai-sdk/multi-step-and-generative-ui) - Component rendering patterns
- [AI SDK Foundations: Tools](https://ai-sdk.dev/docs/foundations/tools) - Tool structure

### Secondary (MEDIUM confidence)
- Phase 8 RESEARCH.md - Existing chat architecture patterns (verified by implementation)
- Existing codebase: `lib/queries.ts`, `lib/actions/similarity.ts` - Query functions to wrap

### Tertiary (LOW confidence)
- WebSearch: Zod v4 Gemini compatibility - May need testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed, documented in Phase 8
- Tool definition pattern: HIGH - Official AI SDK documentation
- Client rendering pattern: HIGH - Official documentation with examples
- Existing query integration: HIGH - Verified by reading actual source files
- Zod/Gemini compatibility: MEDIUM - Known to work but version-specific quirks possible

**Research date:** 2026-02-05
**Valid until:** 30 days (AI SDK stable, existing queries stable)
