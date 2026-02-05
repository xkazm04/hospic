-- Migration: 011_add_emdn_to_price_comparison.sql
-- Purpose: Add EMDN code to price comparison results

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS get_product_price_comparison(UUID, REAL);

-- Update RPC function: Get all similar products for price comparison
-- Now includes emdn_code for display in comparison table
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
  emdn_code TEXT,
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
    -- Extract only the last level of EMDN code (after the last dot)
    CASE
      WHEN e.code IS NOT NULL THEN
        CASE
          WHEN position('.' IN e.code) > 0 THEN
            substring(e.code from '([^.]+)$')
          ELSE e.code
        END
      ELSE NULL
    END AS emdn_code,
    similarity(LOWER(p.name), LOWER(target_name)) AS similarity
  FROM products p
  LEFT JOIN vendors v ON p.vendor_id = v.id
  LEFT JOIN emdn_categories e ON p.emdn_category_id = e.id
  WHERE similarity(LOWER(p.name), LOWER(target_name)) > similarity_threshold
  ORDER BY p.price ASC NULLS LAST;
END;
$$;

-- Restore execute permissions
GRANT EXECUTE ON FUNCTION get_product_price_comparison TO anon, authenticated;
