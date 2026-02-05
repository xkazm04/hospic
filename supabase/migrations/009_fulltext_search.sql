-- Migration: Add full-text search for products
-- This migration adds a tsvector column and GIN index for fast full-text search
-- instead of using ILIKE which doesn't scale well

-- Add generated tsvector column for full-text search
ALTER TABLE products
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(sku, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(manufacturer_name, '')), 'D')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector
ON products USING GIN (search_vector);

-- Create function for searching products with ranking
CREATE OR REPLACE FUNCTION search_products(search_query text)
RETURNS TABLE (
  id uuid,
  rank real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM products p
  WHERE p.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_products(text) TO anon, authenticated;

COMMENT ON COLUMN products.search_vector IS 'Generated tsvector for full-text search. Weights: A=name, B=sku, C=description, D=manufacturer';
