# Project Research Summary

**Project:** Medical Product Catalog with AI Classification
**Domain:** Healthcare Procurement / Medical Device Management
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

This is a specialized B2B medical product catalog system focused on orthopedic devices, combining procurement efficiency with AI-powered data extraction and regulatory compliance (EMDN classification). The recommended approach uses Next.js 15.5 with Supabase for rapid development, Gemini 3 Flash Preview for intelligent document extraction, and a human-in-the-loop review system to ensure data accuracy. The core differentiator is dramatically reducing catalog population time from months to weeks by automating vendor spreadsheet parsing while maintaining medical-grade data quality.

The key architectural insight is treating this as three distinct systems: (1) an extraction pipeline that converts unstructured vendor data into structured catalog entries with confidence scoring, (2) a canonical product model that enables multi-vendor price comparison through intelligent duplicate detection, and (3) a compliance layer that validates EMDN classifications against the official EU registry. This separation ensures each component can evolve independently while preventing the most common failure mode—trusting LLM output without validation.

The primary risk is hallucination in medical data extraction (15-40% error rates on clinical tasks), mitigated through field-level confidence scoring, mandatory human review for low-confidence extractions, and explicit source traceability showing where each data point was extracted from. Secondary risks include EMDN code obsolescence (May 2026 EUDAMED deadline approaching), multi-vendor product identity confusion, and reviewer fatigue from poorly designed approval workflows. All are addressable through proper schema design and UX patterns established in Phase 1.

## Key Findings

### Recommended Stack

**Modern Next.js stack optimized for rapid medical B2B development:** Next.js 15.5 with App Router provides server-side rendering for the catalog table, Server Actions for mutations, and Route Handlers for Gemini API calls. Supabase delivers managed PostgreSQL with row-level security for multi-tenant isolation, built-in authentication, and storage for vendor spreadsheets. Gemini 3 Flash Preview balances intelligence and speed for classification tasks at lower cost than GPT-4.

**Core technologies:**
- **Next.js 15.5**: Full-stack framework with App Router, Server Actions eliminate API boilerplate, battle-tested for production
- **Supabase**: Managed PostgreSQL + Auth + Storage, row-level security for data isolation, eliminates DevOps overhead
- **Gemini 3 Flash Preview**: LLM for extraction and classification, Pro-level intelligence at Flash pricing, supports thinking_level for reasoning
- **TypeScript 5.5+**: Required by Zod 4, provides compile-time safety for medical data structures
- **Tailwind CSS 4.x**: 5x faster builds with CSS-first config, required by shadcn/ui component library
- **Zod 4.x**: Schema validation shared client/server, TypeScript-first, validates LLM outputs
- **React Hook Form + @hookform/resolvers**: Minimal re-renders, integrates with Server Actions for form handling
- **shadcn/ui**: Copy-paste components you own, built on Radix UI + Tailwind, Server Components compatible
- **xlsx (SheetJS)**: Comprehensive Excel parser for vendor spreadsheets, handles .xlsx/.xls/.csv
- **TanStack Query 5.x**: Cache management for hybrid SSR + client data fetching

**Critical version requirements:**
- TypeScript 5.5+ required by Zod 4
- Next.js 15.5 specifically (not 16) - better stability for production
- @supabase/ssr 0.5.x for App Router auth (replaces deprecated auth-helpers)
- Avoid @google/generative-ai (deprecated), use @google/genai 1.37.x

### Expected Features

**This is a procurement tool with regulatory requirements, not a consumer e-commerce site.** The table-stakes features are enterprise data table functionality (sorting, filtering, pagination, export) plus EMDN classification display for EU MDR compliance. The killer differentiator is AI-powered extraction from vendor documents with human review—reducing 4-6 month manual data entry to weeks.

