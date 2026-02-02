# Phase 4: Comparison Engine - Research

**Researched:** 2026-02-02
**Domain:** Product similarity detection with PostgreSQL pg_trgm, price comparison UI
**Confidence:** HIGH

## Summary

This phase implements duplicate/similar product detection during extraction preview and a price comparison view for products grouped by similarity. The core technical challenge is computing text similarity between product names/SKUs at query time and displaying warnings before saving new products.

PostgreSQL's `pg_trgm` extension is the standard solution for this domain. It provides trigram-based text similarity functions that work well for product names (e.g., "Titanium Hip Implant 28mm" vs "Hip Implant Titanium 28mm"). The extension is available in Supabase and supports GIN/GiST indexes for fast similarity searches.

The architecture splits into two concerns: (1) **similarity detection** - a Server Action that queries existing products for matches above a threshold during extraction preview, and (2) **price comparison** - grouping products with high similarity to show vendor prices side-by-side. No additional libraries are needed; this is a PostgreSQL + Supabase RPC pattern.

**Primary recommendation:** Use `pg_trgm` extension with a PostgreSQL RPC function that returns similar products with similarity percentages. Integrate into extraction preview workflow with a "Similar Products Found" warning panel. For price comparison, use a product grouping query that aggregates similar products by name similarity.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg_trgm | (PostgreSQL built-in) | Text similarity via trigrams | Industry standard for fuzzy matching in Postgres, available in Supabase |
| Supabase RPC | - | Call PostgreSQL functions from JS | Already using Supabase, no new dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | pg_trgm + existing stack is sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_trgm | pgvector embeddings | Semantic similarity but requires embedding generation (OpenAI/local model), overkill for product name matching |
| pg_trgm | Levenshtein distance | Character-level, worse for word reordering ("Hip Implant" vs "Implant Hip") |
| PostgreSQL RPC | Edge Function | Extra complexity; RPC is simpler and sufficient |

**Installation:**
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create index for fast similarity search on product names
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);
```

No npm packages needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    actions/
      similarity.ts       # Server Action: findSimilarProducts()
      products.ts         # Existing: createProduct() (unchanged)
  components/
    extraction/
      extraction-preview.tsx  # Add SimilarProductsWarning integration
      similar-products-warning.tsx  # NEW: Warning panel with similar products
    comparison/
      product-group-card.tsx   # NEW: Card showing grouped products
      price-comparison-table.tsx  # NEW: Table comparing vendor prices
supabase/
  migrations/
    003_similarity_search.sql  # Enable pg_trgm, create RPC function
```

### Pattern 1: Similarity Search via RPC Function
**What:** PostgreSQL function that returns products similar to input text with similarity percentages
**When to use:** During extraction preview to warn about potential duplicates
**Example:**
```sql
-- Migration: supabase/migrations/003_similarity_search.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for fast trigram search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

-- RPC function to find similar products
CREATE OR REPLACE FUNCTION find_similar_products(
  search_name TEXT,
  search_sku TEXT DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.3,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  price DECIMAL(10,2),
  vendor_id UUID,
  vendor_name TEXT,
  name_similarity REAL,
  sku_similarity REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.price,
    p.vendor_id,
    v.name AS vendor_name,
    similarity(p.name, search_name) AS name_similarity,
    CASE
      WHEN search_sku IS NOT NULL THEN similarity(p.sku, search_sku)
      ELSE 0.0
    END AS sku_similarity
  FROM products p
  LEFT JOIN vendors v ON p.vendor_id = v.id
  WHERE
    similarity(p.name, search_name) > similarity_threshold
    OR (search_sku IS NOT NULL AND similarity(p.sku, search_sku) > 0.8)
  ORDER BY
    GREATEST(
      similarity(p.name, search_name),
      CASE WHEN search_sku IS NOT NULL THEN similarity(p.sku, search_sku) ELSE 0.0 END
    ) DESC
  LIMIT max_results;
END;
$$;
```

```typescript
// src/lib/actions/similarity.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export interface SimilarProduct {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  vendor_id: string | null;
  vendor_name: string | null;
  name_similarity: number;
  sku_similarity: number;
}

interface SimilarityResult {
  success: boolean;
  data?: SimilarProduct[];
  error?: string;
}

export async function findSimilarProducts(
  name: string,
  sku?: string,
  threshold: number = 0.3
): Promise<SimilarityResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("find_similar_products", {
    search_name: name,
    search_sku: sku || null,
    similarity_threshold: threshold,
    max_results: 5,
  });

  if (error) {
    console.error("Similarity search error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}
```

