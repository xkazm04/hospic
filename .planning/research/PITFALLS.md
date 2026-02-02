# Pitfalls Research: Medical Product Catalog with LLM Extraction

**Domain:** Medical product catalog with AI-powered data extraction and EMDN classification
**Researched:** 2026-02-02
**Confidence:** MEDIUM-HIGH (multiple authoritative sources corroborate findings)

---

## Critical Pitfalls

### Pitfall 1: Trusting LLM Extraction Without Confidence Scoring

**What goes wrong:**
LLM extracts structured data from vendor product sheets but produces plausible-sounding but factually incorrect values. Medical LLMs exhibit hallucination rates of 15-40% on clinical tasks. A product's material composition, dimensions, or certification codes get silently wrong, leading to compliance issues or dangerous product misrepresentation.

**Why it happens:**
- Gemini (and all LLMs) guarantee *syntactic* correctness of JSON output but NOT *semantic* correctness
- Developers assume "it parsed correctly = it's correct"
- No validation layer between extraction and database insertion
- OCR errors in source PDFs propagate as confident extractions

**How to avoid:**
1. Implement field-level confidence scoring for every extracted value
2. Set confidence thresholds (e.g., <0.8 requires human review)
3. Use source document highlighting to show WHERE data was extracted from
4. Implement multi-pass extraction with consistency checking
5. Never auto-commit low-confidence extractions to production data

**Warning signs:**
- Users reporting "obviously wrong" product data
- No extraction audit trail showing confidence scores
- 100% of extractions passing without human review
- No mechanism to trace extracted value back to source document location

**Phase to address:** Phase 1 (Core Extraction Pipeline) - Build confidence scoring into the extraction architecture from day one

---

### Pitfall 2: EMDN Classification Without Validation Hierarchy

**What goes wrong:**
Products get assigned incorrect EMDN codes because:
- EMDN codes change (edited, obsoleted, newly created) without notification
- One EMDN term covers numerous device types (broader than GMDN)
- LLM "guesses" plausible-looking codes that don't exist or are deprecated
- No validation against the current EMDN registry

**Why it happens:**
- EMDN and GMDN are not aligned and managed by different organizations
- The EU Commission does not notify users when EMDN codes are revised or archived
- Developers treat classification as a one-time extraction rather than ongoing validation
- EUDAMED becomes mandatory May 2026, increasing compliance stakes

**How to avoid:**
1. Maintain local EMDN code registry with sync to official EC updates
2. Implement three-tier classification: LLM suggestion -> validation against registry -> human confirmation
3. Flag products using "99-other" codes for periodic re-classification review
4. Build alerts for when assigned EMDN codes become obsoleted
5. Store classification confidence and rationale, not just the code

**Warning signs:**
- Products with EMDN codes that return "not found" in EUDAMED
- Heavy use of "99-other" fallback codes
- No changelog tracking EMDN code assignments
- Classification happening without validation against official registry

**Phase to address:** Phase 2 (Classification System) - Build EMDN validation layer before any classification logic

---

### Pitfall 3: Schema Design Without Multi-Vendor Product Identity

**What goes wrong:**
The same physical product from different vendors becomes multiple distinct records because:
- Different vendors describe the same product with different words, images, attributes
- No canonical product identity separate from vendor-specific listings
- Duplicate detection runs AFTER data is committed, creating merge conflicts
- Price comparisons become impossible across vendors

**Why it happens:**
- Natural instinct is to model vendor -> products as 1:many
- Duplicate detection is treated as a cleanup task, not a schema concern
- Text-based matching misses semantic similarity
- No "canonical product" entity in the data model

**How to avoid:**
1. Design schema with three-tier structure: Canonical Product -> Vendor Listings -> Pricing
2. Implement duplicate detection BEFORE insert, not after
3. Use multimodal embeddings (text + image) for similarity detection
4. Segment comparison space by brand + category to reduce O(n^2) comparisons
5. Store vendor-specific attributes separately from canonical product attributes

**Warning signs:**
- Same product appearing multiple times with slight name variations
- "Merge products" becoming a common manual operation
- Price comparison feature showing products from only one vendor
- Trillions of comparisons causing performance issues at scale