**Must have (table stakes):**
- Product listing table with multi-column sorting and frozen headers
- Faceted filtering by vendor, EMDN category, price range, material
- Full-text search across product names, descriptions, SKUs
- Pagination with configurable page size (10/20/50/100)
- EMDN classification display with hierarchical code visualization
- Multi-vendor price comparison for procurement decision support
- Export to CSV/Excel for ERP integration
- Product detail view with complete specs and regulatory info

**Should have (competitive advantage):**
- AI-powered data extraction from vendor text/markdown files
- Real-time extraction preview with confidence scores
- Inline editing of extracted data before commit
- Duplicate/similar product detection with similarity warnings
- AI-assisted EMDN classification with top-N suggestions
- Saved filter presets for repeated searches
- Audit trail for regulatory compliance tracking
- Bulk import with validation and field mapping

**Defer (v2+):**
- Real-time vendor catalog sync (API complexity, inconsistent vendor APIs)
- Full ERP/EHR integration (scope explosion, each hospital different)
- Multi-currency real-time conversion (exchange rate complexity)
- Advanced analytics dashboard (need data first)
- Vendor management/scoring (different problem domain)
- Multi-language localization (EMDN already standardized in EU)
- Complex role-based permissions (premature for prototype)
- Offline mode (adds sync complexity, not needed for B2B desktop use)

### Architecture Approach

**Three-layer architecture with clear separation between AI operations (Route Handlers), mutations (Server Actions), and presentation (Server Components for SSR + Client Components for interactivity).** This enables keeping Gemini API keys server-side while allowing progressive enhancement and type-safe mutations. URL-based state for the catalog table ensures shareability and SSR while avoiding client-side loading spinners.

**Major components:**
1. **File Upload + Review Flow** — Client Component handles file selection, calls /api/extract route, displays AI extraction results for user review/editing
2. **Catalog Table** — Server Component with URL-based pagination/filtering/sorting, fetches data server-side for instant rendering, no loading states
3. **Product CRUD** — Server Actions for all mutations (create/update/delete), validated with Zod schemas, optimistic UI updates
4. **Gemini Service Layer** — Route Handlers (/api/extract, /api/classify) wrap Gemini API calls, handle retry logic, validate structured outputs
5. **EMDN Service** — Manages local EMDN code registry synced from EC Excel, provides search/lookup, validates AI classifications
6. **Canonical Product Model** — Three-tier schema (Canonical Product -> Vendor Listings -> Pricing) enabling duplicate detection before insert and multi-vendor comparison

**Critical patterns:**
- **Separate Supabase clients:** Browser client vs server client required for proper auth in App Router
- **Server Actions for mutations, Route Handlers for LLM ops:** Keeps API keys secure, allows HTTP caching for LLM responses
- **URL search params for table state:** Enables SSR, shareability, browser back button
- **Confidence-based review routing:** Only surface low-confidence extractions for human review

### Critical Pitfalls

1. **Trusting LLM extraction without confidence scoring** — Medical LLMs hallucinate 15-40% on clinical tasks. Implement field-level confidence scores, set thresholds (<0.8 requires review), show source document highlighting, never auto-commit low-confidence data. Phase 1 requirement.

2. **EMDN classification without validation hierarchy** — EMDN codes change without notification, LLMs generate plausible but non-existent codes. Maintain local EMDN registry synced from EC, implement three-tier classification (LLM suggestion -> validation -> human confirm), flag "99-other" codes for review. Phase 2 requirement.

3. **Schema design without multi-vendor product identity** — Same product from different vendors becomes duplicates. Design schema with Canonical Product -> Vendor Listings separation, implement duplicate detection BEFORE insert, use multimodal embeddings for similarity. Phase 1 schema design.

4. **Human review UI causing reviewer fatigue** — Poor UX leads to rubber-stamping approvals. Confidence-based routing (only review below threshold), show clear extraction rationale with source location, batch operations for high-confidence items, active learning from corrections. Phase 3 UX design.

