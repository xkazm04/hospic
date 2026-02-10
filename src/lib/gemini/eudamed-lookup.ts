import { getAIClient, EXTRACTION_MODEL } from "./client";

export interface EudamedLookupResult {
  code: string | null;
  source: "eudamed" | "inferred";
  rationale: string | null;
}

const EMDN_CODE_REGEX = /P\d{2,}/;

/**
 * Look up EMDN classification for a product via Gemini + Google Search grounding.
 *
 * Uses a separate text-mode Gemini call (structured JSON output is incompatible
 * with Google Search grounding). Searches EUDAMED for the product by name and
 * manufacturer, returning the deepest EMDN code found.
 *
 * Falls back silently on any failure — returns null code so the caller can
 * keep whatever classification it already has.
 */
export async function lookupEmdnViaEudamed(
  productName: string,
  manufacturer?: string | null,
  sku?: string | null
): Promise<EudamedLookupResult> {
  const nullResult: EudamedLookupResult = {
    code: null,
    source: "inferred",
    rationale: null,
  };

  try {
    const ai = getAIClient();

    const searchTerms = [productName, manufacturer, sku]
      .filter(Boolean)
      .join(" ");

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
RATIONALE: <brief explanation of how you found or inferred this code>

Example response:
EMDN_CODE: P0908030102
SOURCE: eudamed
RATIONALE: Found in EUDAMED under Stryker registration for Trident II Tritanium Shell, classified as uncemented acetabular cup.

Another example (not found):
EMDN_CODE: NOT_FOUND
SOURCE: inferred
RATIONALE: Could not find product or manufacturer on EUDAMED. Unable to determine EMDN classification.`;

    const response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (!response.text) {
      return nullResult;
    }

    return parseEudamedResponse(response.text);
  } catch {
    return nullResult;
  }
}

/**
 * Parse the 3-line structured text response from Gemini.
 */
function parseEudamedResponse(text: string): EudamedLookupResult {
  const lines = text.trim().split("\n");

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
