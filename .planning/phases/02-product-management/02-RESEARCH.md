# Phase 2: Product Management - Research

**Researched:** 2026-02-02
**Domain:** Product detail views, form editing, CRUD operations, EMDN hierarchy display, regulatory data presentation
**Confidence:** HIGH

## Summary

Phase 2 builds on the existing catalog foundation to add product management capabilities: viewing full product details, editing metadata, deleting products, and displaying regulatory information. Research confirms the existing stack (Next.js 15, Tailwind v4, Motion, Supabase) is well-suited for this phase.

For the product detail view, a side panel (Sheet/Drawer) pattern is recommended over a modal for better content accommodation. The existing row actions dropdown can trigger sheet opening. Form handling uses React Hook Form with Zod for type-safe validation, integrated with Next.js Server Actions for CRUD operations. The EMDN hierarchy explanation requires building the category path from the database's `path` field and displaying it in a breadcrumb-style component.

The database schema needs extension to support regulatory fields: UDI-DI, CE marking status, and MDR risk classification. These are standard EUDAMED fields for medical devices under EU MDR 2017/745.

**Primary recommendation:** Use Vaul-based Sheet component for product details (right-side panel), React Hook Form + Zod for editing, Server Actions for mutations, and extend the products table with regulatory fields.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.x | Server Actions for CRUD | Built-in mutations, form handling |
| @supabase/ssr | 0.8.x | Database operations | Already configured from Phase 1 |
| motion | 12.x | Sheet animations | Smooth enter/exit transitions |
| Tailwind CSS | 4.x | Sheet styling | @theme tokens for consistent design |

### New for Phase 2
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dialog | 1.1.x | Sheet/drawer primitive | Accessible, headless, pairs with existing Motion |
| react-hook-form | 7.x | Form state management | Minimal re-renders, TypeScript native |
| @hookform/resolvers | 3.x | Zod integration | Bridges RHF with Zod schemas |
| zod | 3.x | Schema validation | Type-safe validation, shared client/server |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Dialog | Vaul (vaul npm) | Vaul adds snap points and mobile gestures; heavier for desktop-first app |
| Radix Dialog | Headless UI Dialog | Similar capability; Radix has better composition API |
| React Hook Form | Native form + useActionState | RHF provides better DX for complex forms |
| Zod | Yup | Zod has better TypeScript integration |

**Installation:**
```bash
npm install @radix-ui/react-dialog react-hook-form @hookform/resolvers zod
```

## Architecture Patterns

### Recommended Component Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── sheet.tsx           # Radix Dialog-based sheet component
│   │   ├── button.tsx          # Consistent button styling
│   │   └── input.tsx           # Form input with label/error
│   ├── product/
│   │   ├── product-sheet.tsx   # Main product detail sheet
│   │   ├── product-form.tsx    # Edit form with RHF
│   │   ├── product-detail.tsx  # Read-only detail view
│   │   ├── emdn-breadcrumb.tsx # EMDN hierarchy display
│   │   ├── regulatory-info.tsx # UDI/CE/MDR display
│   │   └── delete-dialog.tsx   # Confirmation dialog
│   └── table/
│       └── columns.tsx         # Updated with sheet trigger
├── lib/
│   ├── schemas/
│   │   └── product.ts          # Zod schemas for products
│   └── actions/
│       └── products.ts         # Server Actions for CRUD
└── app/
    └── page.tsx                # Main catalog page
```

### Pattern 1: Sheet Component (Side Panel)
**What:** Slide-in panel from right side for product details
**When to use:** Viewing/editing details while maintaining list context

```typescript
// src/components/ui/sheet.tsx
// Built on Radix Dialog for accessibility
'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { forwardRef, ComponentPropsWithoutRef } from 'react'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className="fixed inset-0 z-50 bg-black/40"
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

interface SheetContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right'
}

const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', children, ...props }, ref) => (
    <SheetPortal>
      <AnimatePresence>
        <SheetOverlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </SheetOverlay>
        <DialogPrimitive.Content ref={ref} asChild {...props}>
          <motion.div
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed z-50 h-full bg-background border-l border-border shadow-lg ${
              side === 'right' ? 'right-0 top-0' : 'left-0 top-0'
            }`}
            style={{ width: 'min(500px, 90vw)' }}
          >
            <SheetClose className="absolute right-4 top-4 p-2 rounded-md hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </SheetClose>
            {children}
          </motion.div>
        </DialogPrimitive.Content>
      </AnimatePresence>
    </SheetPortal>
  )
)
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 py-4 border-b border-border">
    {children}
  </div>
)

const SheetTitle = DialogPrimitive.Title
const SheetDescription = DialogPrimitive.Description

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
```

