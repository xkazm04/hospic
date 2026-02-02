/**
 * EMDN Enrichment Script
 *
 * Enriches a CSV file with EMDN codes using Gemini AI.
 * Reads product names, classifies them into orthopedic EMDN categories,
 * and outputs an enriched CSV ready for bulk import.
 *
 * Usage: npx tsx scripts/enrich-csv-emdn.ts [input.csv] [output.csv]
 *
 * Defaults:
 *   input:  docs/BornDigital DATA(SVK).csv
 *   output: docs/BornDigital DATA(SVK)-enriched.csv
 *
 * Requires:
 * - GEMINI_API_KEY in .env or .env.local
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import * as Papa from "papaparse";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY environment variable is required");
  console.error("Add it to .env.local or .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.0-flash";

// Configuration
const BATCH_SIZE = 25; // Products per API call
const RATE_LIMIT_DELAY = 1000; // ms between API calls

// Input/output paths
const DEFAULT_INPUT = "docs/BornDigital DATA(SVK).csv";
const DEFAULT_OUTPUT = "docs/BornDigital DATA(SVK)-enriched.csv";
const EMDN_EXCEL = "docs/EMDN V2_EN.xlsx";

interface EMDNCategory {
  code: string;
  name: string;
  level: number;
}

interface ProductClassification {
  productName: string;
  emdnCode: string | null;
  confidence: "high" | "medium" | "low";
}

/**
 * Load orthopedic EMDN categories from Excel file
 */
function loadEMDNCategories(): EMDNCategory[] {
  const filePath = path.resolve(process.cwd(), EMDN_EXCEL);

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: EMDN file not found: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  const categories: EMDNCategory[] = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const code = row[2]?.toString()?.trim();
    const name = row[3]?.toString()?.trim();
    const level = Number(row[4]);

    if (!code || !name || isNaN(level)) continue;

    // Only orthopedic categories (P09, P10)
    if (code.startsWith("P09") || code.startsWith("P10")) {
      categories.push({ code, name, level });
    }
  }

  return categories;
}

/**
 * Format EMDN categories for the prompt
 */
function formatCategoriesForPrompt(categories: EMDNCategory[]): string {
  // Group by top-level for readability
  const grouped: Record<string, EMDNCategory[]> = {};

  for (const cat of categories) {
    const prefix = cat.code.substring(0, 4); // P09, P10, etc.
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(cat);
  }

  let result = "";
  for (const [prefix, cats] of Object.entries(grouped)) {
    result += `\n## ${prefix} Categories:\n`;
    for (const cat of cats.slice(0, 50)) { // Limit per group to avoid huge prompts
      result += `- ${cat.code}: ${cat.name}\n`;
    }
    if (cats.length > 50) {
      result += `... and ${cats.length - 50} more\n`;
    }
  }

  return result;
}

/**
 * Classify a batch of products using Gemini
 */
async function classifyBatch(
  products: string[],
  categoriesPrompt: string
): Promise<ProductClassification[]> {
  const prompt = `You are a medical device classification expert. Classify each orthopedic product into the most appropriate EMDN category.

AVAILABLE EMDN CATEGORIES (orthopedic only):
${categoriesPrompt}

PRODUCTS TO CLASSIFY:
${products.map((p, i) => `${i + 1}. ${p}`).join("\n")}

For each product, respond with a JSON array of objects:
[
  {"productName": "exact product name", "emdnCode": "P09xx or null", "confidence": "high|medium|low"},
  ...
]

Rules:
- Use the most specific EMDN code that matches
- Set emdnCode to null if no good match exists
- confidence: "high" = clear match, "medium" = reasonable guess, "low" = uncertain
- Return exactly ${products.length} classifications in the same order`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = response.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("  Warning: Could not parse response, returning nulls");
      return products.map((p) => ({ productName: p, emdnCode: null, confidence: "low" as const }));
    }

    const parsed = JSON.parse(jsonMatch[0]) as ProductClassification[];
    return parsed;
  } catch (error) {
    console.error("  API error:", error instanceof Error ? error.message : error);
    return products.map((p) => ({ productName: p, emdnCode: null, confidence: "low" as const }));
  }
}