**Phase to address:** Phase 1 (Database Schema) - Design canonical product model before any data ingestion

---

### Pitfall 4: Human Review UI That Causes Reviewer Fatigue

**What goes wrong:**
Reviewers default to "approve all" or "ignore" because:
- AI generates too many false positives requiring review
- No clear rationale shown for AI suggestions
- Repetitive validation workflows without intelligent prioritization
- No way to batch-approve high-confidence extractions

**Why it happens:**
- HITL systems designed as "checkboxes" rather than intelligent workflows
- Every extraction treated with equal review priority
- No feedback loop from review decisions back to extraction quality
- Technical outputs without human-readable explanations

**How to avoid:**
1. Confidence-based routing: Only surface items below threshold for review
2. Show clear rationale: "Extracted 'Titanium' from page 3, paragraph 2"
3. Batch operations for high-confidence items with audit trail
4. Active learning: Use review corrections to improve future extractions
5. Tiered review: Quick approve, detailed review, escalate to expert

**Warning signs:**
- Review queue growing faster than it's being processed
- 95%+ approval rate (suggests rubber-stamping)
- No correlation between review time and extraction complexity
- Reviewers unable to explain why they approved/rejected

**Phase to address:** Phase 3 (Review Interface) - Design for reviewer efficiency, not just functionality

---

### Pitfall 5: Gemini API Output Assumptions

**What goes wrong:**
Extraction pipeline breaks or produces wrong data due to:
- Schema too complex causing InvalidArgument: 400 errors
- Optional fields getting skipped when context is insufficient
- Enum values returned as strings instead of typed enums
- Output wrapped in code blocks requiring manual sanitization
- Model retirement (Gemini 2.0 Flash retires March 2026)

**Why it happens:**
- Developers test with simple schemas, production schemas are complex
- Gemini 2.0 requires explicit propertyOrdering list
- Default behavior: fields are optional unless explicitly required
- Tuned models can have decreased quality with structured output

**How to avoid:**
1. Keep schemas flat: avoid deep nesting, long property names, many optional fields
2. Set "nullable: true" for fields that might lack context, not just "optional"
3. Explicitly set propertyOrdering in schema
4. Post-process: validate against Pydantic/JSON Schema with retry loop
5. Plan for model migration: abstract Gemini-specific code behind interface
6. Use gemini-2.5-flash-lite or newer, not deprecated 2.0 models

**Warning signs:**
- InvalidArgument errors appearing in production logs
- Extracted enums requiring string-to-enum conversion
- Inconsistent field population across similar documents
- No model version pinning in configuration

**Phase to address:** Phase 1 (Extraction Pipeline) - Build schema validation and model abstraction from start

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip confidence scoring | Faster MVP | Every extraction needs manual review | Never - this is core functionality |
| Flat vendor-product schema | Simpler initial queries | Impossible duplicate detection | Never - schema migration is expensive |
| Hardcode EMDN codes | No external dependency | Compliance failure when codes change | Never |
| Single LLM call per document | Simpler pipeline | No validation, high hallucination rate | Prototyping only |
| Store raw JSON extractions | Flexible schema | Query performance, no type safety | First 2 weeks only |
| Skip RLS setup | Faster development | Security vulnerability, multi-tenant leaks | Never with medical data |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gemini API | Assuming latest model, no version pin | Pin to specific model version, monitor deprecation notices |
| Supabase RLS | Using user_metadata for tenant_id | Use app_metadata (secure, user cannot modify) |
| PDF Extraction | Treating PDF as text container | Use specialized parser first, then LLM for semantic understanding |
| EMDN Registry | One-time import | Scheduled sync with change detection and product re-validation |
| Image embeddings | Text-only duplicate detection | Multimodal (text + image) with 12% unique overlap |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| O(n^2) duplicate comparison | Slow imports, timeouts | Segment by brand + category | 10,000+ products |
| Unbounded LLM calls | API rate limits, costs spike | Queue with backpressure, batch processing | 100+ documents/day |
| Full-table RLS scans | Slow queries, timeout errors | Index tenant_id, composite indexes | 100,000+ rows |
| Embedding search without indexing | Similarity search > 5s | pgvector with IVFFlat or HNSW index | 50,000+ products |
| Synchronous extraction | UI freezes during upload | Background jobs with status polling | Any production use |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS policies using user_metadata | Users can modify their tenant_id, access other tenants' data | Always use app_metadata for tenant isolation |
| Storing vendor credentials in public schema | Credential exposure via PostgREST | Move sensitive tables to private schema |
| No extraction audit trail | Cannot prove data provenance for compliance | Log every extraction with source, timestamp, confidence |
| LLM prompts with sensitive data in logs | PII/PHI exposure in logging systems | Sanitize prompts before logging, use structured logging |
| Trusting LLM for compliance decisions | LLM hallucination on regulatory codes | Human approval required for compliance-affecting fields |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No extraction progress indicator | Users re-upload thinking it failed | Real-time status: parsing -> extracting -> validating -> complete |
| Review queue without prioritization | Important corrections delayed | Sort by: confidence (ascending), business impact, age |
| Bulk approve without audit | Compliance gaps, no accountability | Bulk approve creates audit record, requires confirmation |
| No "why" for AI suggestions | Users can't learn or verify | Show source location, extraction rationale, confidence score |
| Classification without alternatives | Users must manually search for correct code | Show top 3-5 EMDN suggestions with match reasons |
| Changes without version history | Lost original data, no correction audit | Version all product data, show diff view |