### Pattern 2: Similarity Warning in Extraction Preview
**What:** After extraction, call findSimilarProducts and show warning if matches found
**When to use:** Between extraction complete and user saves to catalog
**Example:**
```typescript
// In extraction-preview.tsx, after extraction completes:
// 1. Call findSimilarProducts(extractedData.name, extractedData.sku)
// 2. If results exist, show SimilarProductsWarning component
// 3. User can proceed (warn, don't block) or view similar products

// src/components/extraction/similar-products-warning.tsx
"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import type { SimilarProduct } from "@/lib/actions/similarity";

interface SimilarProductsWarningProps {
  products: SimilarProduct[];
  onDismiss: () => void;
}

export function SimilarProductsWarning({ products, onDismiss }: SimilarProductsWarningProps) {
  if (products.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800">Similar products found</h4>
          <p className="text-sm text-amber-700 mt-1">
            This product may already exist in the catalog. Review before saving.
          </p>
          <ul className="mt-3 space-y-2">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-900">
                  {p.name} {p.vendor_name && `(${p.vendor_name})`}
                </span>
                <span className="text-amber-600 font-mono">
                  {Math.round(p.name_similarity * 100)}% match
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### Pattern 3: Product Grouping for Price Comparison
**What:** Query that groups products with similar names across vendors
**When to use:** Displaying price comparison view
**Example:**
```sql
-- RPC function to get product groups for price comparison
CREATE OR REPLACE FUNCTION get_product_price_comparison(
  product_id UUID,
  similarity_threshold REAL DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  price DECIMAL(10,2),
  vendor_id UUID,
  vendor_name TEXT,
  similarity REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_name TEXT;
BEGIN
  -- Get the name of the target product
  SELECT p.name INTO target_name FROM products p WHERE p.id = product_id;

  IF target_name IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.price,
    p.vendor_id,
    v.name AS vendor_name,
    similarity(p.name, target_name) AS similarity
  FROM products p
  LEFT JOIN vendors v ON p.vendor_id = v.id
  WHERE similarity(p.name, target_name) > similarity_threshold
  ORDER BY p.price ASC NULLS LAST;
END;
$$;
```

```typescript
// src/lib/actions/similarity.ts (add to existing)
export interface ProductPriceComparison {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  vendor_id: string | null;
  vendor_name: string | null;
  similarity: number;
}

export async function getProductPriceComparison(
  productId: string,
  threshold: number = 0.5
): Promise<{ success: boolean; data?: ProductPriceComparison[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_product_price_comparison", {
    product_id: productId,
    similarity_threshold: threshold,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}
```

### Pattern 4: Price Comparison Table Component
**What:** Display all vendor prices for similar products in a sortable table
**When to use:** Product detail view or dedicated comparison page
**Example:**
```typescript
// src/components/comparison/price-comparison-table.tsx
"use client";

import type { ProductPriceComparison } from "@/lib/actions/similarity";

interface PriceComparisonTableProps {
  products: ProductPriceComparison[];
  currentProductId: string;
}

export function PriceComparisonTable({
  products,
  currentProductId
}: PriceComparisonTableProps) {
  const formatPrice = (price: number | null) =>
    price !== null ? `${price.toLocaleString()} CZK` : "N/A";

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left px-4 py-2 text-sm font-medium">Vendor</th>
            <th className="text-left px-4 py-2 text-sm font-medium">SKU</th>
            <th className="text-right px-4 py-2 text-sm font-medium">Price</th>
            <th className="text-right px-4 py-2 text-sm font-medium">Match</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.id}
              className={p.id === currentProductId ? "bg-accent/10" : ""}
            >
              <td className="px-4 py-2 text-sm">
                {p.vendor_name ?? "Unknown"}
                {p.id === currentProductId && (
                  <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                )}
              </td>
              <td className="px-4 py-2 text-sm font-mono">{p.sku}</td>
              <td className="px-4 py-2 text-sm text-right font-medium">
                {formatPrice(p.price)}
              </td>
              <td className="px-4 py-2 text-sm text-right text-muted-foreground">
                {Math.round(p.similarity * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Blocking on duplicates:** Project requirement is to WARN, not block. Same product from different vendors is a valid use case.
- **Client-side similarity calculation:** Do it in PostgreSQL with pg_trgm; JavaScript string comparison is slow and lacks word reordering handling.
- **Fetching all products for comparison:** Use RPC with LIMIT; don't load entire catalog client-side.
- **Hardcoded similarity thresholds:** Make threshold configurable (0.3 for warnings, 0.5+ for grouping).
- **Exact SKU matching only:** SKU is NOT unique across vendors; use name similarity as primary signal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text similarity algorithm | Custom Jaccard/Levenshtein | pg_trgm `similarity()` | Handles word reordering, has indexes, battle-tested |
| Fuzzy search index | Sequential LIKE scans | GIN index with gin_trgm_ops | 100x faster for large catalogs |
| Similarity threshold | Hardcoded values | PostgreSQL GUC `pg_trgm.similarity_threshold` | Configurable per-query without code changes |
| Price comparison query | Multiple queries + JS merge | Single RPC function | One round-trip, database handles grouping |

**Key insight:** pg_trgm is the industry-standard solution for this exact problem. It handles "Titanium Hip Implant" matching "Hip Implant, Titanium" because trigrams capture character sequences regardless of word order. Custom solutions would miss this and be slower.

## Common Pitfalls

### Pitfall 1: Threshold Too Low = Noise
**What goes wrong:** Similarity threshold of 0.1 returns too many false positives, overwhelming users
**Why it happens:** pg_trgm default is 0.3, but even that can be noisy for short names
**How to avoid:** Use 0.3 for initial warning, 0.5+ for price comparison grouping. Test with real product names.
**Warning signs:** Warning panel showing 10+ products for every extraction

### Pitfall 2: Missing pg_trgm Index
**What goes wrong:** Similarity search takes 500ms+ on 1000+ products
**Why it happens:** Without GIN index, PostgreSQL does sequential scan
**How to avoid:** Always create `idx_products_name_trgm` GIN index in migration
**Warning signs:** Slow extraction preview, timeout errors

### Pitfall 3: NULL vendor_id Breaks Price Comparison
**What goes wrong:** Products without vendors show as "Unknown" but still group together
**Why it happens:** vendor_id is nullable; price comparison should still work
**How to avoid:** Handle NULL vendor gracefully in UI; don't filter out NULL vendors
**Warning signs:** "Unknown" vendor appearing multiple times

### Pitfall 4: Case Sensitivity
**What goes wrong:** "TITANIUM HIP" doesn't match "Titanium Hip"
**Why it happens:** pg_trgm is case-sensitive by default
**How to avoid:** Use `LOWER()` in similarity function or normalize data on insert
**Warning signs:** Obvious duplicates not detected

### Pitfall 5: Short Names Have Low Similarity
**What goes wrong:** "Screw M4" has low similarity to "M4 Screw" (trigrams differ)
**Why it happens:** Short strings have fewer trigrams to match
**How to avoid:** For very short names (<10 chars), also check SKU similarity; consider word_similarity() instead
**Warning signs:** Short product names never flagged as duplicates

## Code Examples

### Complete Migration File
```sql
-- supabase/migrations/003_similarity_search.sql

-- Enable pg_trgm extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fast similarity search on product names
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

-- Also index SKU for SKU-based similarity
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON products USING GIN (sku gin_trgm_ops);

-- RPC function: Find products similar to given name/sku
-- Used during extraction preview to warn about duplicates
CREATE OR REPLACE FUNCTION find_similar_products(
  search_name TEXT,
  search_sku TEXT DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.3,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  price DECIMAL(10,2),
  vendor_id UUID,
  vendor_name TEXT,
  name_similarity REAL,
  sku_similarity REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.price,
    p.vendor_id,
    v.name AS vendor_name,
    similarity(LOWER(p.name), LOWER(search_name)) AS name_similarity,
    CASE
      WHEN search_sku IS NOT NULL AND search_sku != ''
      THEN similarity(LOWER(p.sku), LOWER(search_sku))
      ELSE 0.0::REAL
    END AS sku_similarity
  FROM products p
  LEFT JOIN vendors v ON p.vendor_id = v.id
  WHERE
    similarity(LOWER(p.name), LOWER(search_name)) > similarity_threshold
    OR (
      search_sku IS NOT NULL
      AND search_sku != ''
      AND similarity(LOWER(p.sku), LOWER(search_sku)) > 0.8
    )
  ORDER BY
    GREATEST(
      similarity(LOWER(p.name), LOWER(search_name)),
      CASE
        WHEN search_sku IS NOT NULL AND search_sku != ''
        THEN similarity(LOWER(p.sku), LOWER(search_sku))
        ELSE 0.0::REAL
      END
    ) DESC
  LIMIT max_results;
END;
$$;

-- RPC function: Get all similar products for price comparison
-- Used in product detail to show vendor price comparison
CREATE OR REPLACE FUNCTION get_product_price_comparison(
  product_id UUID,
  similarity_threshold REAL DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  price DECIMAL(10,2),
  vendor_id UUID,
  vendor_name TEXT,
  similarity REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_name TEXT;
BEGIN
  SELECT p.name INTO target_name FROM products p WHERE p.id = product_id;

  IF target_name IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.price,
    p.vendor_id,
    v.name AS vendor_name,
    similarity(LOWER(p.name), LOWER(target_name)) AS similarity
  FROM products p
  LEFT JOIN vendors v ON p.vendor_id = v.id
  WHERE similarity(LOWER(p.name), LOWER(target_name)) > similarity_threshold
  ORDER BY p.price ASC NULLS LAST;
END;
$$;

-- Grant execute permissions for RLS
GRANT EXECUTE ON FUNCTION find_similar_products TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_price_comparison TO anon, authenticated;
```

### Integration with Extraction Preview
```typescript
// In extraction-preview.tsx, add similarity check after extraction
// This is called after extraction but before form render

import { useEffect, useState } from "react";
import { findSimilarProducts, type SimilarProduct } from "@/lib/actions/similarity";

// Inside ExtractionPreview component:
const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
const [similarityLoading, setSimilarityLoading] = useState(true);

useEffect(() => {
  async function checkSimilarity() {
    setSimilarityLoading(true);
    const result = await findSimilarProducts(
      extractedData.name,
      extractedData.sku
    );
    if (result.success && result.data) {
      setSimilarProducts(result.data);
    }
    setSimilarityLoading(false);
  }
  checkSimilarity();
}, [extractedData.name, extractedData.sku]);

// Then in JSX, before the form:
{!similarityLoading && similarProducts.length > 0 && (
  <SimilarProductsWarning
    products={similarProducts}
    onDismiss={() => setSimilarProducts([])}
  />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exact SKU matching | Trigram similarity on name | pg_trgm stable since PostgreSQL 9.1 | Catches "same product, different SKU" |
| Client-side fuzzy.js | Server-side pg_trgm | Always preferred for DB apps | 100x faster, works at scale |
| Manual product linking | Automatic similarity grouping | Modern ecommerce pattern | No manual data entry needed |

**Deprecated/outdated:**
- `fuzzystrmatch` Levenshtein: Too slow for large datasets, no index support
- Client-side string matching: Doesn't scale, requires loading all data

## Open Questions

1. **Optimal similarity threshold for orthopedic products**
   - What we know: Default 0.3 works for general text; medical products have specific naming patterns
   - What's unclear: Whether "Titanium Pedicle Screw 5.5x40mm" reliably matches "Pedicle Screw Titanium 5.5mm x 40mm"
   - Recommendation: Start with 0.3 for warning, 0.5 for grouping; tune based on real data

2. **How to handle same product, same vendor, different sizes**
   - What we know: "Hip Implant 28mm" vs "Hip Implant 32mm" will have high similarity
   - What's unclear: Should sizes be treated as same product or different?
   - Recommendation: For price comparison, group if >70% similar; let user disambiguate

3. **Should price comparison appear in product detail or catalog view?**
   - What we know: Requirements say "all vendor prices at a glance"
   - What's unclear: Is this in the existing ProductSheet or a new comparison view?
   - Recommendation: Add to ProductSheet first (simplest); can add dedicated view later

## Sources

### Primary (HIGH confidence)
- [PostgreSQL pg_trgm Documentation](https://www.postgresql.org/docs/current/pgtrgm.html) - Official documentation for similarity functions, operators, and indexing
- [Supabase Extensions Overview](https://supabase.com/docs/guides/database/extensions) - Confirms pg_trgm availability

### Secondary (MEDIUM confidence)
- [Supabase pg_trgm Discussion](https://github.com/orgs/supabase/discussions/12110) - Setting similarity threshold in RPC functions
- [Neon pg_trgm Docs](https://neon.com/docs/extensions/pg_trgm) - GIN vs GiST index guidance

### Tertiary (LOW confidence)
- Various WebSearch results on e-commerce product deduplication patterns
- Community examples of similarity search with Supabase RPC

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pg_trgm is well-documented PostgreSQL extension, available in Supabase
- Architecture: HIGH - RPC function pattern is standard Supabase practice
- Pitfalls: MEDIUM - Based on pg_trgm documentation and general experience

**Research date:** 2026-02-02
**Valid until:** 2026-04-02 (60 days - pg_trgm is stable, unlikely to change)
