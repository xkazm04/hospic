# EU Reference Pricing — Data Sources

## All Pricing Sources

| Source | Country | Data Type | How Used | Quality | Coverage |
|---|---|---|---|---|---|
| **SK MZ SR SZM Excel** | SK | Reimbursement ceilings per device | **Quarterly import script** (`import:sk-szm`) | T1 — Official | 839 prices, 127 categories, 712 devices |
| **FR LPPR tariffs** | FR | Reimbursement ceilings per component | **Import script** (`import:lppr`) | T1 — Official | 6 knee revision tariffs (expandable) |
| **CZ SZP CR code list** | CZ | Per-device reimbursement prices | **Import script** (`import:cz-szpcr`) | T1 — Official | Est. 500-2000+ orthopedic implant entries |
| **GB NHS Tariff** | GB | Procedure-level prices per HRG code | **Import script** (`import:gb-nhs`) | T1 — Official | ~25 orthopedic procedure codes |
| **FR LPPR (ameli.fr)** | FR | Reimbursement tariffs, LPP codes | **Gemini web search** (chat + test) | T1 — Official | Found for 5/10 test products |
| **SK MZ SR (kategorizacia)** | SK | Category reimbursement ceilings | **Gemini web search** (chat + test) | T1 — Official | Found for 3/10 test products |
| **EU TED (ted.europa.eu)** | EU | Tender award values | **Not importable** — lot totals only, no unit prices | T2 — Tender | 0 usable unit prices |
| **GB NHS Supply Chain (TOS3)** | GB | Framework agreement unit prices | **Not available** — behind NHS auth, commercially confidential | T2 — Tender | Blocked |
| **IN NPPA** | IN | Ceiling prices for knee implants | **Not imported** — 19 entries, knee only, non-EU | T3 — Non-EU | 19 knee component prices |
| **CZ openprocurements** | CZ | Lot-level tender estimates | **Not importable** — lot totals only, no unit prices | T2 — Tender | 0 usable unit prices |
| **FR LPPR / SK MZ SR / EU TED** | Multi | Registry-specific search queries | **Deep research prompt** (product detail) | N/A | User-guided manual research |
| **SUKL ZPSCAU (CZ)** | CZ | Outpatient device prices | **Not used** — no surgical implants | N/A | 0 orthopedic implants |
| **VZP ZUM catalog (CZ)** | CZ | Surgical implant reimbursement | **Superseded** by SZP CR (same data, structured format) | T1 — Official | Covered via SZP CR |

## Source Quality Tiers

| Tier | Description | Sources |
|---|---|---|
| **T1** | Official national reimbursement registries | FR LPPR, SK MZ SR, CZ SZP CR, GB NHS Tariff |
| **T2** | Official procurement / tender portals | EU TED, GB NHS Supply Chain, CZ/HU national tenders |
| **T3** | Non-EU official ceiling prices | IN NPPA |
| **T99** | Blocked — retail marketplaces | IndiaMART, Hospital Store, Tradeindia, MedicalExpo, etc. |

## By Access Method

| Method | Sources Used | When Triggered |
|---|---|---|
| **One-time/quarterly import scripts** | SK SZM Excel, FR LPPR, CZ SZP CR, GB NHS Tariff | Scheduled/manual DB refresh (`npm run import:*`) |
| **Gemini web search** (chat tool) | FR LPPR, SK MZ SR, EU TED, GB NHS, IN NPPA, CZ tenders | User asks about prices/alternatives in chat |
| **Deep research prompt** (product detail) | Links to legifrance.gouv.fr, kategorizacia.mzsr.sk, EUDAMED | User clicks "Research EU Pricing" on product detail page |
| **DB lookup** (reference_prices table) | All imported data (SK + FR + CZ + GB) | `lookupReferencePrices` chat tool, `ReferencePricesWidget` |

## Current DB Coverage

