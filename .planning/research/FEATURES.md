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
*Feature research for: Medical Product Catalog / Procurement System*
*Researched: 2026-02-02*
