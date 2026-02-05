# Phase 11 Plan 02: External Result UI Summary

## One-liner

ExternalProductCard with blue accent styling and MessageList integration for web search tool output rendering

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create ExternalProductCard component | 6496373 | src/components/chat/external-product-card.tsx |
| 2 | Extend message-list to render external search results | f704b42 | src/components/chat/message-list.tsx |
| 3 | Visual verification in chat interface | - | N/A (verification only) |

## Technical Details

### ExternalProductCard Component

Minimal card component for displaying external web search results with visual distinction from catalog products:

```typescript
interface ExternalProductCardProps {
  name: string;        // Product/page title from grounding
  sourceUrl: string;   // Full URL to source
  sourceDomain: string; // Domain name only (e.g., "medicaldevices.eu")
}
```

**Styling decisions:**
- `border-2 border-blue-500` - Blue accent border distinguishes from catalog cards
- `bg-blue-50/10` - Subtle blue background tint
- `rounded-lg p-3 mb-2` - Matches ProductCard sizing and spacing
- `target="_blank" rel="noopener noreferrer"` - Security-compliant external links
- No expand/collapse (minimal info - user clicks through for details per CONTEXT.md)

### MessageList Integration

Added tool-searchExternalProducts case with three states:

1. **Loading state**: Shows "Searching the web for alternatives..." spinner
2. **No results state**: Shows "No external alternatives found. Try a different product or broader category."
3. **Results state**: Renders ExternalProductCard for each valid source

**URL validation (per CONTEXT.md line 26):**
```typescript
const validSources = toolPart.output.sources.filter((source) => {
  if (!source.url || source.url.trim() === '') return false;
  try {
    new URL(source.url);
    return true;
  } catch {
    return false;
  }
});
```

Invalid/broken URLs are filtered out silently - cards simply don't render.

### Visual Distinction

Catalog products (ProductCard):
- Standard border (`border`)
- No accent color
- Expandable with details
- Action buttons (Compare prices, View in catalog)

External products (ExternalProductCard):
- Blue accent border (`border-2 border-blue-500`)
- Blue background tint
- Non-expandable (minimal info)
- Only clickable source link (no action buttons)

## Verification Results

| Check | Status |
|-------|--------|
| ExternalProductCard component exists | PASS |
| Blue accent border (border-blue-500) applied | PASS |
| Links open in new tab with noopener noreferrer | PASS |
| MessageList handles tool-searchExternalProducts case | PASS |
| Loading spinner shows "Searching the web for alternatives..." | PASS |
| No-results state shows helpful message | PASS |
| Broken/invalid URLs filtered out silently | PASS |
| TypeScript compiles without errors | PASS |
| Production build succeeds | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

### Created
- `src/components/chat/external-product-card.tsx` - New component (27 lines)
- `.planning/phases/11-external-web-search/11-02-SUMMARY.md` (this file)

### Modified
- `src/components/chat/message-list.tsx` - Added ExternalProductCard import, ExternalSearchOutput type, tool-searchExternalProducts case (70 lines added)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| border-2 for blue accent | Thicker border makes external results immediately distinguishable |
| bg-blue-50/10 background | Subtle tint reinforces external source without being distracting |
| Silent URL filtering | Per CONTEXT.md line 26 - hide unavailable/broken source links rather than showing warnings |
| No action buttons | External cards are "leads to investigate" - user clicks through to source for details |

## Duration

- Started: 2026-02-05T14:28:00Z
- Completed: 2026-02-05T14:35:00Z
- Duration: ~7 minutes

## Phase Completion

Phase 11 (External Web Search) is now complete:
- Plan 01: searchExternalProducts tool with Gemini Google Search grounding
- Plan 02: UI components for displaying external search results

Users can now ask the chatbot to "find alternatives to [product] on EU market" and see web search results displayed with distinct blue styling.