5. **Gemini API output assumptions** — Complex schemas cause 400 errors, optional fields get skipped. Keep schemas flat, set nullable:true explicitly, use propertyOrdering, post-process with Zod validation, abstract Gemini behind interface for model migration. Phase 1 extraction pipeline.

**Additional critical warnings:**
- **RLS policies using user_metadata**: Users can modify their tenant_id and access other tenants' data. Always use app_metadata for tenant isolation.
- **No extraction audit trail**: Medical device regulations require full data traceability. Audit trail is not optional.
- **Material declarations**: LLM errors here have patient safety implications (latex-free, MRI-safe). Human verification required.
- **Synchronous extraction**: UI freezes during upload. Background jobs with status polling required for any production use.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation + Core Data Model
**Rationale:** Must establish database schema with canonical product model and RLS before any data ingestion. Getting multi-tenant isolation and duplicate detection architecture wrong requires expensive migration later. Schema mistakes in medical data systems are nearly impossible to fix post-launch.

**Delivers:**
- Supabase project with three-tier product schema (Canonical Products, Vendor Listings, Pricing)
- Row-level security policies using app_metadata for tenant isolation
- EMDN codes table seeded from EC Excel download
- Zod validation schemas for all domain entities
- Supabase client utilities (separate browser/server clients)
- Basic layout and navigation components

**Addresses:**
- Pitfall #3: Schema design for multi-vendor identity
- Table stakes: Database foundation for all features
- Architecture: Proper Supabase client separation pattern

**Avoids:**
- Schema migration hell from flat vendor-product model
- Multi-tenant data leaks from RLS mistakes
- EMDN code validation failures from missing registry

**Research needs:** Standard patterns, skip phase research

### Phase 2: Catalog Table with SSR
**Rationale:** Core user value is browsing/filtering products. Building this with Server Components and URL-based state establishes the architectural pattern for the rest of the app. Demonstrates immediate value without AI complexity.

**Delivers:**
- Catalog listing page with Server Component data fetching
- URL-based pagination, sorting, filtering (shareable links)
- Product detail view with full specifications
- EMDN code display with hierarchical visualization
- Basic search (PostgreSQL full-text)
- Export to CSV functionality
- Responsive table component

**Uses:**
- Next.js App Router Server Components
- Supabase queries with filtering/pagination
- shadcn/ui table components
- URL search params for state management

**Implements:**
- Architecture: URL-based state pattern
- Feature: Product listing table (table stakes)
- Feature: Filtering, sorting, pagination (table stakes)

**Avoids:**
- Pitfall: useEffect for initial data fetch (use Server Components)
- Pitfall: Storing table state in React state (use URL)

**Research needs:** Standard patterns, skip phase research

### Phase 3: AI Extraction Pipeline
**Rationale:** Core differentiator but highest technical risk. Confidence scoring and schema validation must be built from day one—retrofitting these is expensive. This phase validates the AI value proposition before investing in polish.

**Delivers:**
- Gemini service with prompt templates for extraction
- /api/extract route handler with structured output
- File upload component (text/markdown only for MVP)
- Extraction job tracking table
- Zod validation for LLM outputs with retry logic
- Field-level confidence scoring
- Post-processing pipeline for data normalization

**Uses:**
- Gemini 3 Flash Preview with thinking_level: "medium"
- @google/genai SDK 1.37.x
- Flat JSON schemas with explicit propertyOrdering
- SheetJS for parsing uploaded files
- Zod safeParse for validation with error recovery

**Implements:**
- Feature: AI extraction (core differentiator)
- Architecture: Route Handlers for LLM operations
- Service layer: Gemini service abstraction

**Avoids:**
- Pitfall #1: Trusting LLM without confidence scores
- Pitfall #5: Gemini API assumptions (schema complexity, validation)
- Technical debt: Hardcoded model version (pin to specific model)

**Research needs:** MODERATE - Gemini structured output patterns well-documented, but prompt engineering for product extraction may need iteration

