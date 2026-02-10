/**
 * Test EUDAMED EMDN lookup on existing products.
 *
 * Usage:
 *   npx tsx scripts/recategorize-with-eudamed.ts              # 10 products, dry-run
 *   npx tsx scripts/recategorize-with-eudamed.ts --limit 5    # custom limit
 *   npx tsx scripts/recategorize-with-eudamed.ts --apply      # update DB
 */

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { writeFileSync } from "fs";

config();

// --- CLI args ---
const args = process.argv.slice(2);
const applyMode = args.includes("--apply");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 10;

if (isNaN(limit) || limit < 1) {
  console.error("Invalid --limit value");
  process.exit(1);
}

// --- Clients ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-3-flash-preview";

// --- Types ---
interface ProductRow {
  id: string;
  name: string;
  manufacturer_name: string | null;
  sku: string | null;
  emdn_category_id: string | null;
  current_emdn_code: string | null;
}

interface LookupResult {
  productId: string;
  productName: string;
  manufacturer: string | null;
  oldCode: string | null;
  newCode: string | null;
  source: "eudamed" | "inferred";
  rationale: string | null;
  changed: boolean;
  error: string | null;
}

// --- EMDN code regex ---
const EMDN_CODE_REGEX = /P\d{2,}/;

// --- Core lookup (standalone, doesn't import from Next.js modules) ---
async function lookupEmdn(
  productName: string,
  manufacturer?: string | null,
  sku?: string | null
): Promise<{ code: string | null; source: "eudamed" | "inferred"; rationale: string | null }> {
  const searchTerms = [productName, manufacturer, sku].filter(Boolean).join(" ");

  const prompt = `You are a medical device regulatory specialist. Your task is to find the EMDN (European Medical Device Nomenclature) classification code for a specific product by searching the EU EUDAMED database.

## Product to classify
- Product name: ${productName}
${manufacturer ? `- Manufacturer: ${manufacturer}` : ""}
${sku ? `- SKU/REF: ${sku}` : ""}

## Instructions
1. Search EUDAMED (ec.europa.eu/tools/eudamed) for this product or manufacturer
2. Look for the EMDN code assigned to this device or similar devices from the same manufacturer
3. EMDN codes for orthopedic implants start with P09 (e.g., P090803 = hip acetabular components)
4. Use the DEEPEST (most specific) code you can find — longer codes are more specific
5. If you cannot find the exact product on EUDAMED, check the manufacturer's other registered devices for the same product family
6. If EUDAMED search fails, you may infer the code from the product type — but mark source as "inferred"

## Search query suggestion
Try searching for: ${searchTerms}

## Required response format (exactly 3 lines)
EMDN_CODE: <code or NOT_FOUND>
SOURCE: <eudamed or inferred>
RATIONALE: <brief explanation of how you found or inferred this code>`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  if (!response.text) {
    return { code: null, source: "inferred", rationale: null };
  }

  // Parse response
  const lines = response.text.trim().split("\n");
  let code: string | null = null;
  let source: "eudamed" | "inferred" = "inferred";
  let rationale: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("EMDN_CODE:")) {
      const value = trimmed.replace("EMDN_CODE:", "").trim();
      if (value !== "NOT_FOUND") {
        const match = value.match(EMDN_CODE_REGEX);
        code = match ? match[0] : null;
      }
    } else if (trimmed.startsWith("SOURCE:")) {
      const value = trimmed.replace("SOURCE:", "").trim().toLowerCase();
      source = value === "eudamed" ? "eudamed" : "inferred";
    } else if (trimmed.startsWith("RATIONALE:")) {
      rationale = trimmed.replace("RATIONALE:", "").trim() || null;
    }
  }

  return { code, source, rationale };
}

