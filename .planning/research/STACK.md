# Stack Research

**Domain:** Medical Product Catalog with AI Classification
**Researched:** 2026-02-02
**Confidence:** HIGH (verified via official docs and recent sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.5.x | Full-stack React framework | App Router is mature, Server Actions eliminate API boilerplate, Turbopack provides fast builds. Next.js 16 exists but 15.5 is battle-tested and all shadcn/ui templates target it. Security patches actively maintained. |
| React | 19.x | UI library | Bundled with Next.js 15.5. Required for Server Components, `useActionState`, and `useFormStatus` hooks used in form handling. |
| TypeScript | 5.5+ | Type safety | Required by Zod 4, provides compile-time safety for medical data structures. Strict mode mandatory. |
| Tailwind CSS | 4.x | Styling | CSS-first configuration (no tailwind.config.js needed), 5x faster builds, automatic content detection. Required for shadcn/ui. |
| Supabase | Latest | PostgreSQL database + Auth + Storage | Managed PostgreSQL eliminates DevOps, Row-Level Security for multi-tenant data isolation, Storage for vendor spreadsheets. `@supabase/ssr` package handles Next.js App Router auth flow. |

### AI / LLM Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @google/genai | 1.37.x | Gemini SDK | Unified SDK for Gemini 2.0+ (replaces deprecated `@google/generative-ai`). TypeScript-first, supports `gemini-3-flash-preview` model specified in requirements. |
| gemini-3-flash-preview | - | LLM model | Balanced model with Pro-level intelligence at Flash speed/pricing. Use `thinking_level: "medium"` for classification tasks requiring reasoning. |

**Gemini SDK Usage Pattern:**
```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: prompt,
  generationConfig: {
    thinking_level: 'medium', // minimal | low | medium | high
  },
});
```

### Database & Backend

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @supabase/supabase-js | 2.x | Supabase client | Core client for database operations, realtime subscriptions. |
| @supabase/ssr | 0.5.x | Server-side auth | Handles cookie-based auth in Next.js App Router. Creates separate clients for Server Components vs Client Components. |
| Supabase Storage | - | File storage | Store uploaded vendor spreadsheets. Use signed URLs for uploads >1MB (Next.js Server Action body limit). |

**Supabase Client Setup Pattern:**
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### UI Components & Animation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| shadcn/ui | Latest | Component library | Copy-paste components you own. Built on Radix UI + Tailwind. Perfect integration with React Hook Form + Zod. Server Components compatible. |
| Framer Motion | 11.x | Animation | Rebranded to "Motion". v11 has improved layout animations for React 19. 8.1M weekly npm downloads. Use `motion` import. |
| lucide-react | 0.562.x | Icons | 1000+ tree-shakable SVG icons. Default for shadcn/ui. Avoid dynamic imports (slow dev server). |
| sonner | Latest | Toast notifications | shadcn/ui's default toast. Works with Server Components via cookies. Simple API: `toast.success()`. |

**Framer Motion Patterns:**
```typescript
import { motion, AnimatePresence } from 'motion/react';

// Page transitions
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
</AnimatePresence>

// List stagger animation
<motion.ul variants={container} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item.id} variants={listItem} layout>
      {item.name}
    </motion.li>
  ))}
</motion.ul>

// Performance: use layout prop for smooth layout animations
// Performance: use willChange prop for browser optimization hints
// Performance: keep exit animations short (<200ms)
```

### Form Handling & Validation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-hook-form | 7.x | Form state management | Minimal re-renders, works with Server Actions via `action` prop. Use `useActionState` for server validation state. |
| zod | 4.x | Schema validation | TypeScript-first, share schemas between client/server. Zod 4 is stable with improved performance. Requires TS 5.5+. |
| @hookform/resolvers | Latest | Zod integration | First-party Zod resolver for react-hook-form. |

**Form Pattern with Server Actions:**
```typescript
// schemas/product.ts
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Product name required'),
  emdnCode: z.string().regex(/^[A-Z]\d{2}(\d{2,10})?$/, 'Invalid EMDN code'),
  vendorId: z.string().uuid(),
});

export type ProductInput = z.infer<typeof productSchema>;

// actions/products.ts
'use server';
import { productSchema } from '@/schemas/product';

export async function createProduct(prevState: any, formData: FormData) {
  const result = productSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }
  // ... database insert
  return { success: true };
}

// components/product-form.tsx
'use client';
import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function ProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, null);
  const form = useForm({
    resolver: zodResolver(productSchema),
    mode: 'onBlur', // Validate on blur, submit to server
  });

  return (
    <form action={formAction}>
      {/* form fields */}
    </form>
  );
}
```

### File Processing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| xlsx (SheetJS) | Latest | Spreadsheet parsing | Most comprehensive Excel parser. Handles .xlsx, .xls, .csv. No external dependencies. Works in browser and Node. |

**File Upload Pattern:**
```typescript
// For files >1MB, use Supabase signed URLs
// Server Action creates signed URL, client uploads directly

// actions/upload.ts
'use server';
import { createClient } from '@/lib/supabase/server';

export async function getUploadUrl(filename: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('vendor-sheets')
    .createSignedUploadUrl(`uploads/${Date.now()}-${filename}`);

  if (error) throw error;
  return data;
}

// Client-side upload
const { signedUrl, path } = await getUploadUrl(file.name);
await fetch(signedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type },
});
```

### Data & State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @tanstack/react-query | 5.90.x | Server state | Cache management, background refetching, optimistic updates. Pairs with Server Components for hybrid data fetching (SSR + client cache). |
| date-fns | 3.x | Date formatting | Tree-shakable, fastest performance. Import only needed functions. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Linting | Use `eslint-config-next` for Next.js rules |
| Prettier | Formatting | Configure with Tailwind plugin for class sorting |
| prettier-plugin-tailwindcss | Class sorting | Auto-sorts Tailwind classes |

## Installation

```bash
# Core framework
npx create-next-app@latest hospic --typescript --tailwind --eslint --app --src-dir

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# AI/LLM
npm install @google/genai

# UI Components (shadcn/ui - run init, then add components as needed)
npx shadcn@latest init
npx shadcn@latest add button input form card table dialog toast

# Animation
npm install framer-motion

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Data fetching
npm install @tanstack/react-query

# File processing
npm install xlsx

# Utilities
npm install date-fns lucide-react sonner

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 15.5 | Next.js 16 | Only if you need Cache Components feature. 15.5 is more stable for production. |
| Supabase | Firebase | If you need offline-first or real-time sync as primary feature. Firebase has better mobile SDKs. |
| @google/genai | LangChain | If you need complex RAG pipelines or multi-model orchestration. Overkill for single-model classification. |
| Framer Motion | CSS animations | For very simple hover states. Framer Motion adds ~40kb but provides AnimatePresence for mount/unmount. |
| react-hook-form | Native forms + useActionState | If forms are very simple (1-2 fields). RHF adds value for complex validation UX. |
| xlsx (SheetJS) | read-excel-file | If you only read small files (<10k rows). SheetJS handles large files better. |
| date-fns | dayjs | If migrating from Moment.js (same API). dayjs is smaller but date-fns is faster. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @google/generative-ai | Deprecated. No longer maintained, missing Gemini 3 features. | @google/genai |
| Moment.js | Deprecated, huge bundle size (329kb). | date-fns or dayjs |
| @supabase/auth-helpers-nextjs | Deprecated. Replaced by @supabase/ssr. | @supabase/ssr |
| tailwind.config.js | Tailwind v4 uses CSS-first config. JS config still works but is legacy pattern. | @theme in CSS |
| Dynamic lucide imports | Causes 12+ second HMR in dev. | Static imports only |
| pages/ directory | Legacy Next.js pattern. | app/ directory (App Router) |
| getServerSideProps | Pages Router pattern. | Server Components or Route Handlers |
| API routes for mutations | Extra boilerplate. | Server Actions |

## Stack Patterns by Variant

**If file uploads are frequent/large (>10MB):**
- Use Supabase Storage with resumable uploads
- Consider chunked upload pattern
- Set up background processing with Supabase Edge Functions

**If real-time collaboration needed later:**
- Supabase Realtime is already included
- Structure tables with `updated_at` columns for change tracking
- Use `useSubscription` from @supabase/supabase-js

**If offline support needed:**
- Add TanStack Query persist plugin
- Consider PouchDB for complex offline scenarios
- Note: Not typical for B2B procurement tools

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15.5 | React 19.x | Bundled together |
| Tailwind CSS 4.x | Next.js 15.5+ | Requires PostCSS setup in next.config |
| shadcn/ui | Tailwind 4.x | Full support, uses new @theme syntax |
| @supabase/ssr 0.5.x | Next.js 15+ | Designed for App Router |
| Zod 4.x | TypeScript 5.5+ | Strict mode required |
| Framer Motion 11.x | React 19.x | Improved concurrent rendering support |
| @tanstack/react-query 5.x | React 18+ | Uses useSyncExternalStore |

## EMDN Classification Notes

The European Medical Device Nomenclature (EMDN) is accessed via:
- Download: Excel/PDF from [EC EMDN Portal](https://webgate.ec.europa.eu/dyna2/emdn/)
- No public API exists - must download and import into database
- Structure: 7-level alphanumeric hierarchy (max 13 digits)
- Updates: Annual releases (January each year)
- Format: Category letter + 2-digit group + type numbers (e.g., `P030101`)

**Recommendation:** Download EMDN Excel, parse with SheetJS, seed into Supabase table with columns:
```sql
CREATE TABLE emdn_codes (
  code TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  group_name TEXT NOT NULL,
  type_name TEXT,
  level INTEGER NOT NULL,
  parent_code TEXT REFERENCES emdn_codes(code)
);
```

## Sources

- [Next.js 15 Documentation](https://nextjs.org/docs) - App Router, Server Actions
- [Next.js Security Updates January 2026](https://nextjs.org/blog) - CVE patches
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs) - Next.js client setup
- [Google GenAI SDK GitHub](https://github.com/googleapis/js-genai) - SDK usage patterns
- [Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models) - Model IDs and capabilities
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) - CSS-first configuration
- [shadcn/ui Next.js](https://ui.shadcn.com/docs/installation/next) - Component installation
- [Motion (Framer Motion) Docs](https://motion.dev/docs/react-animation) - Animation patterns
- [React Hook Form + Server Actions](https://nehalist.io/react-hook-form-with-nextjs-server-actions/) - Integration pattern
- [Zod 4 Documentation](https://zod.dev/) - Schema validation
- [TanStack Query v5](https://tanstack.com/query/v5/docs/framework/react/overview) - Data fetching
- [EMDN Portal](https://webgate.ec.europa.eu/dyna2/emdn/) - Medical device nomenclature
- [SheetJS Documentation](https://docs.sheetjs.com/) - Excel parsing

---
*Stack research for: Medical Product Catalog with AI Classification*
*Researched: 2026-02-02*
