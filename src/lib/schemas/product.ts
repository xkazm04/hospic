import { z } from "zod";

// Special prefix for new vendors to be created during form submission
const NEW_VENDOR_PREFIX = '__new__:';

// Custom validator for vendor_id: accepts UUID or new vendor prefix
const vendorIdSchema = z.string().refine(
  (val) => {
    if (!val) return true; // Allow empty
    if (val.startsWith(NEW_VENDOR_PREFIX)) return true; // Allow new vendor format
    // Check if it's a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val);
  },
  { message: "Invalid vendor ID" }
).nullable().optional();

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  description: z.string().max(2000, "Description too long").nullable().optional(),
  price: z.coerce.number().positive("Price must be positive").nullable().optional(),
  vendor_id: vendorIdSchema,
  emdn_category_id: z.string().uuid("Invalid category ID").nullable().optional(),
  material_id: z.string().uuid("Invalid material ID").nullable().optional(),
  udi_di: z.string().max(14, "UDI-DI max 14 characters").nullable().optional(),
  ce_marked: z.boolean().default(false),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().optional(),
  manufacturer_name: z.string().max(255, "Manufacturer name too long").nullable().optional(),
  manufacturer_sku: z.string().max(100, "Manufacturer SKU too long").nullable().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