---

## "Looks Done But Isn't" Checklist

- [ ] **Extraction pipeline:** Often missing retry logic for transient failures - verify exponential backoff exists
- [ ] **EMDN classification:** Often missing validation against current registry - verify API call or local sync
- [ ] **Duplicate detection:** Often runs only on new inserts - verify existing product re-scan capability
- [ ] **Human review:** Often missing "reject with reason" - verify rejection rationale is captured
- [ ] **Confidence scores:** Often calculated but not displayed - verify UI shows confidence to reviewers
- [ ] **RLS policies:** Often tested only for read - verify INSERT, UPDATE, DELETE all respect tenant isolation
- [ ] **Audit trail:** Often logs actions but not "before" state - verify full diff is captured
- [ ] **Model versioning:** Often uses "latest" - verify specific model version is pinned and monitored

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong EMDN codes in production | MEDIUM | Export affected products, re-classify with validation, bulk update with audit |
| Duplicate products proliferated | HIGH | Build deduplication tool, manual merge review, update all foreign keys |
| No confidence scores stored | HIGH | Re-run all extractions (expensive), or add scores only for new data |
| Reviewer fatigue leading to bad data | MEDIUM | Sample audit of approved items, re-review flagged items, add review metrics |
| Gemini model deprecated | LOW | Update model ID, test extraction quality, deploy with monitoring |
| RLS bypass vulnerability | CRITICAL | Immediate audit of data access, security review, user notification if breach |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LLM extraction without confidence | Phase 1: Core Pipeline | Unit tests verify confidence scores for all extractions |
| EMDN classification without validation | Phase 2: Classification | Integration test against EMDN registry API/data |
| No canonical product model | Phase 1: Schema Design | Schema review before any data ingestion |
| Reviewer fatigue UI | Phase 3: Review Interface | User testing with 50+ item review session |
| Gemini API assumptions | Phase 1: Extraction Pipeline | Contract tests for schema complexity, error handling |
| Multi-tenant data leaks | Phase 1: Database/RLS | Security audit, penetration testing for RLS bypass |
| Duplicate detection at scale | Phase 2: Product Matching | Load test with 10,000+ products |
| Audit trail completeness | Phase 1: Core Infrastructure | Compliance checklist verification |

---

## Domain-Specific Warnings

### Medical Device Regulatory Context

1. **EUDAMED Deadline (May 2026):** All new devices must be registered before marketing. Incorrect EMDN codes = registration rejection = cannot sell in EU.

2. **Traceability Requirements:** Medical device regulations require full traceability of product data. Your extraction audit trail is not optional - it's a compliance requirement.

