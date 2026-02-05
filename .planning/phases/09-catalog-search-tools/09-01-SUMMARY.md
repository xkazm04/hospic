---
phase: 09
plan: 01
subsystem: chat-tools
tags: [ai-sdk, tool-calling, zod, streaming]

dependency_graph:
  requires: [08-01, 08-02]
  provides: [searchProducts, comparePrices, suggestCategories]
  affects: [09-02]

tech_stack:
  added: []
  patterns: [ai-sdk-tool-calling, zod-v4-inputSchema]

key_files:
  created:
    - src/lib/chat/tools.ts
  modified:
    - src/app/api/chat/route.ts
    - src/lib/chat/constants.ts

decisions:
  - id: use-zod-v4
    choice: Import from 'zod/v4' for AI SDK tool inputSchema
    reason: AI SDK 6.x internally uses zod/v4, ensures compatible schema inference

metrics:
  duration: 5m
  completed: 2026-02-05
---

# Phase 9 Plan 01: Tool Definitions Summary

Three AI tool definitions wrapping existing query functions for catalog search, price comparison, and EMDN category suggestions.

## What Was Built

### Tool Definitions (src/lib/chat/tools.ts)

**searchProducts tool:**
- Wraps `getProducts()` from `lib/queries.ts`
- Accepts natural language query plus optional filters (category, vendor, material, price range)
- Returns `{ products, totalCount, showing }` for display context
- Uses `.describe()` on all Zod fields for LLM parameter understanding

**comparePrices tool:**
- Wraps `getProductPriceComparison()` from `lib/actions/similarity.ts`
- Accepts productId UUID
- Returns `{ products, count }` with similarity-matched vendor options
- Handles error case by returning `{ error, products: [] }`

**suggestCategories tool:**
- Calls `getProducts()` with broad query (pageSize: 50)
- Aggregates EMDN categories from results into Map
- Skips uncategorized products (no "Uncategorized" suggestion)
- Returns top 5 categories sorted by product count

### Chat API Integration (src/app/api/chat/route.ts)

- Import `stepCountIs` from 'ai' for multi-step execution
- Import all three tools from `@/lib/chat/tools`
- Add `tools` object to streamText configuration
- Add `stopWhen: stepCountIs(3)` for multi-step queries (search -> compare -> synthesize)

### System Prompt Update (src/lib/chat/constants.ts)

- Replaced placeholder text with tool-aware instructions
- Lists all three tool capabilities
- Provides guidelines for when to use each tool
- Documents current limitations (read-only, catalog only)

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Zod version | Import from 'zod/v4' | AI SDK 6.x uses zod/v4 internally; ensures compatible schema type inference |
| Tool structure | Server-side execute | Read-only operations; no need for client-side tool handling |
| Step limit | stepCountIs(3) | Allows search -> compare -> synthesize pattern for complex queries |
| Category suggestions | Top 5 by count | Balance between options and cognitive load |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed `parameters` to `inputSchema` and `zod` to `zod/v4`**
- **Found during:** Task 1 verification
- **Issue:** RESEARCH.md showed `inputSchema` but initial code used `parameters`; project imports `zod` but AI SDK requires `zod/v4`
- **Fix:** Updated import to `from 'zod/v4'` and property to `inputSchema`
- **Files modified:** src/lib/chat/tools.ts
- **Commit:** e02b34e

## Commits

| Hash | Type | Description |
|------|------|-------------|
| e02b34e | feat | Create AI tool definitions for catalog search |
| 474e653 | feat | Integrate tools into chat API with multi-step execution |

## Key Links Verified

- `src/app/api/chat/route.ts` imports from `src/lib/chat/tools.ts`
- `src/lib/chat/tools.ts` calls `getProducts()` from `src/lib/queries.ts`
- `src/lib/chat/tools.ts` calls `getProductPriceComparison()` from `src/lib/actions/similarity.ts`

## Next Phase Readiness

**Plan 09-02: Tool Result Rendering**
- Tools now execute server-side and return structured data
- UI components needed to render tool results in chat messages
- Message parts will have `type: 'tool-searchProducts'` etc.