### Phase 4: Human-in-the-Loop Review
**Rationale:** Extraction without review is dangerous in medical context. Review UX determines whether system gets used or abandoned. Confidence-based routing prevents reviewer fatigue from day one.

**Delivers:**
- Extraction preview component showing all extracted products
- Inline editing with form validation
- Confidence score visualization (color-coded badges)
- Source document highlighting (show extraction location)
- Batch approve/reject with confirmation dialogs
- Individual product edit/delete
- Save to catalog with audit trail

**Uses:**
- React Hook Form for extraction editing
- Server Actions for batch product creation
- Framer Motion for list animations
- Sonner for toast notifications

**Implements:**
- Feature: Extraction preview/edit (table stakes for AI system)
- Feature: Real-time extraction preview (differentiator)
- Architecture: Client Components with Server Actions

**Avoids:**
- Pitfall #4: Reviewer fatigue UI
- UX pitfall: No extraction progress indicator
- UX pitfall: No "why" for AI suggestions

**Research needs:** LOW - Standard form patterns, focus on UX testing

### Phase 5: Duplicate Detection
**Rationale:** Critical for catalog quality but depends on having products in database. Can be added once extraction pipeline is validated. Missing this leads to catalog pollution that's expensive to clean up.

**Delivers:**
- Similarity scoring service (text-based for MVP)
- Duplicate detection check before product insert
- Similar product warning UI (shows top 3 matches with scores)
- Manual merge capability for confirmed duplicates
- Segmented comparison (by brand + category) for performance

**Uses:**
- PostgreSQL pg_trgm extension for text similarity
- Jaccard/TF-IDF for MVP (defer ML embeddings)
- Supabase RPC functions for similarity queries

**Implements:**
- Feature: Duplicate detection with warnings (differentiator)
- Feature: Similarity score display (differentiator)
- Architecture: Pre-insert validation pattern

**Avoids:**
- Pitfall: O(n^2) comparison performance (segment by category)
- Pitfall: Duplicate detection as cleanup, not prevention

**Research needs:** LOW - Text similarity algorithms well-documented

### Phase 6: AI-Assisted EMDN Classification
**Rationale:** Reduces manual classification burden but requires EMDN registry validation. Can be optional feature for launch, added based on user feedback. More valuable once catalog has significant data.

**Delivers:**
- /api/classify route handler with EMDN context
- EMDN selector component with AI suggestions
- Top-N classification suggestions with rationale
- Manual EMDN search with autocomplete
- Validation against local EMDN registry
- Confidence score storage for classifications

**Uses:**
- Gemini 3 Flash Preview for classification
- EMDN codes table with full-text search
- TanStack Query for caching classification results

**Implements:**
- Feature: AI-assisted EMDN classification (differentiator)
- Service layer: EMDN service with search/validation
- Architecture: Route Handler for classification API

**Avoids:**
- Pitfall #2: EMDN classification without validation
- Pitfall: LLM suggesting non-existent codes

**Research needs:** MODERATE - EMDN structure well-documented, but classification prompt engineering may need iteration

### Phase 7: Polish + Production Readiness
**Rationale:** Final phase focuses on user experience improvements and operational requirements. Only after core functionality is validated.

**Delivers:**
- Loading states and skeleton screens
- Error boundaries with user-friendly messages
- Saved filter presets (per user)
- Column visibility toggle
- Advanced filters (price range, material, manufacturer)
- Audit trail UI (view product change history)
- Rate limiting for Gemini API calls
- Background job queue for extraction processing
- Monitoring and error tracking

**Uses:**
- Framer Motion for animations
- TanStack Query for optimistic updates
- Supabase Realtime for job status updates (optional)

**Implements:**
- Feature: Saved filter presets
- Feature: Column visibility toggle
- Feature: Audit trail
- UX improvements across all features

**Research needs:** NONE - Standard patterns

### Phase Ordering Rationale

**Why this order:**

1. **Foundation first (Phase 1):** Schema mistakes are expensive to fix. Multi-tenant RLS must be correct from day one. EMDN registry must exist before classification.

