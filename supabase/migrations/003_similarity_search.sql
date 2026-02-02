-- Migration: 003_similarity_search.sql
-- Purpose: Enable pg_trgm extension for text similarity search and create RPC functions
-- for finding similar products and price comparison across vendors.

-- Enable pg_trgm extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fast similarity search on product names
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

-- Create GIN index for fast similarity search on product SKUs
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON products USING GIN (sku gin_trgm_ops);

-- RPC function: Find products similar to given name/sku
-- Used during extraction preview to warn about duplicates
-- Returns products with similarity above threshold, ordered by best match
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
-- Returns products similar to target product, ordered by price ascending
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
  -- Get the name of the target product
  SELECT p.name INTO target_name FROM products p WHERE p.id = product_id;

  -- Return empty if product not found
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

-- Grant execute permissions for RLS (both anonymous and authenticated users)
GRANT EXECUTE ON FUNCTION find_similar_products TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_price_comparison TO anon, authenticated;