### Pattern 2: Form with React Hook Form + Zod + Server Actions
**What:** Type-safe forms with client validation, server mutations
**When to use:** Editing product metadata

```typescript
// src/lib/schemas/product.ts
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
  description: z.string().max(2000, 'Description too long').nullable(),
  price: z.coerce.number().positive('Price must be positive').nullable(),
  vendor_id: z.string().uuid().nullable(),
  emdn_category_id: z.string().uuid().nullable(),
  material_id: z.string().uuid().nullable(),
  // Regulatory fields
  udi_di: z.string().max(14, 'UDI-DI max 14 characters').nullable(),
  ce_marked: z.boolean().default(false),
  mdr_class: z.enum(['I', 'IIa', 'IIb', 'III']).nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>

// src/lib/actions/products.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { productSchema } from '@/lib/schemas/product'

export async function updateProduct(id: string, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries())
  const validatedData = productSchema.safeParse(rawData)

  if (!validatedData.success) {
    return { error: validatedData.error.flatten() }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update(validatedData.data)
    .eq('id', id)

  if (error) {
    return { error: { formErrors: [error.message] } }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
```

```typescript
// src/components/product/product-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, ProductFormData } from '@/lib/schemas/product'
import { updateProduct } from '@/lib/actions/products'
import { useTransition } from 'react'
import type { ProductWithRelations } from '@/lib/types'

interface ProductFormProps {
  product: ProductWithRelations
  onSuccess?: () => void
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      vendor_id: product.vendor_id,
      emdn_category_id: product.emdn_category_id,
      material_id: product.material_id,
      udi_di: product.udi_di ?? null,
      ce_marked: product.ce_marked ?? false,
      mdr_class: product.mdr_class ?? null,
    },
  })

  const onSubmit = (data: ProductFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value))
        }
      })

      const result = await updateProduct(product.id, formData)
      if (result.success) {
        onSuccess?.()
      } else if (result.error) {
        // Handle server errors
        console.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields */}
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          {...form.register('name')}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
```

### Pattern 3: EMDN Hierarchy Breadcrumb
**What:** Display category hierarchy from path field
**When to use:** Showing product's EMDN classification with explanation

```typescript
// src/components/product/emdn-breadcrumb.tsx
'use client'

import { ChevronRight } from 'lucide-react'

interface EMDNBreadcrumbProps {
  path: string | null  // e.g., "P/P09/P0901/P090101"
  categoryName: string
}

export function EMDNBreadcrumb({ path, categoryName }: EMDNBreadcrumbProps) {
  if (!path) {
    return <span className="text-muted-foreground">Not classified</span>
  }

  // Parse path into segments
  const segments = path.split('/').filter(Boolean)

  // EMDN level descriptions
  const levelDescriptions: Record<number, string> = {
    0: 'Category',
    1: 'Group',
    2: 'Type Level 1',
    3: 'Type Level 2',
    4: 'Type Level 3',
    5: 'Type Level 4',
    6: 'Type Level 5',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center flex-wrap gap-1 text-sm">
        {segments.map((segment, index) => (
          <span key={segment} className="flex items-center">
            {index > 0 && <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" />}
            <span className={index === segments.length - 1 ? 'font-medium text-accent' : 'text-muted-foreground'}>
              {segment}
            </span>
          </span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {levelDescriptions[segments.length - 1] || 'Classification'}: {categoryName}
      </p>
    </div>
  )
}
```

### Pattern 4: Delete Confirmation with Alert Dialog
**What:** Confirm destructive action before deletion
**When to use:** Delete product action

```typescript
// src/components/product/delete-dialog.tsx
'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { motion, AnimatePresence } from 'motion/react'
import { useTransition } from 'react'
import { deleteProduct } from '@/lib/actions/products'

interface DeleteDialogProps {
  productId: string
  productName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteDialog({
  productId,
  productName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(productId)
      if (result.success) {
        onOpenChange(false)
        onDeleted?.()
      }
    })
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AnimatePresence>
          {open && (
            <>
              <AlertDialogPrimitive.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50"
                />
              </AlertDialogPrimitive.Overlay>
              <AlertDialogPrimitive.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-md"
                >
                  <AlertDialogPrimitive.Title className="text-lg font-semibold">
                    Delete Product
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
                    Are you sure you want to delete &quot;{productName}&quot;? This action cannot be undone.
                  </AlertDialogPrimitive.Description>
                  <div className="flex justify-end gap-3 mt-6">
                    <AlertDialogPrimitive.Cancel className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">
                      Cancel
                    </AlertDialogPrimitive.Cancel>
                    <AlertDialogPrimitive.Action
                      onClick={handleDelete}
                      disabled={isPending}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogPrimitive.Action>
                  </div>
                </motion.div>
              </AlertDialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
```