// --- Main ---
async function main() {
  console.log(`\n=== EUDAMED EMDN Recategorization ===`);
  console.log(`Mode: ${applyMode ? "APPLY (will update DB)" : "DRY RUN"}`);
  console.log(`Limit: ${limit} products\n`);

  // Fetch products with manufacturer_name (better EUDAMED match rate)
  // Join emdn_categories to get current code
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      manufacturer_name,
      sku,
      emdn_category_id,
      emdn_categories!products_emdn_category_id_fkey ( code )
    `
    )
    .not("manufacturer_name", "is", null)
    .order("name")
    .limit(limit);

  if (error) {
    console.error("Failed to fetch products:", error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("No products found with manufacturer_name.");
    return;
  }

  // Map to typed rows
  const rows: ProductRow[] = products.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    manufacturer_name: p.manufacturer_name as string | null,
    sku: p.sku as string | null,
    emdn_category_id: p.emdn_category_id as string | null,
    current_emdn_code:
      (p.emdn_categories as Record<string, unknown> | null)?.code as string | null,
  }));

  console.log(`Found ${rows.length} products to process.\n`);

  const results: LookupResult[] = [];
  let found = 0;
  let changed = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const product = rows[i];
    const label = `[${i + 1}/${rows.length}]`;

    console.log(`${label} ${product.name}`);
    console.log(`  Manufacturer: ${product.manufacturer_name || "N/A"}`);
    console.log(`  Current EMDN: ${product.current_emdn_code || "none"}`);

    try {
      const result = await lookupEmdn(
        product.name,
        product.manufacturer_name,
        product.sku
      );

      const isChanged =
        result.code !== null && result.code !== product.current_emdn_code;

      if (result.code) {
        found++;
        if (isChanged) changed++;
        console.log(`  → New EMDN: ${result.code} (${result.source})`);
        console.log(`  → Rationale: ${result.rationale}`);
        if (isChanged) {
          console.log(`  ⚡ CHANGED from ${product.current_emdn_code || "none"}`);
        }
      } else {
        notFound++;
        console.log(`  → NOT FOUND`);
      }

      results.push({
        productId: product.id,
        productName: product.name,
        manufacturer: product.manufacturer_name,
        oldCode: product.current_emdn_code,
        newCode: result.code,
        source: result.source,
        rationale: result.rationale,
        changed: isChanged,
        error: null,
      });

      // Apply to DB if --apply and code changed
      if (applyMode && isChanged && result.code) {
        const { data: category } = await supabase
          .from("emdn_categories")
          .select("id")
          .eq("code", result.code)
          .single();

        if (category) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ emdn_category_id: category.id })
            .eq("id", product.id);

          if (updateError) {
            console.log(`  ❌ DB update failed: ${updateError.message}`);
          } else {
            console.log(`  ✅ DB updated`);
          }
        } else {
          console.log(
            `  ⚠ EMDN code ${result.code} not found in emdn_categories table`
          );
        }
      }
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.log(`  ❌ Error: ${msg}`);
      results.push({
        productId: product.id,
        productName: product.name,
        manufacturer: product.manufacturer_name,
        oldCode: product.current_emdn_code,
        newCode: null,
        source: "inferred",
        rationale: null,
        changed: false,
        error: msg,
      });
    }

    console.log("");

    // Rate limit: 2s between requests
    if (i < rows.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // --- Summary ---
  console.log("=== Summary ===");
  console.log(`Total processed: ${rows.length}`);
  console.log(`Found EMDN code: ${found}`);
  console.log(`Changed (different from current): ${changed}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors: ${errors}`);

  const eudamedCount = results.filter((r) => r.source === "eudamed" && r.newCode).length;
  const inferredCount = results.filter((r) => r.source === "inferred" && r.newCode).length;
  console.log(`Source breakdown: ${eudamedCount} eudamed, ${inferredCount} inferred`);

  // --- Export CSV ---
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const csvPath = `eudamed-recategorization-${timestamp}.csv`;

  const csvHeader =
    "product_id,product_name,manufacturer,old_emdn,new_emdn,source,changed,rationale,error";
  const csvRows = results.map((r) =>
    [
      r.productId,
      `"${(r.productName || "").replace(/"/g, '""')}"`,
      `"${(r.manufacturer || "").replace(/"/g, '""')}"`,
      r.oldCode || "",
      r.newCode || "",
      r.source,
      r.changed,
      `"${(r.rationale || "").replace(/"/g, '""')}"`,
      `"${(r.error || "").replace(/"/g, '""')}"`,
    ].join(",")
  );

  writeFileSync(csvPath, [csvHeader, ...csvRows].join("\n"), "utf-8");
  console.log(`\nCSV exported: ${csvPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
