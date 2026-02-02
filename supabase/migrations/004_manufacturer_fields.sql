-- Migration: 004_manufacturer_fields.sql
-- Purpose: Add manufacturer tracking fields to products table.
-- These fields enable tracking original manufacturer information separate from vendor (supplier).
-- Critical for v1.1 bulk import feature which imports manufacturer data from CSV files.

-- Add manufacturer_name column (nullable, no default for instant operation)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_name TEXT;

-- Add manufacturer_sku column (nullable, no default for instant operation)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_sku TEXT;

-- Create partial index on manufacturer_sku for fast lookup when value exists
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_sku
  ON products (manufacturer_sku)
  WHERE manufacturer_sku IS NOT NULL;

-- Create trigram GIN index on manufacturer_name for similarity search
-- (pg_trgm extension already enabled from 003_similarity_search.sql)
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_name_trgm
  ON products USING GIN (manufacturer_name gin_trgm_ops);

-- Verification query: confirm columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'manufacturer_name'
  ) THEN
    RAISE NOTICE 'Column manufacturer_name exists';
  ELSE
    RAISE EXCEPTION 'Column manufacturer_name not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'manufacturer_sku'
  ) THEN
    RAISE NOTICE 'Column manufacturer_sku exists';
  ELSE
    RAISE EXCEPTION 'Column manufacturer_sku not found';
  END IF;
END $$;