### Anti-Patterns to Avoid
- **Inline Server Actions in forms:** Extract to separate file for testability and reuse
- **Optimistic UI for deletes without confirmation:** Always confirm destructive actions
- **Re-fetching after mutation:** Use `revalidatePath` instead of manual refetch
- **Client-side only validation:** Always validate on server too (Zod schema shared)
- **Modal for content-heavy details:** Use Sheet/Drawer for better readability

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | useState per field | React Hook Form | Re-render optimization, validation integration |
| Schema validation | Manual if/else checks | Zod | Type inference, reusable schemas |
| Accessible modal | div with onClick outside | Radix Dialog | Focus trap, keyboard nav, aria |
| Confirmation dialogs | window.confirm() | Radix Alert Dialog | Consistent UI, accessible |
| Delete with revalidation | Manual fetch + setState | Server Action + revalidatePath | Automatic cache invalidation |

**Key insight:** Forms and dialogs have significant accessibility requirements (focus management, keyboard navigation, screen reader announcements) that are easy to get wrong. Radix primitives handle these correctly.

## Common Pitfalls

### Pitfall 1: Sheet State Management
**What goes wrong:** Sheet opens/closes unexpectedly, state desyncs
**Why it happens:** Managing open state in multiple places
**How to avoid:**
- Use controlled component pattern with single source of truth
- Pass `open` and `onOpenChange` props from parent
- For row actions, store `selectedProductId` in parent state
**Warning signs:** Sheet flickers, doesn't close on action complete

### Pitfall 2: Form Reset After Submit
**What goes wrong:** Form shows stale data after successful save
**Why it happens:** defaultValues set once on mount
**How to avoid:**
- Use `form.reset(newData)` after successful mutation
- Or pass `key={product.id}` to force remount
- For optimistic updates, update defaultValues
**Warning signs:** Form shows old values, confusion about save state

### Pitfall 3: Server Action Error Handling
**What goes wrong:** Errors silently swallowed, user sees no feedback
**Why it happens:** Not checking return value of Server Action
**How to avoid:**
- Always return `{ success: boolean, error?: string }` from actions
- Display errors in UI (toast or inline)
- Use `try/catch` in Server Action
**Warning signs:** Form "saves" but data unchanged, no error shown

### Pitfall 4: RLS Policies for Write Operations
**What goes wrong:** Update/delete fails silently or with cryptic error
**Why it happens:** Phase 1 only added SELECT policies
**How to avoid:**
- Add UPDATE and DELETE policies for products table
- For now: use service role key or permissive policies
- Later: implement proper auth-based policies
**Warning signs:** PGRST301 errors, "permission denied"

### Pitfall 5: EMDN Hierarchy Query N+1
**What goes wrong:** Slow product detail load when fetching full hierarchy
**Why it happens:** Querying each parent recursively
**How to avoid:**
- Use the `path` field (already stores materialized path)
- If names needed, batch query all ancestors by code
- Consider storing full path with names in JSON column
**Warning signs:** Multiple database queries per product view

### Pitfall 6: Motion Animation with Radix Portals
**What goes wrong:** Exit animations don't play, content disappears instantly
**Why it happens:** Portal unmounts before animation completes
**How to avoid:**
- Wrap Radix overlay/content with AnimatePresence
- Use `asChild` prop to pass motion.div
- Check `open` state controls AnimatePresence
**Warning signs:** Abrupt close, no fade-out

## Code Examples

### Updated Table Row Actions
```typescript
// src/components/table/columns.tsx - Updated actions column
{
  id: "actions",
  cell: ({ row }) => (
    <DropdownMenu
      trigger={<MoreVertical className="h-4 w-4 text-muted-foreground" />}
      align="right"
    >
      <DropdownMenuItem onClick={() => onViewProduct(row.original)}>
        View details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onEditProduct(row.original)}>
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onDeleteProduct(row.original)}
        className="text-red-600"
      >
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  ),
}
```