| Metric | Value |
|---|---|
| Total reference prices in DB | **839** |
| SK MZ SR prices | 839 (127 category + 712 device) |
| FR LPPR prices | 0 (script ready, migration not yet applied) |
| CZ SZP CR prices | 0 (script ready, pending import) |
| GB NHS Tariff prices | 0 (script ready, pending import) |
| Products with matching ref prices | **377 / 2,569** (15%) |
| EMDN categories covered | 11 (hip, knee, shoulder, elbow, ankle, hand, osteosynthesis) |

---

## Detailed Source Investigations

### CZ SZP CR — Czech Reimbursement Prices (IMPORTABLE)

**Status**: Ready for import — structured XLS, freely downloadable

- **Source URL**: `https://szpcr.cz/zdravotnicke_prostredky` — XLS/TXT files, updated monthly
- **Coverage**: All Czech health insurers (not just VZP), surgical implants in groups 01, 41-92
- **Format**: XLS with 25 structured columns
- **Key fields**: KOD (device code), NAZ (name), DOP (description), VYR (3-letter manufacturer code), AKC (current price CZK), CMF (regulated price CZK), MAX (max reimbursement CZK), UHP (reimbursement %), JKP (classification code)
- **EMDN codes**: Mandatory since Dec 2025 — enables direct category linking
- **Price scope**: `component` (per-device unit prices in CZK)
- **Currency**: CZK → EUR at ECB rate (~25.3 CZK/EUR, relatively stable)
- **Manufacturer codes**: 3-letter (same pattern as SK SZM — DPI, ZIM, AES, etc.)
- **Import script**: `npm run import:cz-szpcr`
- **Estimated entries**: 500-2000+ orthopedic implant rows
- **Expected coverage impact**: +10-20% product match rate

**Supersedes VZP ZUM PDF**: The SZP CR publishes the same underlying data in structured XLS format, eliminating the need for PDF/OCR extraction from VZP ZUM catalog.

### GB NHS Tariff — UK Procedure Prices (IMPORTABLE)

**Status**: Ready for import — XLSX workbook, freely downloadable

- **Source URL**: NHS England National Payment Scheme workbook (XLSX), published annually
- **Coverage**: HRG (Healthcare Resource Group) procedure tariffs for orthopedic procedures
- **Format**: XLSX with structured columns per HRG code
- **Key fields**: HRG code (e.g., HB12A), procedure description, tariff (GBP)
- **Relevant HRG codes**: HB11-HB22 (joint replacements), HB31-HB39 (revisions)
- **Price scope**: `procedure` (total procedure cost including implant + surgery)
- **Currency**: GBP → EUR at ECB rate
- **Limitation**: No per-implant breakdown — implant cost is ~15-20% of total procedure tariff
- **Import script**: `npm run import:gb-nhs`
- **Estimated entries**: ~25 orthopedic HRG codes
- **Expected coverage impact**: +1% product matches, but adds UK as reference geography

### EU TED Open Data (NOT IMPORTABLE)

**Status**: Investigated, not useful for per-device pricing

- **Access**: CSV bulk files at `data.europa.eu/data/datasets/ted-csv`, also API at `api.ted.europa.eu`
- **Fields available**: Notice ID, buyer name, CPV code, award value (EUR), winner/supplier, lot number, country
- **Limitation**: Only lot/contract-level totals (e.g., "EUR 2M for 4-year hip implant framework"), no unit prices, no device-level breakdown
- **CPV 33183100** (orthopedic implants) is too broad — covers all implant types undifferentiated
- **Supplier names** are free-text and inconsistent ("DePuy Synthes" vs "Johnson & Johnson DePuy")
- **Use case**: Market structure analysis only (which suppliers win in which countries), not reference pricing

### GB NHS Supply Chain / TOS3 Framework (BLOCKED)

**Status**: Commercially confidential, behind authentication