/**
 * Main enrichment function
 */
async function enrichCSV(inputPath: string, outputPath: string) {
  console.log("=== EMDN Enrichment Script ===\n");

  // Load EMDN categories
  console.log("Loading EMDN categories...");
  const categories = loadEMDNCategories();
  console.log(`  Found ${categories.length} orthopedic categories\n`);

  const categoriesPrompt = formatCategoriesForPrompt(categories);

  // Load input CSV
  console.log(`Loading CSV: ${inputPath}`);
  const csvContent = fs.readFileSync(path.resolve(process.cwd(), inputPath), "utf-8");
  const parseResult = Papa.parse<Record<string, string>>(csvContent, { header: true });

  if (parseResult.errors.length > 0) {
    console.warn("  CSV parse warnings:", parseResult.errors.slice(0, 3));
  }

  const rows = parseResult.data;
  console.log(`  Loaded ${rows.length} rows\n`);

  // Find the product name column
  const nameColumn = Object.keys(rows[0] || {}).find((k) =>
    k.toLowerCase().includes("material name")
  );

  if (!nameColumn) {
    console.error("ERROR: Could not find 'Material Name' column in CSV");
    process.exit(1);
  }

  console.log(`  Using column: "${nameColumn}"\n`);

  // Extract unique product names
  const uniqueNames = new Map<string, string>(); // normalized -> original
  for (const row of rows) {
    const name = row[nameColumn]?.trim();
    if (name) {
      const normalized = name.toLowerCase();
      if (!uniqueNames.has(normalized)) {
        uniqueNames.set(normalized, name);
      }
    }
  }

  const productNames = Array.from(uniqueNames.values());
  console.log(`Found ${productNames.length} unique products to classify\n`);

  // Classify in batches
  const classifications = new Map<string, ProductClassification>();
  const batches = Math.ceil(productNames.length / BATCH_SIZE);

  console.log(`Classifying products (${batches} batches of ${BATCH_SIZE})...\n`);

  for (let i = 0; i < productNames.length; i += BATCH_SIZE) {
    const batch = productNames.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`  Batch ${batchNum}/${batches}...`);

    const results = await classifyBatch(batch, categoriesPrompt);

    for (const result of results) {
      const normalized = result.productName.toLowerCase();
      classifications.set(normalized, result);
    }

    console.log(` classified ${results.length} products`);

    // Rate limiting
    if (i + BATCH_SIZE < productNames.length) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }

  // Summary
  const withCode = Array.from(classifications.values()).filter((c) => c.emdnCode);
  const highConf = withCode.filter((c) => c.confidence === "high");
  const medConf = withCode.filter((c) => c.confidence === "medium");

  console.log(`\nClassification summary:`);
  console.log(`  Total products: ${classifications.size}`);
  console.log(`  With EMDN code: ${withCode.length} (${Math.round((withCode.length / classifications.size) * 100)}%)`);
  console.log(`  High confidence: ${highConf.length}`);
  console.log(`  Medium confidence: ${medConf.length}`);

  // Enrich original rows
  console.log(`\nEnriching CSV rows...`);

  const enrichedRows = rows.map((row) => {
    const name = row[nameColumn]?.trim();
    const normalized = name?.toLowerCase() || "";
    const classification = classifications.get(normalized);

    return {
      ...row,
      emdn_code: classification?.emdnCode || "",
      emdn_confidence: classification?.confidence || "",
    };
  });

  // Write output CSV
  const outputCSV = Papa.unparse(enrichedRows);
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), outputCSV, "utf-8");

  console.log(`\nOutput written to: ${outputPath}`);
  console.log(`  Total rows: ${enrichedRows.length}`);
  console.log(`  New columns: emdn_code, emdn_confidence`);
  console.log("\nDone!");
}

// Run
const inputPath = process.argv[2] || DEFAULT_INPUT;
const outputPath = process.argv[3] || DEFAULT_OUTPUT;

enrichCSV(inputPath, outputPath).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