3. **Material Declarations:** Extracted material compositions (e.g., latex-free, MRI-safe) have patient safety implications. False positives here are dangerous.

4. **CE Marking Validation:** LLM might extract "CE marked" from marketing text when the specific variant isn't. This needs human verification.

### LLM Reliability in Medical Context

Research shows LLMs are "highly susceptible to adversarial hallucination attacks, frequently generating false clinical details." In medical data extraction:

- 15-40% hallucination rates on clinical tasks
- LLMs repeat or elaborate on planted errors in up to 83% of cases
- Even "high accuracy" extractions can fail face validity checks

**Recommendation:** Treat LLM extraction as "draft" that requires human validation for any compliance-affecting fields.

---

## Sources

### LLM Extraction Pitfalls
- [Challenges in Structured Document Data Extraction at Scale with LLMs](https://zilliz.com/blog/challenges-in-structured-document-data-extraction-at-scale-llms)
- [From promise to practice: challenges and pitfalls in LLM evaluation for data extraction](https://pmc.ncbi.nlm.nih.gov/articles/PMC12703319/)
- [Document Data Extraction in 2026: LLMs vs OCRs](https://www.vellum.ai/blog/document-data-extraction-llms-vs-ocrs)

### EMDN Classification
- [2026 EU Guide: GMDN, EMDN, and CND Codes](https://casusconsulting.com/gmdn-emdn-and-cnd/)
- [Key Updates for Navigating EMDN: MDCG 2024-2 Rev.1](https://mantrasystems.com/articles/key-updates-navigating-emdn-mdcg-2024-2-2021-12-revision-1)
- [European Medical Devices Nomenclature (EMDN) - EC Health](https://health.ec.europa.eu/medical-devices-topics-interest/european-medical-devices-nomenclature-emdn_en)

### Gemini API
- [Structured outputs | Gemini API](https://ai.google.dev/gemini-api/docs/structured-output)
- [Improving Structured Outputs in the Gemini API](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-structured-outputs/)
- [Structured Output with Gemini Models](https://medium.com/google-cloud/structured-output-with-gemini-models-begging-borrowing-and-json-ing-f70ffd60eae6)

### Duplicate Detection
- [Duplicate product record detection engine for e-commerce platforms](https://www.sciencedirect.com/science/article/abs/pii/S0957417421017073)
- [Matching duplicate items to improve catalog quality - Coupang Engineering](https://medium.com/coupang-engineering/matching-duplicate-items-to-improve-catalog-quality-ca4abc827f94)
- [Optimizing Product Deduplication with Multimodal Embeddings](https://arxiv.org/abs/2509.15858)

### Human-in-the-Loop
- [Human-in-the-loop in AI workflows: Meaning and patterns](https://zapier.com/blog/human-in-the-loop/)
- [AI + Human-in-the-loop = 99% Accurate Data Extraction](https://unstract.com/webinar-recording/ai-human-in-the-loop-99-accurate-data-extraction-heres-how/)
- [Why Human-in-the-Loop is Essential for AI-Driven Compliance](https://www.radarfirst.com/blog/why-a-human-in-the-loop-is-essential-for-ai-driven-privacy-compliance/)

### Medical LLM Hallucination
- [Medical Hallucination in Foundation Models and Their Impact on Healthcare](https://arxiv.org/html/2503.05777v2)
- [A framework to assess clinical safety and hallucination rates of LLMs](https://www.nature.com/articles/s41746-025-01670-7)
- [Mitigating Hallucinations in LLMs for Healthcare](https://www.embs.org/jbhi/wp-content/uploads/sites/18/2025/11/Mitigating-Hallucinations-in-Large-Language-Models-for-Healthcare-Towards-Trustworthy-Medical-AI.pdf)

### Supabase Multi-Tenancy
- [Best Practices for Supabase | Security, Scaling & Maintainability](https://www.leanware.co/insights/supabase-best-practices)
- [Multi-tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Efficient multi tenancy with Supabase](https://arda.beyazoglu.com/supabase-multi-tenancy)

---
*Pitfalls research for: Medical Product Catalog with LLM Extraction*
*Researched: 2026-02-02*
