# Phase 1: Foundation + Catalog - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Supabase schema for products/vendors/pricing/materials/EMDN, EMDN data import filtered to orthopedic categories, and a browsable catalog table with sorting, filtering, pagination, and search. Product detail views and editing are Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Table visual style
- Compact row density — more products visible, less whitespace
- Primary visible columns (no horizontal scroll needed): Product name + SKU, Vendor, Price, EMDN category
- Actions via dropdown menu (⋮ button) rather than visible icon buttons
- Sticky header with subtle gray background that stays visible on scroll

### EMDN presentation
- Table shows EMDN category name only (e.g., "Bone screws") — no code displayed in table
- Filter uses expandable tree hierarchy showing parent > child relationships
- Full EMDN depth available for filtering (all levels, not just top 2)
- No breadcrumb path on hover — keep it simple, hierarchy visible in filter tree only

### Claude's Discretion
- Filter interface placement (sidebar vs top bar)
- Empty state and loading state designs
- Exact typography and spacing within compact constraint
- Search input placement and behavior
- Zebra striping or other row differentiation

</decisions>

<specifics>
## Specific Ideas

- User emphasized "elegant and dynamic design in light themes" and "advanced typography and border techniques" from project initialization
- Framer Motion animations should be smooth but not distracting
- "Avoid dead spaces in components" — compact, purposeful use of space

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-catalog*
*Context gathered: 2026-02-02*