- TOS3 framework (Feb 2024 – Jan 2028) covers all orthopedic implants with banded volume pricing
- Pricing matrix available only to NHS trusts via `my.supplychain.nhs.uk` (requires NHS credentials)
- NJR EMBED/INFORM benchmarking tools aggregate trust-level prices but access restricted to subscribers
- No public CSV/Excel/API export
- **Not accessible without NHS procurement contact**

### IN NPPA — Indian Ceiling Prices (NOT IMPORTED — Low Value)

**Status**: Technically trivial but low value for EU-focused catalog

- Only 19 entries: 15 primary + 4 revision **knee** components (no hip, shoulder, spine)
- No manufacturer dimension — universal ceiling prices
- Prices are 70-85% below EU levels (Rs 51,563 ≈ EUR 543 for complete primary TKR vs EUR 2000-8000 in EU)
- INR/EUR volatile: 16% swing in 2025 alone
- Available as Government Gazette PDF only (no structured download), but data is small enough to hardcode
- **Skipped**: Non-EU, minimal coverage, price levels not comparable

### CZ openprocurements / Hlidac statu (NOT IMPORTABLE)

**Status**: Only lot-level contract values, no unit prices

- cz.openprocurements.com: 60+ orthopedic tenders via CPV 33183100, but only lot-level estimated values
- Per-device unit prices are in PDF attachments on TenderArena (behind auth)
- Hlidac statu API: Provides contract metadata and values, but contract-level totals only
- **Same fundamental limitation as TED**: no per-device price breakdown

### NJR / ODEP (UK — Catalog Enrichment Only)

**Status**: No pricing data, useful for product catalog enrichment only

- **NJR Annual Reports**: Top implant brands by usage volume, revision rates — downloadable as CSV from `reports.njrcentre.org.uk`. No prices.
- **ODEP Ratings**: Quality ratings for 200+ implant brands (10A*, 13A*, etc.) at `odep.org.uk`. No prices, would need scraping.
- Both useful for brand validation and quality metadata, not for reference pricing

### SUKL ZPSCAU (CZ — Not Useful)

- 12,848-row XLSX inspected (March 2024)
- Contains only voucher-dispensed outpatient devices (braces, hearing aids, wound care)
- Zero surgical implant entries — orthopedic implants reimbursed through hospital DRG
- **Not useful for our case**

---

## SK SZM Details

- **Source file**: `health.gov.sk/Zdroje?/Sources/kategorizacia/zkszm/YYYYMM/Zoznam_SZM_YYYYMM.xlsx`
- **Update cadence**: Quarterly (Jan 1, Apr 1, Jul 1, Oct 1)
- **XC code groups**: XC1 (hip), XC2 (knee), XC3 (other joints), XC4 (osteosynthesis), XC5 (arthroscopy)
- **Price columns**: UZP (insurance reimbursement per device), UZP2 (category-level ceiling per set)
- **XC-to-EMDN mapping**: AI-assisted via Gemini, cached in `scripts/data/sk-xc-emdn-mapping.json`

## Potential Expansion

| Source | Effort | Potential Impact | Status |
|---|---|---|---|
| Expand FR LPPR (scrape ameli.fr) | Medium — need to map more LPP codes | Could cover all joint prosthesis categories | Planned |
| DE InEK / G-DRG (Germany) | High — need to identify data access | Germany's DRG procedure pricing | Not investigated |
| AT LKF (Austria) | Medium — structured tariff data | Austrian procedure tariffs | Not investigated |

## Gemini Web Search Test Results

Tested across 10 diverse products with quality filtering enabled:

| Run | Products with prices | Total prices | Parse strategy |
|---|---|---|---|
| v1 (original) | 4/10 (40%) | 4 | mixed |
| v2 (strict prompt) | 3/10 (30%) | 7 | structured_lines |
| v3 (balanced prompt) | 7/10 (70%) | 54 raw, 16 after filter | structured_lines (100%) |

Quality filter removes: Indian marketplaces, retail catalogs, non-EU commercial sources. Keeps: T1 official registries, T2 tenders, T3 NPPA ceiling prices.
