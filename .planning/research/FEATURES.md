# Feature Research

**Domain:** Medical Product Catalog / Procurement System (Vendor-Neutral, Orthopedic Focus)
**Researched:** 2026-02-02
**Confidence:** MEDIUM (WebSearch-based, verified with multiple sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Product listing table with sorting** | Basic catalog functionality; users need to scan and order data by column (name, price, vendor) | LOW | Frozen header, zebra striping, clear sort indicators required |
| **Multi-column filtering** | 38% of top e-commerce sites have comparison tools; procurement users filter by specs, vendor, price | MEDIUM | Faceted navigation pattern; dynamic filter updates essential |
| **Pagination with configurable page size** | Large catalogs (1000s of SKUs) require chunked display; standard pattern | LOW | 10/20/50/100 row options; total count indicator |
| **Full-text search** | Users expect instant search across product names, descriptions, SKUs | MEDIUM | Consider Elasticsearch/Algolia for scale; search-as-you-type |
| **Product detail view** | Users need to see complete product info before comparison/procurement | LOW | Modal or side panel; all specs, pricing, regulatory info |
| **EMDN classification display** | EU regulatory requirement (MDR Article 26); required for EUDAMED | LOW | Display hierarchical code (up to 7 levels); link to category meaning |
| **Multi-vendor price comparison** | Core value proposition; procurement teams compare across vendors | MEDIUM | Side-by-side pricing for same/similar products |
| **Export functionality (CSV/Excel)** | Procurement teams need to share data, import into ERP systems | LOW | Export filtered/selected results with all fields |
| **Column visibility toggle** | Users need to customize view for their workflow; hide irrelevant columns | LOW | Persist preferences per user |
| **Responsive/mobile-friendly design** | Basic accessibility expectation; tablet use in procurement meetings | MEDIUM | At minimum, readable on tablets; full mobile may be deferred |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-powered data extraction from vendor sheets** | Eliminates manual data entry; reduces 4-6 month implementation to weeks | HIGH | Core differentiator; agentic extraction with human-in-the-loop review |
| **Duplicate/similar product detection with warnings** | 8-25% of catalogs are duplicates; reduces confusion, prevents overpayment | HIGH | Use text similarity (Jaccard, TF-IDF) + ML classification; Siamese networks for advanced matching |
| **AI-assisted EMDN classification** | EMDN has 7-level hierarchy; manual classification is error-prone | MEDIUM | Suggest codes based on product description; user confirms/corrects |
| **Real-time extraction preview/editing** | Shows AI confidence; lets users correct before committing | MEDIUM | Display extracted fields with confidence scores; inline editing |
| **Saved filter presets** | B2B users repeat same searches; improves efficiency | LOW | Save/load filter combinations; share across team |
| **Product comparison side-by-side view** | Decision support beyond just price; compare specs, materials | MEDIUM | Max 3-4 products; highlight differences; add meaning to specs |
| **Similarity score display** | Shows potential duplicates before adding; prevents catalog pollution | MEDIUM | "This product is 87% similar to [X]" warning |
| **Audit trail / change history** | Compliance requirement for some organizations; track who added/changed what | MEDIUM | Log all changes with timestamp, user, before/after values |
| **Regulatory info display (UDI, certifications)** | Medical devices require UDI-DI, UDI-PI, CE marking info | LOW | Display machine-readable (barcode) and human-readable formats |
| **Bulk import with validation** | Initial catalog population; periodic vendor catalog updates | MEDIUM | CSV upload with preview, validation errors, field mapping |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for a prototype/MVP.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time sync with vendor catalogs** | "Always up-to-date pricing" | Massive complexity; vendor APIs inconsistent or nonexistent; requires ongoing maintenance | Periodic manual upload with AI extraction |
| **Full ERP/EHR integration** | "Seamless ordering workflow" | Each hospital has different ERP (Workday, Infor, Oracle); scope explosion | Export to standard formats (CSV, Excel); API for later integration |
| **Multi-currency real-time conversion** | "Compare prices in my currency" | Exchange rates fluctuate; complexity for prototype | Store prices in original currency; note currency in display |
| **Advanced analytics dashboard** | "See spending trends" | Premature optimization; need data first | Simple export; build analytics after user base grows |
| **Vendor management / supplier scoring** | "Rate vendors, track performance" | Different problem domain; adds significant complexity | Focus on product catalog; vendor info is metadata only |
| **Purchase order generation** | "Complete procurement workflow" | Procurement workflow varies by organization; scope creep | Export product data; let existing systems handle PO |
| **Multi-language/localization** | "Serve international users" | Translation complexity; EMDN codes already standardized in EU | English first; localization in v2+ |
| **Complex permission/role system** | "Different access levels" | Premature for prototype; adds auth complexity | Simple user model; all authenticated users have same access |
| **Offline mode** | "Use without internet" | Adds significant technical complexity (sync, conflict resolution) | Require connectivity; export data for offline reference |
| **Image recognition for products** | "Scan product to identify" | Orthopedic implants look similar; high error rate; needs massive training data | Text-based matching; image as supplementary display only |

## Feature Dependencies

```
[Product Data Model]
    |
    +---> [Product Listing Table]
    |         |
    |         +---> [Sorting] (requires table)
    |         +---> [Filtering] (requires table)
    |         +---> [Pagination] (requires table)
    |         +---> [Export] (requires table with data)
    |
    +---> [Full-text Search] (requires indexed product data)
    |
    +---> [Product Detail View]
    |
    +---> [EMDN Classification Display]

[AI Extraction Engine]
    |
    +---> [Document Upload]
    |         |
    |         +---> [Extraction Preview] (requires extraction)
    |         +---> [Field Editing UI] (requires extraction)
    |         +---> [Commit to Catalog] (requires validation)
    |
    +---> [Duplicate Detection] (requires embeddings/similarity)
            |
            +---> [Similarity Warning UI] (requires detection)

[Price Comparison]
    +--requires---> [Product Listing] (need products to compare)
    +--requires---> [Similar Product Linking] (to compare across vendors)

[Saved Filters]
    +--requires---> [Filtering System] (need filters first)
    +--requires---> [User Authentication] (to persist per user)
```

### Dependency Notes

- **Filtering requires Product Listing:** Cannot filter without a table to filter
- **Duplicate Detection requires AI Extraction:** Same embedding model powers both
- **Price Comparison requires Similar Product Linking:** Must identify "same" product across vendors
- **Export requires populated catalog:** Need data before export is useful
- **Audit Trail requires User Authentication:** Need to track who made changes

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [x] **Product data model** - Core fields: name, description, SKU, vendor, pricing, specs, materials, EMDN code, regulatory info
- [x] **Product listing table** - Sortable columns, pagination, basic styling
- [x] **Filtering by key fields** - Vendor, EMDN category, price range, material
- [x] **Full-text search** - Search across name, description, SKU
- [x] **Manual product entry form** - Add products manually with validation
- [x] **AI extraction from text/markdown** - Core differentiator; upload vendor sheet, extract structured data
- [x] **Extraction preview/edit UI** - Show extracted data, allow corrections before save
- [x] **EMDN classification display** - Show code and hierarchy
- [x] **Basic duplicate warning** - Simple text similarity check on product add

### Add After Validation (v1.x)

Features to add once core is working and users provide feedback.

- [ ] **AI-suggested EMDN classification** - Trigger: users report classification is tedious
- [ ] **Saved filter presets** - Trigger: users repeat same complex filters
- [ ] **Side-by-side comparison view** - Trigger: users request beyond price comparison
- [ ] **Advanced duplicate detection (ML)** - Trigger: simple similarity misses too many
- [ ] **Bulk import** - Trigger: users have large existing catalogs
- [ ] **Audit trail** - Trigger: compliance requirements surface

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multi-currency support** - Why defer: adds complexity without validating core value
- [ ] **API for integration** - Why defer: need stable data model first
- [ ] **Advanced analytics** - Why defer: need usage data to know what to analyze
- [ ] **Mobile-optimized UI** - Why defer: procurement is mostly desktop-based
- [ ] **Role-based permissions** - Why defer: validate with single-user-type first

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Product listing table | HIGH | LOW | P1 |
| Sorting/Pagination | HIGH | LOW | P1 |
| Full-text search | HIGH | MEDIUM | P1 |
| Filtering (faceted) | HIGH | MEDIUM | P1 |
| Manual product entry | MEDIUM | LOW | P1 |
| AI extraction (text/md) | HIGH | HIGH | P1 (core differentiator) |
| Extraction preview/edit | HIGH | MEDIUM | P1 |
| EMDN display | MEDIUM | LOW | P1 |
| Basic duplicate warning | HIGH | MEDIUM | P1 |
| Export (CSV) | MEDIUM | LOW | P2 |
| Column toggle | LOW | LOW | P2 |
| Saved filters | MEDIUM | LOW | P2 |
| Side-by-side comparison | MEDIUM | MEDIUM | P2 |
| AI EMDN suggestion | MEDIUM | MEDIUM | P2 |
| Bulk import | MEDIUM | MEDIUM | P2 |
| Advanced duplicate (ML) | MEDIUM | HIGH | P3 |
| Audit trail | LOW | MEDIUM | P3 |
| API | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (validates core concept)
- P2: Should have, add after initial validation
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | GHX/Tecsys (Enterprise) | Generic PIM (Akeneo) | Our Approach |
|---------|-------------------------|---------------------|--------------|
| Catalog management | Full ERP integration, complex | Flexible but generic | Focused on medical devices |
| Search/Filter | Advanced faceted | Standard faceted | Standard faceted + EMDN-aware |
| Data entry | Manual, vendor EDI | Manual, bulk import | AI extraction from documents |
| Duplicate detection | Minimal | Basic dedup | ML-powered similarity |
| Pricing | Contract-based, opaque | Single price | Multi-vendor comparison |
| Classification | Proprietary | Custom taxonomies | EMDN standard (free, open) |
| Compliance | Full MDR/FDA support | None built-in | Basic UDI/regulatory display |
| Target user | Large hospital systems | Any industry | Procurement teams, SMB hospitals |
| Pricing model | Enterprise license | SaaS tiers | TBD (likely SaaS) |

## Sources

### Medical Procurement & Supply Chain
- [GHX Healthcare Supply Chain Predictions 2026](https://www.ghx.com/the-healthcare-hub/top-5-healthcare-supply-chain-predictions-for-2026/)
- [Tradogram Healthcare Procurement](https://www.tradogram.com/industries/healthcare)
- [Pipeline Medical - Future of Medical Supply Procurement](https://pipelinemedical.com/blog/the-future-of-medical-supply-procurement-trends-and-predictions/)
- [Order.co Healthcare Procurement Solutions](https://www.order.co/blog/procurement/healthcare-procurement-solutions/)

### EMDN Classification
- [EU Commission - EMDN Nomenclature](https://health.ec.europa.eu/medical-devices-topics-interest/european-medical-devices-nomenclature-emdn_en)
- [Kiwa - EMDN Codes Structure](https://www.kiwa.com/en/insights/stories/emdn-codes-hierarchical-structure-and-application/)
- [Casus Consulting - GMDN, EMDN, CND Codes 2026](https://casusconsulting.com/gmdn-emdn-and-cnd/)

### UX Patterns
- [Baymard - Comparison Tool Design Examples](https://baymard.com/ecommerce-design-examples/39-comparison-tool)
- [NN/g - Comparison Tables](https://www.nngroup.com/articles/comparison-tables/)
- [Smashing Magazine - Feature Comparison Tables](https://www.smashingmagazine.com/2017/08/designing-perfect-feature-comparison-table/)
- [Data Table UX - 5 Rules of Thumb](https://mannhowie.com/data-table-ux)
- [Pencil & Paper - Enterprise Data Tables](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [NN/g - Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/)

### AI Document Extraction
- [Cradl.ai - Document Data Extraction Guide 2026](https://www.cradl.ai/post/document-data-extraction-using-ai)
- [Parseur - Agentic Document Extraction](https://parseur.com/blog/agentic-document-extraction)
- [Klippa - AI Agents for Document Extraction](https://www.klippa.com/en/blog/information/ai-agents-for-document-data-extraction/)

### Duplicate Detection
- [Coupang Engineering - Duplicate Item Matching](https://medium.com/coupang-engineering/matching-duplicate-items-to-improve-catalog-quality-ca4abc827f94)
- [Walmart Tech - Product Matching with Deep Learning](https://medium.com/walmartglobaltech/product-matching-in-ecommerce-4f19b6aebaca)
- [Elbuz - Duplicate Product Removal Guide](https://elbuz.com/en/eliminate-duplicate-products-catalog)

### B2B Search & Filtering
- [Algolia - B2B Commerce Search & Filtering](https://www.algolia.com/blog/ecommerce/b2b-commerce-digital-transformation-search-filtering-sorting-and-navigation)
- [Fact-Finder - Faceted Search Best Practices](https://www.fact-finder.com/blog/faceted-search/)
- [Catsy - Faceted Search in E-Commerce](https://catsy.com/blog/faceted-search-ecommerce/)

### Medical Device Regulatory
- [Rimsys - EU MDR/IVDR UDI Guide](https://www.rimsys.io/blog/the-ultimate-guide-to-the-eu-mdr-ivdr-udi)
- [Easy Medical Device - UDI Beginner's Guide](https://easymedicaldevice.com/udi/)
- [Celegence - Medical Device UDI Requirements](https://www.celegence.com/medical-device-udi-requirements-us-europe/)

### Orthopedic Device Market
- [HealthLeaders - Orthopedic Device Pricing](https://www.healthleadersmedia.com/strategy/how-find-right-ortho-device-right-price)
- [OrthoDevices - Procurement Tips](https://www.orthopdevices.com/orthopedic-device-procurement-tips/)
- [PMC - Value-Based Medical Device Purchasing](https://pmc.ncbi.nlm.nih.gov/articles/PMC3293958/)

---

# Milestone 1.2: Chatbot Interface Feature Research

**Domain:** Conversational product search chatbot for medical device catalog
**Researched:** 2026-02-05
**Overall Confidence:** MEDIUM (WebSearch verified with industry patterns, cross-referenced with existing codebase capabilities)

## Executive Summary

Conversational product search chatbots for B2B catalogs follow established UX patterns: natural language understanding mapped to structured filters, interactive UI components (buttons, tables, cards) for actionable responses, and progressive disclosure to reduce cognitive load. The key differentiator for MedCatalog is leveraging **existing infrastructure** (similarity search, price comparison RPC functions, EMDN category tree) while adding conversational access.

---

## Chatbot Table Stakes

Features users expect in any product search chatbot. Missing these = chatbot feels broken or useless.

| Feature | Why Expected | Complexity | Existing Dependency | Notes |
|---------|--------------|------------|---------------------|-------|
| **Natural language product search** | Core value proposition - users ask in plain language | Medium | `getProducts()` with search, vendor, category, price filters | Must translate NL to existing filter params |
| **Show search results** | Users need to see what matched | Low | Product data structure already defined | Render as cards or compact list |
| **Filter by category** | EMDN navigation is central to the app | Low | `getEMDNCategories()`, `get_category_descendants()` RPC | Chatbot should understand category names/codes |
| **Filter by vendor** | Multi-vendor catalog comparison is core use case | Low | `getVendors()`, vendor filter in queries | Support vendor name lookup |
| **Filter by price range** | "under 5000 CZK" is common query pattern | Low | `minPrice`, `maxPrice` in `GetProductsParams` | Parse currency and amounts from NL |
| **View product details** | Drill down into a specific product | Low | Product schema with full details | Render key fields: name, SKU, price, vendor, EMDN |
| **Suggested prompts/starter questions** | Reduce blank-page syndrome, show capabilities | Low | None (new UI element) | 3-5 starter prompts visible on open |
| **Quick action buttons** | Reduce typing, guide conversation | Low | None (new UI element) | Buttons after responses: "Compare prices", "Show more", "Filter by vendor" |
| **Error handling with recovery** | Graceful degradation when query fails | Low | Existing error patterns | "I couldn't find that. Try: [suggestions]" |
| **Conversation context** | Remember what user asked previously | Medium | None (new state) | Track current filters, last search, selected product |

### Implementation Notes for Table Stakes

**Natural Language to Filters Translation:**
The chatbot needs to parse queries like "titanium hip stems under 5000" into:
```typescript
{
  search: "hip stems",
  material: "titanium", // or material_id after lookup
  maxPrice: 5000
}
```

This is the core NLP challenge. Options:
1. **LLM function calling** - Define tools matching `GetProductsParams`, let LLM extract structured params
2. **Pattern matching + LLM fallback** - Regex for common patterns (prices, categories), LLM for ambiguous cases

**Recommended approach:** LLM function calling with Gemini (already integrated for extraction). Define a `searchProducts` tool schema matching existing query params.

---

## Chatbot Differentiators

Features that set MedCatalog apart. Not expected, but provide competitive advantage.

| Feature | Value Proposition | Complexity | Existing Dependency | Notes |
|---------|-------------------|------------|---------------------|-------|
| **Inline price comparison tables** | See vendor prices side-by-side without leaving chat | Medium | `getProductPriceComparison()` RPC function | Render table: vendor, price, SKU - with "lowest" highlight |
| **Interactive comparison widget** | Select 2-3 products, see specs side-by-side | Medium-High | Product data, similarity search | Table columns: product names, rows: specs |
| **"Find alternatives" via web search** | Discover EU market alternatives not in catalog | High | WebSearch integration (new) | Search "[product type] EU market alternative" |
| **Quick filter buttons in response** | "Also filter by: [Titanium] [CE Marked] [Class IIb]" | Low | Existing filter system | Buttons that add filters to current search |
| **Product cards with actions** | Rich cards: image placeholder, key specs, action buttons | Medium | Product schema | Card with: "Compare prices", "View details", "Find alternatives" |
| **Save search to URL** | Share current chat-defined filters as URL | Low | Existing URL-based state | Button: "Open in catalog" - copies filters to main view |
| **EMDN category suggestions** | When search is vague, suggest relevant EMDN categories | Medium | Category tree with names | "Did you mean: [P09 - Implants] or [P10 - Prostheses]?" |
| **Research prompt generation** | Generate research prompts for procurement | Medium | Already exists in app | "Generate research prompt for this product" button |
| **Voice input** | Speak queries instead of typing | Medium | Browser Web Speech API | 2026 trend - increasingly expected in B2B tools |

### Implementation Notes for Differentiators

**Inline Price Comparison Tables:**
The existing `getProductPriceComparison()` function returns:
```typescript
interface ProductPriceComparison {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  vendor_id: string | null;
  vendor_name: string | null;
  emdn_code: string | null;
  similarity: number;
}
```

Render as responsive table in chat:
```
| Vendor      | Price (CZK) | SKU        |
|-------------|-------------|------------|
| MedSupply*  | 3,200       | HIP-TI-001 |  <- lowest
| OrthoTech   | 3,450       | OT-HIP-42  |
| BioMed EU   | 3,890       | BM-7721    |
```

**"Find Alternatives" via Web Search:**
This is the highest-complexity differentiator. Implementation approach:
1. Extract product type and key specs from selected product
2. Construct search query: "[product type] [material] EU CE marked alternative"
3. Return curated results with disclaimer: "External results - verify compliance independently"

**Risk:** Web search results may include non-compliant or irrelevant products. Must clearly label as "external suggestions" not catalog data.

---

## Chatbot Anti-Features

Features to deliberately NOT build for v1.2. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full-page chat replacement** | Users expect catalog browsing; chat is supplementary | Floating widget that expands/collapses |
| **Purchase/ordering through chat** | Out of scope for catalog MVP; adds compliance complexity | Link to vendor contact/website for ordering |
| **User accounts/history persistence** | Adds auth complexity, GDPR considerations | Session-only context; clear on close |
| **Multi-turn negotiation flows** | Overcomplicates MVP; not expected for catalog search | Single-purpose queries with clear responses |
| **Autonomous actions** | Don't modify catalog data or submit forms via chat | Read-only queries; link to forms for edits |
| **Image upload for product matching** | Requires vision model integration, training data | Future feature; focus on text search first |
| **Real-time inventory/availability** | Catalog is reference data, not live inventory | Show prices only; note "contact vendor for availability" |
| **Chat export/download** | Low value for v1.2; adds complexity | Session only; "Open in catalog" for shareable links |
| **Typing indicators/animations** | Premature polish; focus on functionality | Simple loading state is sufficient |
| **LLM-generated product descriptions** | Risk of hallucination; products have official descriptions | Show catalog data verbatim |

### Why These Are Anti-Features

**Full-page chat replacement:** Research shows B2B buyers prefer visual catalog browsing for comparison shopping. Chat should complement, not replace, the main interface. The existing filter sidebar + data table pattern is more efficient for browsing.

**Purchase/ordering:** Medical device procurement has compliance requirements. Chat should surface information, but ordering should go through proper channels with documentation trails.

**Autonomous actions:** The chatbot should be a query interface, not an agent that modifies data. This keeps the scope manageable and avoids permission/audit complexity.

---

## Chatbot Feature Dependencies

```
                    [Floating Chat Widget]
                           |
                    [Chat State Manager]
                           |
          +----------------+----------------+
          |                |                |
   [NL Query Parser]  [Response Renderer]  [Context Tracker]
          |                |                |
          v                v                v
   [Existing Queries] [UI Components]   [Session State]
   - getProducts()    - Product Cards
   - getVendors()     - Price Tables
   - getCategories()  - Action Buttons
   - similarity.ts    - Suggested Prompts
```

### Dependency Graph (Build Order)

1. **Chat Widget Shell** - Floating button, expand/collapse, basic input
2. **Message Renderer** - Display chat bubbles, support markdown
3. **NL Parser (LLM integration)** - Translate queries to filter params
4. **Product Results Display** - Cards with key info
5. **Quick Action Buttons** - Post-response interaction options
6. **Price Comparison Table** - Inline table component
7. **Web Search Integration** - External alternatives (if included)

---

## Chatbot MVP Recommendation

For MVP (v1.2), prioritize:

### Must Have (Table Stakes)
1. **Floating chat widget** with expand/collapse
2. **Natural language search** translating to existing filters
3. **Product results as cards** with name, SKU, price, vendor
4. **Suggested starter prompts** (3-5 examples)
5. **Quick action buttons** after responses
6. **Price comparison table** (leverages existing RPC)

### Should Have (Key Differentiators)
7. **EMDN category suggestions** when query is ambiguous
8. **"Open in catalog" button** to apply filters to main view

### Defer to Post-MVP
- **Web search for alternatives** - High complexity, compliance concerns
- **Voice input** - Nice-to-have, not blocking
- **Interactive multi-product comparison widget** - Complex UI, v1.3
- **Research prompt generation in chat** - Exists elsewhere, can link

---

## UI Pattern Examples

### Quick Action Buttons

After showing search results:
```
[Compare prices] [Filter by CE marked] [Show in catalog] [New search]
```

After showing price comparison:
```
[View cheapest] [Find alternatives] [New search]
```

After product details:
```
[Compare with similar] [Show vendor contact] [Back to results]
```

### Suggested Starter Prompts

```
"Titanium hip implants under 5000 CZK"
"Compare prices for knee prostheses"
"CE marked spinal fixation devices"
"Products from vendor MedSupply"
"Class IIb orthopedic implants"
```

### Price Comparison Table (Inline)

```
Prices for: Titanium Hip Stem (3 vendors)

| Vendor        | Price     | SKU          |
|---------------|-----------|--------------|
| MedSupply EU  | 3,200 CZK | MS-HIP-001   | [Best price]
| OrthoTech CZ  | 3,450 CZK | OT-4521      |
| BioMed Praha  | 3,890 CZK | BM-HIP-77    |

[View MedSupply product] [Find alternatives] [New search]
```

### Product Card (Compact)

```
+------------------------------------------+
| Titanium Hip Stem Pro                    |
| SKU: HIP-TI-PRO-001                      |
| Price: 3,200 CZK | Vendor: MedSupply EU  |
| EMDN: P090201 | CE Marked | Class IIb    |
+------------------------------------------+
[Compare prices] [Details] [Similar products]
```

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Chatbot table stakes | HIGH | Industry patterns well-established; existing codebase has supporting infrastructure |
| Chatbot differentiators | MEDIUM | Inline tables and buttons are proven patterns; web search integration is speculative |
| Chatbot anti-features | HIGH | Clear scope boundaries based on B2B catalog norms and compliance considerations |
| Complexity estimates | MEDIUM | Depends on Gemini function calling capabilities; may need adjustment |

---

## Chatbot Sources

### Industry Patterns and UX Best Practices
- [Chatbot UX Design: Complete Guide (2025)](https://www.parallelhq.com/blog/chatbot-ux-design)
- [Prompt Controls in GenAI Chatbots: 4 Main Uses and Best Practices - NN/G](https://www.nngroup.com/articles/prompt-controls-genai/)
- [Chatbot UX Best Practices for E-commerce Search - Toptal](https://www.toptal.com/designers/chatbot/chatbot-ux-best-practices)
- [15 Chatbot UI examples for designing an effective user interface - Sendbird](https://sendbird.com/blog/chatbot-ui)

### Interactive Components and Generative UI
- [Revolutionizing chatbot interactions with Generative UI - Monterail](https://www.monterail.com/blog/revolutionizing-chatbot-interactions-with-generative-ui)
- [LLM ChatBots 3.0: Merging LLMs with Dynamic UI Elements - Hugging Face](https://huggingface.co/blog/airabbitX/llm-chatbots-30)
- [31 Chatbot UI Examples from Product Designers - Eleken](https://www.eleken.co/blog-posts/chatbot-ui-examples)

### E-commerce and Product Discovery
- [The 2025 Guide to Implementing Conversational AI in eCommerce - eDesk](https://www.edesk.com/blog/conversational-ai-in-ecommerce/)
- [Product Recommendation Chatbots: How to Use AI to Sell - Botpress](https://botpress.com/blog/product-recommendation-chatbot)
- [10 Best AI Chatbots for Ecommerce Brands in 2026 - Tolstoy](https://www.gotolstoy.com/blog/ai-chatbots-for-ecommerce)

### B2B Medical Device Platforms
- [Grow your Medical Device Business with these 12 B2B Ecommerce Features - Cloudfy](https://www.cloudfy.com/articles/grow-your-medical-device-business-with-these-12-b2b-ecommerce-features/)
- [B2B Ecommerce Portal for Medical Devices Industry - Cloudfy](https://www.cloudfy.com/solutions/sector/medical-devices/)

### AI Shopping Assistants and Price Comparison
- [6 Best AI Shopping Assistants for 2026: A Comparison - Ringly](https://www.ringly.io/blog/ai-shopping-assistants)
- [Why the AI shopping agent wars will heat up in 2026 - Modern Retail](https://www.modernretail.co/technology/why-the-ai-shopping-agent-wars-will-heat-up-in-2026/)
- [Introducing shopping research in ChatGPT - OpenAI](https://openai.com/index/chatgpt-shopping-research/)

### Existing Codebase (LOCAL - HIGH confidence)
- `src/lib/queries.ts` - Product query infrastructure with filters
- `src/lib/actions/similarity.ts` - Price comparison and similarity search RPC
- `src/lib/schemas/product.ts` - Product data structure
- `src/lib/schemas/extraction.ts` - AI extraction patterns (Gemini integration)

---
*Feature research for: Medical Product Catalog / Procurement System*
*Chatbot milestone researched: 2026-02-05*
