-- Migration: 005_category_descendants.sql
-- Purpose: Enable filtering products by category and all its descendants
-- Uses path prefix matching on existing emdn_categories.path column

-- Ensure path column has proper index for LIKE prefix queries
CREATE INDEX IF NOT EXISTS idx_emdn_path_pattern
  ON emdn_categories (path text_pattern_ops);

-- RPC function: Get all descendant category IDs for a given category
-- Returns the category itself plus all children (recursive via path prefix)
CREATE OR REPLACE FUNCTION get_category_descendants(parent_category_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_path TEXT;
BEGIN
  -- Get the parent's path
  SELECT path INTO parent_path
  FROM emdn_categories
  WHERE id = parent_category_id;

  IF parent_path IS NULL THEN
    -- Category not found, return just the ID (may still exist without path)
    RETURN QUERY SELECT parent_category_id;
    RETURN;
  END IF;

  -- Return parent category + all descendants (path starts with parent_path/)
  RETURN QUERY
  SELECT id FROM emdn_categories
  WHERE id = parent_category_id  -- The parent itself
     OR path LIKE parent_path || '/%';  -- All descendants
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_category_descendants TO anon, authenticated;
