"use server";

import { ai, EXTRACTION_MODEL } from "@/lib/gemini/client";
import {
  extractedProductSchema,
  extractedProductJsonSchema,
  type ExtractedProduct,
} from "@/lib/schemas/extraction";

interface ExtractionResult {
  success: boolean;
  data?: ExtractedProduct;
  error?: string;
}

/**
 * Extract structured product data from an uploaded vendor product sheet.
 *
 * Accepts FormData with a "file" field containing a .txt or .md file.
 * Uses Gemini AI with structured output to extract product information.
 *
 * @param formData - FormData containing "file" field
 * @returns ExtractionResult with success/data or error
 */
export async function extractFromProductSheet(
  formData: FormData
): Promise<ExtractionResult> {
  const file = formData.get("file") as File | null;

  // Validate file exists
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Validate file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".txt") && !fileName.endsWith(".md")) {
    return { success: false, error: "Only .txt and .md files are supported" };
  }

  // Read file content
  const content = await file.text();

  // Validate content length (50KB limit)
  if (content.length > 50000) {
    return { success: false, error: "File too large (max 50KB)" };
  }

  try {
    const response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: buildExtractionPrompt(content),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: extractedProductJsonSchema,
      },
    });

    // Parse and validate the response
    if (!response.text) {
      return { success: false, error: "No response from AI model" };
    }
    const parsed = JSON.parse(response.text);
    const validated = extractedProductSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Extraction failed unexpectedly",
    };
  }
}

/**
 * Build the extraction prompt for Gemini.
 *
 * Instructs the AI to extract structured product data from vendor sheets,
 * with specific guidance for EMDN classification and MDR handling.
 */
function buildExtractionPrompt(content: string): string {
  return `You are a medical device data extraction assistant. Extract structured product information from the following vendor product sheet.

IMPORTANT GUIDELINES:
- Extract exactly what is stated; do not infer missing data
- For price, extract numeric value only (no currency symbols)
- For EMDN, suggest code from orthopedic categories: P09 (bone/prosthetic), P0901 (bone implants), P0902 (joint implants), P10 (external devices)
- For MDR class, only extract if explicitly stated (I, IIa, IIb, or III)
- Set fields to null if information is not found

VENDOR PRODUCT SHEET:
${content}`;
}
