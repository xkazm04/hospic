# Phase 8: Streaming Foundation - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Chat widget with basic streaming — users can open a floating chat panel, type messages, and receive streaming text responses from Gemini. This phase establishes the core chat infrastructure. Tool calling, product search, and interactive components are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Widget Appearance
- Pill-shaped button with label "Chat" (not circular icon)
- Green accent colors matching existing catalog UI theme
- Subtle hover + active states (scale/shadow change, press feedback)
- No pulse animation — clean and professional

### Panel Behavior
- Panel expands in place from button (button transforms/grows into panel)
- Large size: 450x600px for comfortable product cards and tables
- No backdrop/overlay — catalog remains visible and interactive behind panel
- Close via X button only (no click-outside or Escape key)
- Anchored to bottom-right corner where button lives

### Message Display
- Classic bubble style: user messages right-aligned, AI messages left-aligned
- Streaming renders as chunks received from API (fastest, most natural)
- No avatars on messages — just the bubbles
- Full markdown rendering: headers, bold, lists, code blocks, tables

### Input Experience
- Auto-expanding textarea (grows as user types)
- Icon button (arrow/send) appears when text is entered
- Enter key sends message, Shift+Enter for newline
- Placeholder text: "Ask about products..."

### Claude's Discretion
- Exact animation timing and easing curves
- Bubble colors and contrast within green theme
- Message spacing and typography details
- Auto-scroll behavior during streaming
- Maximum height for auto-expanding textarea

</decisions>

<specifics>
## Specific Ideas

- Panel should feel like a natural extension of the MedCatalog UI — same visual language (green accents, light theme, subtle shadows)
- "Chat" label is intentionally simple — users know what chat is
- Large panel size (450x600) chosen to accommodate product cards and comparison tables from later phases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-streaming-foundation*
*Context gathered: 2026-02-05*
