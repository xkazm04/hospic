import { z } from "zod";

/**
 * Schema for AI-extracted product data from vendor product sheets.
 *
 * Key difference from productSchema: This schema has vendor_name, manufacturer_name,
 * and material_name as strings (extracted text), not UUIDs.
 * The preview form will resolve these to IDs later.
 */
export const extractedProductSchema = z.object({
  name: z.string().describe("Product name as stated by manufacturer/vendor"),
  sku: z.string().describe("Catalog number, REF, part number, or SKU"),
  description: z.string().nullable().describe("Full product description including features and intended use"),
  price: z.number().nullable().describe("Unit price (numeric only, no currency symbols)"),
  price_currency: z.enum(["EUR", "CZK", "PLN"]).nullable().describe("Currency of the extracted price: EUR, CZK, or PLN. Null if price is null or currency unknown"),
  vendor_name: z.string().nullable().describe("Distributor or vendor company name (may be different from manufacturer)"),
  manufacturer_name: z.string().nullable().describe("Original manufacturer/OEM company name"),
  material_name: z.string().nullable().describe("Primary material composition (e.g., Titanium Ti-6Al-4V, PEEK, Cobalt-Chrome)"),
  ce_marked: z.boolean().describe("True if CE marking or EU MDR compliance is mentioned"),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().describe("MDR risk classification if explicitly stated"),
  udi_di: z.string().nullable().describe("UDI-DI identifier if provided (max 14 characters)"),
  suggested_emdn: z.string().nullable().describe("Suggested EMDN code based on product type (e.g., P090201 for hip implants)"),
  emdn_source: z.enum(["eudamed", "document", "inferred"]).nullable().describe("Source of the EMDN classification: 'eudamed' if found on EUDAMED, 'document' if explicitly stated in the source document/spreadsheet, 'inferred' if deduced by the model"),
  emdn_rationale: z.string().nullable().describe("Brief explanation (1-2 sentences) of why this EMDN category was chosen based on product characteristics"),
  product_url: z.string().nullable().describe("Official product page URL from manufacturer or vendor website, if known"),
});

export type ExtractedProduct = z.infer<typeof extractedProductSchema>;

/**
 * JSON Schema representation for Gemini structured output.
 * Uses Zod v4 native conversion with draft-2020-12 target.
 */
export const extractedProductJsonSchema = z.toJSONSchema(extractedProductSchema, {
  target: "draft-2020-12",
});