2. **Catalog before AI (Phase 2):** Demonstrates immediate value, validates Server Component architecture, provides foundation for testing extraction output.

3. **Extraction before Review (Phase 3 -> 4):** Must have extraction working to design review UX. Review UI useless without data to review.

4. **Duplicate detection after extraction (Phase 5):** Needs products in database to test similarity scoring. Can't validate approach without real data.

5. **Classification deferred (Phase 6):** Optional for launch, more valuable with larger catalog. Can be skipped if manual classification is acceptable.

6. **Polish last (Phase 7):** Don't optimize UX before validating core functionality. Loading states matter less than correct data.

**Dependency chains:**
- Phase 1 (Schema) -> Phase 2 (Catalog) -> Phase 3 (Extraction) -> Phase 4 (Review)
- Phase 1 (EMDN Registry) -> Phase 6 (Classification)
- Phase 2 (Catalog) -> Phase 5 (Duplicate Detection)
- Phase 4 (Review) -> Phase 7 (Polish)

**Risk mitigation:**
- Phase 1 addresses schema and security pitfalls before any data
- Phase 3 builds confidence scoring from day one (Pitfall #1)
- Phase 4 prevents reviewer fatigue (Pitfall #4)
- Phase 6 validates EMDN codes (Pitfall #2)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (AI Extraction):** Prompt engineering for product extraction may need iteration based on vendor document formats. Gemini structured output patterns are well-documented, but domain-specific extraction quality is uncertain.
- **Phase 6 (EMDN Classification):** EMDN hierarchy structure is documented, but optimal classification prompt and confidence calibration needs experimentation.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Standard Supabase setup, well-documented Next.js patterns
- **Phase 2 (Catalog Table):** Standard Server Component data fetching, common e-commerce patterns
- **Phase 4 (Review UI):** Standard form patterns with React Hook Form
- **Phase 5 (Duplicate Detection):** Text similarity algorithms well-documented
- **Phase 7 (Polish):** Standard UX patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Next.js, Supabase, Gemini docs verified. Version compatibility confirmed. All technologies production-ready. |
| Features | MEDIUM | WebSearch-based with multiple authoritative sources (GHX, procurement platforms, UX research). Table stakes features verified across competitors. AI extraction as differentiator confirmed by market research. |
| Architecture | HIGH | Next.js App Router patterns from official docs. Supabase SSR integration well-documented. LLM integration patterns from multiple verified sources. Three-tier product model validated by e-commerce best practices. |
| Pitfalls | HIGH | LLM hallucination rates from peer-reviewed medical research. EMDN compliance requirements from official EU sources. Gemini API limitations from official Google docs. Multi-tenancy security patterns from Supabase docs. |

**Overall confidence:** HIGH

The stack and architecture recommendations are based on official documentation and production-tested patterns. Feature priorities are validated against real-world procurement platforms and UX research. Pitfall identification is grounded in published research (medical LLM hallucination studies, EMDN regulatory guidance) and official API documentation. The main uncertainty is prompt engineering quality for extraction and classification, which requires iteration but has well-documented baseline patterns.

### Gaps to Address

**During Phase 3 planning:**
- Vendor document format variability: Research covered text/markdown extraction, but real vendor spreadsheets may have inconsistent schemas. Plan for prompt template variations by vendor.
- Gemini structured output quality: Documented patterns exist, but domain-specific extraction quality (medical devices, specs, materials) needs validation with sample documents.

**During Phase 6 planning:**
- EMDN classification confidence calibration: Research shows LLMs can classify, but optimal confidence thresholds for medical device categories need experimentation with real product data.
- EMDN code change detection: EC doesn't provide API for code updates. Need strategy for periodic registry re-sync and product re-validation.

**Post-launch validation:**
- Duplicate detection accuracy: Text-based similarity is documented approach, but real-world accuracy with orthopedic products needs measurement. May need to advance to embeddings sooner than planned.
- Reviewer fatigue metrics: Research provides UX patterns, but actual review throughput and approval rates need monitoring to validate confidence thresholds.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Next.js 15 Documentation](https://nextjs.org/docs) - App Router, Server Actions, Route Handlers
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs) - Next.js integration patterns
- [Gemini API Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) - Schema requirements, limitations
- [European Medical Devices Nomenclature (EMDN)](https://health.ec.europa.eu/medical-devices-topics-interest/european-medical-devices-nomenclature-emdn_en) - Official EMDN registry
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) - CSS-first configuration
- [Zod 4 Documentation](https://zod.dev/) - Schema validation

**Technical Stack:**
- [Google GenAI SDK GitHub](https://github.com/googleapis/js-genai) - SDK usage patterns
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - Component setup
- [React Hook Form + Server Actions](https://nehalist.io/react-hook-form-with-nextjs-server-actions/) - Integration pattern
- [TanStack Query v5 Docs](https://tanstack.com/query/v5/docs/framework/react/overview) - Data fetching

### Secondary (MEDIUM confidence)

**Architecture Patterns:**
- [Next.js App Router Architecture](https://dev.to/yukionishi1129/building-a-production-ready-nextjs-app-router-architecture-a-complete-playbook-3f3h) - Production patterns
- [Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) - When to use each
- [Supabase Multi-Tenancy with RLS](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) - Security patterns
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) - Security, scaling, maintainability

**Features & UX:**
- [GHX Healthcare Supply Chain 2026](https://www.ghx.com/the-healthcare-hub/top-5-healthcare-supply-chain-predictions-for-2026/) - Industry trends
- [Baymard - Comparison Tool Design](https://baymard.com/ecommerce-design-examples/39-comparison-tool) - UX patterns
- [NN/g - Data Tables UX](https://www.nngroup.com/articles/data-tables/) - Enterprise table patterns
- [Cradl.ai - AI Document Extraction 2026](https://www.cradl.ai/post/document-data-extraction-using-ai) - Extraction patterns

**Medical Domain:**
- [EMDN Structure and Application](https://www.kiwa.com/en/insights/stories/emdn-codes-hierarchical-structure-and-application/) - EMDN hierarchy
- [MDCG 2024-2 Rev.1 - EMDN Updates](https://mantrasystems.com/articles/key-updates-navigating-emdn-mdcg-2024-2-2021-12-revision-1) - Regulatory guidance
- [Rimsys - EU MDR/IVDR UDI Guide](https://www.rimsys.io/blog/the-ultimate-guide-to-the-eu-mdr-ivdr-udi) - Compliance requirements

**LLM & AI:**
- [Structured Document Data Extraction Challenges](https://zilliz.com/blog/challenges-in-structured-document-data-extraction-at-scale-llms) - Pitfalls at scale
- [Medical Hallucination in Foundation Models](https://arxiv.org/html/2503.05777v2) - LLM reliability in medical context
- [LLM Evaluation for Data Extraction](https://pmc.ncbi.nlm.nih.gov/articles/PMC12703319/) - Validation requirements
- [Gemini Structured Output Improvements](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-structured-outputs/) - Google official guidance

**Duplicate Detection:**
- [Coupang - Duplicate Item Matching](https://medium.com/coupang-engineering/matching-duplicate-items-to-improve-catalog-quality-ca4abc827f94) - Production system patterns
- [Multimodal Embeddings for Product Deduplication](https://arxiv.org/abs/2509.15858) - Advanced techniques
- [Duplicate Product Detection Engine](https://www.sciencedirect.com/science/article/abs/pii/S0957417421017073) - Academic research

### Tertiary (LOW confidence, requires validation)

- Human-in-the-Loop UX patterns from Zapier, Unstract - general guidance, needs medical context adaptation
- B2B search/filtering patterns from Algolia, Fact-Finder - e-commerce focus, may not match procurement workflows

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
