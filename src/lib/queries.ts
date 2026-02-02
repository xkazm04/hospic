import { createClient } from "@/lib/supabase/server";
import type { EMDNCategory, Material, ProductWithRelations, Vendor } from "@/lib/types";

// Mock data for when Supabase is not configured
const MOCK_VENDORS: Vendor[] = [
  { id: "v1", name: "DePuy Synthes", code: "DEPUY", website: "https://depuysynthes.com", created_at: "2024-01-01", updated_at: "2024-01-01" },
  { id: "v2", name: "Stryker", code: "STRYKER", website: "https://stryker.com", created_at: "2024-01-01", updated_at: "2024-01-01" },
];

const MOCK_MATERIALS: Material[] = [
  { id: "m1", name: "Titanium Alloy", code: "TI6AL4V" },
  { id: "m2", name: "Cobalt Chrome", code: "COCR" },
];

const MOCK_CATEGORIES: EMDNCategory[] = [
  { id: "c1", code: "P09", name: "Orthopaedic and prosthetic devices", parent_id: null, depth: 0, path: "P09", created_at: "2024-01-01" },
  { id: "c2", code: "P0901", name: "Orthopaedic bone implants", parent_id: "c1", depth: 1, path: "P09/P0901", created_at: "2024-01-01" },
];

const MOCK_PRODUCTS: ProductWithRelations[] = [
  {
    id: "p1",
    name: "Hip Stem Titanium - Standard",
    sku: "HS-TI-001",
    description: "Primary hip stem implant made from titanium alloy, suitable for cemented or press-fit fixation",
    price: 2450.00,
    vendor_id: "v1",
    emdn_category_id: "c2",
    material_id: "m1",
    udi_di: "00850123456789",
    ce_marked: true,
    mdr_class: "IIb",
    manufacturer_name: "DePuy Synthes Inc.",
    manufacturer_sku: "HS-001-TI",
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
    vendor: MOCK_VENDORS[0],
    emdn_category: MOCK_CATEGORIES[1],
    material: MOCK_MATERIALS[0],
  },
  {
    id: "p2",
    name: "Knee Replacement System - Total",
    sku: "KR-COCR-002",
    description: "Complete knee replacement system with femoral component, tibial baseplate, and polyethylene insert",
    price: 4890.00,
    vendor_id: "v2",
    emdn_category_id: "c2",
    material_id: "m2",
    udi_di: "00850987654321",
    ce_marked: true,
    mdr_class: "III",
    manufacturer_name: "Stryker Corporation",
    manufacturer_sku: "KRS-002-COCR",
    created_at: "2024-01-20",
    updated_at: "2024-01-20",
    vendor: MOCK_VENDORS[1],
    emdn_category: MOCK_CATEGORIES[1],
    material: MOCK_MATERIALS[1],
  },
];

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  vendor?: string;
  category?: string;
  material?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetProductsResult {
  data: ProductWithRelations[];
  count: number;
  error: Error | null;
}

export async function getProducts(params: GetProductsParams = {}): Promise<GetProductsResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    vendor,
    category,
    material,
    minPrice,
    maxPrice,
    sortBy = "name",
    sortOrder = "asc",
  } = params;

  const supabase = await createClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      sku,
      description,
      price,
      vendor_id,
      emdn_category_id,
      material_id,
      udi_di,
      ce_marked,
      mdr_class,
      created_at,
      updated_at,
      vendor:vendors(id, name, code, website, created_at, updated_at),
      emdn_category:emdn_categories(id, code, name, parent_id, depth, path, created_at),
      material:materials(id, name, code)
    `,
      { count: "exact" }
    );

  // Apply search filter
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`
    );
  }

  // Apply vendor filter (comma-separated IDs)
  if (vendor) {
    const vendorIds = vendor.split(",").filter(Boolean);
    if (vendorIds.length > 0) {
      query = query.in("vendor_id", vendorIds);
    }
  }

  // Apply category filter (includes all descendants)
  if (category) {
    // Get all descendant category IDs using RPC function
    const { data: categoryIds } = await supabase
      .rpc("get_category_descendants", { parent_category_id: category });

    if (categoryIds && categoryIds.length > 0) {
      query = query.in("emdn_category_id", categoryIds);
    } else {
      // Fallback to exact match if RPC fails
      query = query.eq("emdn_category_id", category);
    }
  }

  // Apply material filter (comma-separated IDs)
  if (material) {
    const materialIds = material.split(",").filter(Boolean);
    if (materialIds.length > 0) {
      query = query.in("material_id", materialIds);
    }
  }

  // Apply price range filter
  if (minPrice !== undefined && !isNaN(minPrice)) {
    query = query.gte("price", minPrice);
  }
  if (maxPrice !== undefined && !isNaN(maxPrice)) {
    query = query.lte("price", maxPrice);
  }

  // Apply sorting
  const validSortColumns = ["name", "sku", "price", "created_at"];
  const column = validSortColumns.includes(sortBy) ? sortBy : "name";
  query = query.order(column, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching products (using mock data):", error.message);
    // Return mock data when Supabase is not configured
    return { data: MOCK_PRODUCTS, count: MOCK_PRODUCTS.length, error: null };
  }

  return {
    data: (data as unknown as ProductWithRelations[]) || [],
    count: count || 0,
    error: null,
  };
}

export async function getVendors(): Promise<Vendor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching vendors (using mock data):", error.message);
    return MOCK_VENDORS;
  }

  return data || [];
}

export async function getMaterials(): Promise<Material[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching materials (using mock data):", error.message);
    return MOCK_MATERIALS;
  }

  return data || [];
}

export async function getEMDNCategoriesFlat(): Promise<EMDNCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("emdn_categories")
    .select("*")
    .order("code");

  if (error) {
    console.error("Error fetching EMDN categories (using mock data):", error.message);
    return MOCK_CATEGORIES;
  }

  return data || [];
}

export interface CategoryNode extends EMDNCategory {
  children: CategoryNode[];
}

export async function getEMDNCategories(): Promise<CategoryNode[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("emdn_categories")
    .select("*")
    .order("code");

  if (error) {
    console.error("Error fetching EMDN categories (using mock data):", error.message);
    // Build mock tree
    const mockRoot: CategoryNode = { ...MOCK_CATEGORIES[0], children: [] };
    const mockChild: CategoryNode = { ...MOCK_CATEGORIES[1], children: [] };
    mockRoot.children.push(mockChild);
    return [mockRoot];
  }

  // Build tree structure
  const categories = data || [];
  const categoryMap = new Map<string, CategoryNode>();
  const rootCategories: CategoryNode[] = [];

  // First pass: create nodes
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  });

  return rootCategories;
}
