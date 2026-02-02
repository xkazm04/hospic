-- Vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EMDN Categories (hierarchical)
CREATE TABLE emdn_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES emdn_categories(id),
  depth INTEGER NOT NULL DEFAULT 0,
  path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_emdn_parent ON emdn_categories(parent_id);
CREATE INDEX idx_emdn_path ON emdn_categories(path);
CREATE INDEX idx_emdn_code ON emdn_categories(code);

-- Materials lookup
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  vendor_id UUID REFERENCES vendors(id),
  emdn_category_id UUID REFERENCES emdn_categories(id),
  material_id UUID REFERENCES materials(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_emdn ON products(emdn_category_id);
CREATE INDEX idx_products_material ON products(material_id);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_sku ON products(sku);

-- RLS Policies (public read for catalog)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE emdn_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Public read emdn" ON emdn_categories FOR SELECT USING (true);
CREATE POLICY "Public read materials" ON materials FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