### Regulatory Info Display
```typescript
// src/components/product/regulatory-info.tsx
'use client'

import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface RegulatoryInfoProps {
  udiDi: string | null
  ceMarked: boolean
  mdrClass: 'I' | 'IIa' | 'IIb' | 'III' | null
}

const MDR_CLASS_DESCRIPTIONS: Record<string, string> = {
  'I': 'Low risk - Basic devices',
  'IIa': 'Low to medium risk - Short-term invasive',
  'IIb': 'Medium to high risk - Long-term invasive',
  'III': 'High risk - Critical devices',
}

export function RegulatoryInfo({ udiDi, ceMarked, mdrClass }: RegulatoryInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
        Regulatory Information
      </h3>

      {/* UDI-DI */}
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-accent mt-0.5" />
        <div>
          <p className="text-sm font-medium">UDI-DI</p>
          <p className="text-sm text-muted-foreground">
            {udiDi || 'Not registered'}
          </p>
        </div>
      </div>

      {/* CE Marking */}
      <div className="flex items-start gap-3">
        {ceMarked ? (
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-medium">CE Marking</p>
          <p className="text-sm text-muted-foreground">
            {ceMarked ? 'CE marked for EU market' : 'Not CE marked'}
          </p>
        </div>
      </div>

      {/* MDR Class */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <p className="text-sm font-medium">MDR Risk Class</p>
          <p className="text-sm text-muted-foreground">
            {mdrClass
              ? `Class ${mdrClass} - ${MDR_CLASS_DESCRIPTIONS[mdrClass]}`
              : 'Not classified'}
          </p>
        </div>
      </div>
    </div>
  )
}
```

### Database Migration for Regulatory Fields
```sql
-- Migration: Add regulatory fields to products
ALTER TABLE products
ADD COLUMN udi_di VARCHAR(14),
ADD COLUMN ce_marked BOOLEAN DEFAULT false,
ADD COLUMN mdr_class VARCHAR(3) CHECK (mdr_class IN ('I', 'IIa', 'IIb', 'III'));

-- Add index for UDI-DI lookups
CREATE INDEX idx_products_udi ON products(udi_di) WHERE udi_di IS NOT NULL;

-- Update RLS policies for write operations (permissive for now)
CREATE POLICY "Allow all updates" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes" ON products FOR DELETE USING (true);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom modal with useState | Radix Dialog primitive | 2023+ | Better accessibility, focus trap |
| Formik | React Hook Form | 2022+ | Better performance, smaller bundle |
| Yup validation | Zod | 2023+ | Better TS integration, inference |
| API routes for mutations | Server Actions | Next.js 14+ | Simpler, type-safe mutations |
| Client-side validation only | Shared Zod schema | Current | Same validation client & server |

**Deprecated/outdated:**
- `@radix-ui/react-dialog` < 1.0: API changed in 1.0
- `react-hook-form` < 7.0: Different API
- `window.confirm()`: Use Radix Alert Dialog for consistent UI

## Open Questions

1. **Authentication for write operations**
   - What we know: Current RLS has public read, no write policies
   - What's unclear: Whether auth is needed for Phase 2 or deferred
   - Recommendation: Add permissive write policies for now; implement auth in dedicated phase

2. **Optimistic updates for edit**
   - What we know: useOptimistic hook exists in React 19
   - What's unclear: Whether instant feedback is needed vs. loading state
   - Recommendation: Start with loading state (isPending), add optimistic if UX feels slow

3. **Product detail URL routing**
   - What we know: Next.js supports intercepting routes for modals
   - What's unclear: Whether product detail needs shareable URL
   - Recommendation: Keep sheet-based (no URL) for Phase 2; add route interception if needed later

## Sources

### Primary (HIGH confidence)
- [Next.js Forms Guide](https://nextjs.org/docs/app/guides/forms) - Server Actions, useFormStatus
- [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) - Component API
- [React Hook Form](https://react-hook-form.com/get-started) - useForm, register, handleSubmit
- [Zod Documentation](https://zod.dev/) - Schema definition, type inference

### Secondary (MEDIUM confidence)
- [Vaul Drawer](https://github.com/emilkowalski/vaul) - Drawer patterns (via GitHub)
- [EMDN Overview](https://health.ec.europa.eu/medical-devices-topics-interest/european-medical-devices-nomenclature-emdn_en) - Hierarchy structure
- [EUDAMED Fields](https://health.ec.europa.eu/system/files/2022-04/md_eudamed_udi-devices-user-guide_en.pdf) - UDI/CE/MDR fields

### Tertiary (LOW confidence)
- WebSearch patterns for Next.js 15 + React Hook Form integration
- WebSearch for Vaul props and usage patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs
- Architecture patterns: HIGH - Radix/RHF patterns well-documented
- Regulatory fields: MEDIUM - EUDAMED structure confirmed, exact implementation needs validation
- Pitfalls: HIGH - Common issues documented across multiple sources

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stack is stable)
