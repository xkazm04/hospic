# MedCatalog

## What This Is

A vendor-neutral medical product catalog for orthopedic materials. Procurement teams upload vendor product sheets, which are automatically classified using EMDN standards and compared against existing inventory. The system enables price comparison across vendors for the same or equivalent products.

## Core Value

Procurement can quickly compare prices for identical orthopedic products across multiple vendors — the same product, different suppliers, all prices visible at a glance.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can upload txt/markdown vendor product sheet and have it analyzed by Gemini
- [ ] Gemini extracts structured data: name, description, SKU, pricing, specs, materials, regulatory info
- [ ] Gemini classifies product per EMDN (orthopedic subset)
- [ ] System warns user of duplicate/similar products in catalog
- [ ] User can review and edit extracted metadata before saving
- [ ] Products save to Supabase with vendor, pricing, material composition, EMDN classification
- [ ] Catalog displays as sortable, filterable, paginated table (20 items/page)
- [ ] User can view product detail
- [ ] User can edit product metadata
- [ ] User can delete products
- [ ] Same products from different vendors are grouped for price comparison
- [ ] UI is elegant, light-themed, with smooth animations (Framer Motion)

### Out of Scope

- Multi-page navigation — this is a single-page application
- User authentication — prototype assumes trusted access
- Vendor management portal — vendors don't interact with the system directly
- Mobile-specific layouts — desktop-first prototype
- Real-time collaboration — single-user workflow

## Context

**Domain:** Medical device procurement for hospice/healthcare, specifically orthopedic products (implants, instruments, materials).

**EMDN Classification:** European Medical Devices Nomenclature — hierarchical classification system for medical devices. We have `EMDN V2_EN.xlsx` which needs filtering to orthopedic-relevant categories only.

**Data Sources:** Vendor product sheets in txt/markdown format containing specs, pricing, descriptions.

**Key Data Points to Extract:**
- Basic: Product name, description, vendor SKU/catalog number
- Pricing: Unit price, quantity discounts, currency
- Specs: Dimensions, weight, material composition (titanium, PEEK, stainless steel, etc.)
- Regulatory: CE marking, MDR classification, EMDN code

**Duplicate Detection:** When adding new products, Gemini should check existing catalog for similar items and warn user (not block) — allows linking same product from different vendors.

## Constraints

- **LLM**: Gemini via `genai` SDK, model `gemini-3-flash-preview` — server-side only
- **Database**: Supabase (PostgreSQL) — credentials provided post-migration
- **Stack**: NextJS, Tailwind CSS, TypeScript, Framer Motion
- **UI**: Single page, light theme, elegant design with advanced typography and borders, no dead space
- **Prototype**: Quality over quantity — one polished page, not multiple rough pages

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Warn on duplicates, don't block | Same product from different vendors is valid — that's the comparison use case | — Pending |
| Server-side Gemini only | Keep API key secure, no client exposure | — Pending |
| Filter EMDN to orthopedic | Full EMDN is too broad for this use case | — Pending |
| Material = physical composition | Track what products are made of (titanium, PEEK), not component lists | — Pending |

---
*Last updated: 2026-02-02 after initialization*
