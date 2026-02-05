# Phase 9: Catalog Search Tools - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can search the product catalog via natural language and get structured results displayed in the chat. The AI translates queries into tool calls (getProducts, findSimilar, comparePrices) and renders results as cards and tables. This phase adds tool calling to the existing chat widget — web search for external alternatives is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Product card display
- Mixed approach: compact cards by default, expandable to full details
- Compact view shows: name, price, vendor
- Small expand button (chevron or [...]) to reveal full details
- Cards have action buttons: "Compare prices" and "View in catalog"

### Price comparison tables
- Default sort: price low to high (procurement focus)
- Columns: Vendor, Price, SKU
- No emphasis on lowest price (neutral presentation)
- Single vendor case: show as regular text ("Available from [Vendor] at [Price]") instead of table

### Ambiguity handling
- Broad queries trigger EMDN category suggestions as clickable buttons/chips
- User taps chip to select, AI searches immediately
- No results: suggest similar searches (web search offer deferred to Phase 11)
- Typos: auto-correct silently (search for corrected term without comment)

### Result limits and loading
- Initial results: 5 products
- More results: via natural language ("show more") — no explicit button
- Loading state: spinner + text ("Searching catalog...")
- Show total count: "Showing 5 of 47 results"

### Claude's Discretion
- Card visual styling and spacing
- Exact expand/collapse animation
- How many EMDN categories to suggest (reasonable limit)
- Similar search term generation logic

</decisions>

<specifics>
## Specific Ideas

- Action buttons on cards enable quick workflows without typing
- EMDN category chips feel like quick filters, not a quiz
- Keep the AI response conversational — "Found 47 titanium knee implants. Here are the top 5:" not just raw cards

</specifics>

<deferred>
## Deferred Ideas

- "Offer web search on no results" — belongs in Phase 11 (External Web Search)
- Quick action buttons after results ("Show more" button) — could add in Phase 12 polish

</deferred>

---

*Phase: 09-catalog-search-tools*
*Context gathered: 2026-02-05*
