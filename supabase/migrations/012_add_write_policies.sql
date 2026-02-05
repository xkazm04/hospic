-- Migration: 012_add_write_policies.sql
-- Purpose: Add INSERT, UPDATE, DELETE policies for vendors and products tables

-- Vendors table - allow public write access
CREATE POLICY "Public insert vendors" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vendors" ON vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete vendors" ON vendors FOR DELETE USING (true);

-- Products table - allow public write access
CREATE POLICY "Public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete products" ON products FOR DELETE USING (true);

-- Materials table - allow public write access (for future use)
CREATE POLICY "Public insert materials" ON materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update materials" ON materials FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete materials" ON materials FOR DELETE USING (true);
