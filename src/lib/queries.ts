import { createClient } from "@/lib/supabase/server";
import type { EMDNCategory, Material, ProductWithRelations, Vendor } from "@/lib/types";

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

  // Apply category filter
  if (category) {
    query = query.eq("emdn_category_id", category);
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
    console.error("Error fetching products:", error);
    return { data: [], count: 0, error };
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
    console.error("Error fetching vendors:", error);
    return [];
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
    console.error("Error fetching materials:", error);
    return [];
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
    console.error("Error fetching EMDN categories:", error);
    return [];
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
