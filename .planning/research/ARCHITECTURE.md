# Architecture Research

**Domain:** Medical Product Catalog with AI Classification
**Researched:** 2026-02-02
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  File Upload │  │   Product    │  │   Catalog    │  │    EMDN      │    │
│  │   + Review   │  │    Editor    │  │    Table     │  │   Lookup     │    │
│  │   (Client)   │  │   (Client)   │  │   (Server)   │  │   (Server)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
├─────────┴─────────────────┴─────────────────┴─────────────────┴────────────┤
│                           SERVER ACTION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Server Actions (mutations)                         │  │
│  │   - extractProducts()    - saveProduct()    - deleteProduct()        │  │
│  │   - updateProduct()      - bulkImport()     - classifyProduct()      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                           API ROUTE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Route Handlers (Gemini API)                        │  │
│  │   POST /api/extract     - File content → Gemini → Structured data    │  │
│  │   POST /api/classify    - Product → Gemini → EMDN classification     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                           SERVICE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Gemini     │  │   Product    │  │    EMDN      │  │   Storage    │    │
│  │   Service    │  │   Service    │  │   Service    │  │   Service    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
├─────────┴─────────────────┴─────────────────┴─────────────────┴────────────┤
│                           DATA LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │       Supabase PostgreSQL      │  │       Supabase Storage         │    │
│  │   - products table             │  │   - uploaded-files bucket      │    │
│  │   - emdn_codes table           │  │   (original txt/md files)      │    │
│  │   - extraction_jobs table      │  │                                │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **File Upload + Review** | Handle file selection, display AI extraction results for user review/edit | Client Component with form state |
| **Product Editor** | CRUD operations on individual products | Client Component with optimistic UI |
| **Catalog Table** | Display products with server-side pagination, filtering, sorting | Server Component with URL-based state |
| **EMDN Lookup** | Search and select EMDN classification codes | Server Component with search params |
| **Server Actions** | All database mutations (create, update, delete) | `'use server'` functions in `/app/actions/` |
| **Route Handlers** | Gemini API calls (keep API key server-side only) | `/app/api/` route handlers |
| **Gemini Service** | Prompt construction, response parsing, error handling | Service class in `/lib/services/` |
| **Product Service** | Product CRUD, validation, business logic | Service class in `/lib/services/` |
| **EMDN Service** | EMDN code lookup, search, caching | Service class in `/lib/services/` |
| **Supabase Clients** | Database access (separate browser/server clients) | Utility functions in `/lib/supabase/` |

## Recommended Project Structure

```
src/
├── app/
│   ├── (catalog)/              # Route group for main catalog
│   │   ├── page.tsx            # Catalog table (Server Component)
│   │   ├── loading.tsx         # Loading state
│   │   └── products/
│   │       ├── [id]/
│   │       │   ├── page.tsx    # Product detail view
│   │       │   └── edit/
│   │       │       └── page.tsx # Product edit form
│   │       └── new/
│   │           └── page.tsx    # New product form
│   ├── (upload)/               # Route group for upload flow
│   │   └── upload/
│   │       └── page.tsx        # File upload + review flow
│   ├── api/
│   │   ├── extract/
│   │   │   └── route.ts        # POST: File → Gemini → Extracted products
│   │   └── classify/
│   │       └── route.ts        # POST: Product → Gemini → EMDN code
│   ├── actions/
│   │   ├── products.ts         # Product CRUD server actions
│   │   └── extraction.ts       # Extraction job server actions
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # Shadcn/UI components
│   ├── catalog/
│   │   ├── ProductTable.tsx    # Table with sorting/filtering
│   │   ├── ProductFilters.tsx  # Filter controls
│   │   ├── Pagination.tsx      # Pagination controls
│   │   └── ProductCard.tsx     # Product display card
│   ├── upload/
│   │   ├── FileDropzone.tsx    # File upload area
│   │   ├── ExtractionPreview.tsx # AI extraction results
│   │   └── ProductReviewForm.tsx # Edit extracted data
│   ├── product/
│   │   ├── ProductForm.tsx     # Create/edit product form
│   │   └── EMDNSelector.tsx    # EMDN code picker
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client (createBrowserClient)
│   │   ├── server.ts           # Server client (createServerClient)
│   │   └── middleware.ts       # Auth middleware helper
│   ├── services/
│   │   ├── gemini.ts           # Gemini API wrapper
│   │   ├── product.ts          # Product business logic
│   │   ├── emdn.ts             # EMDN lookup logic
│   │   └── extraction.ts       # Extraction workflow logic
│   ├── prompts/
│   │   ├── extract-products.ts # Extraction prompt template
│   │   └── classify-emdn.ts    # Classification prompt template
│   └── utils/
│       ├── validators.ts       # Zod schemas
│       └── errors.ts           # Error handling utilities
├── types/
│   ├── database.ts             # Supabase generated types
│   ├── product.ts              # Product domain types
│   └── extraction.ts           # Extraction job types
└── middleware.ts               # Next.js middleware (auth)
```

### Structure Rationale

- **Route Groups `(catalog)` and `(upload)`:** Organize related pages without affecting URL structure. Allows different layouts if needed.
- **`/app/api/` for Gemini calls:** Route handlers for LLM operations keep API keys server-side and allow HTTP caching headers.
- **`/app/actions/` for mutations:** Centralized server actions for all database writes. Type-safe, progressively enhanced.
- **`/lib/services/` layer:** Business logic separated from framework code. Makes testing easier and allows backend swaps.
- **`/lib/prompts/`:** Prompt templates separate from service code. Easier to iterate on prompts without touching logic.
- **`/lib/supabase/` with separate clients:** Browser and server clients are fundamentally different in Next.js App Router.

## Architectural Patterns

### Pattern 1: Server Actions for Mutations

**What:** Use Server Actions for all database writes (create, update, delete products).
**When to use:** Any form submission or mutation that only the Next.js app needs to call.
**Trade-offs:** Type-safe, works without JS, but not suitable for external API consumers.

**Example:**
```typescript
// app/actions/products.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/utils/validators'

export async function createProduct(formData: FormData) {
  const supabase = await createServerClient()

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description'),
    emdn_code: formData.get('emdn_code'),
    // ... other fields
  }

  const validated = productSchema.parse(rawData)

  const { data, error } = await supabase
    .from('products')
    .insert(validated)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/') // Revalidate catalog
  return data
}
```

### Pattern 2: Route Handlers for LLM Operations

**What:** Use API Route Handlers for Gemini API calls, not Server Actions.
**When to use:** Operations that need streaming, precise HTTP control, or potential external access.
**Trade-offs:** More boilerplate, but better control over response format and caching.

**Example:**
```typescript
// app/api/extract/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { extractionPrompt } from '@/lib/prompts/extract-products'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { content, filename } = await request.json()

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview'
    })

    const result = await model.generateContent(
      extractionPrompt(content, filename)
    )

    const text = result.response.text()
    const products = JSON.parse(text) // Parse structured output

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Extraction failed:', error)
    return NextResponse.json(
      { error: 'Extraction failed' },
      { status: 500 }
    )
  }
}
```

### Pattern 3: URL-Based State for Table

**What:** Store pagination, sorting, and filter state in URL search params.
**When to use:** Any data table that should be shareable/bookmarkable.
**Trade-offs:** More complex state management, but enables SSR and sharing.

**Example:**
```typescript
// app/(catalog)/page.tsx (Server Component)
import { createServerClient } from '@/lib/supabase/server'
import { ProductTable } from '@/components/catalog/ProductTable'

interface CatalogPageProps {
  searchParams: Promise<{
    page?: string
    sort?: string
    order?: 'asc' | 'desc'
    search?: string
    emdn?: string
  }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams
  const supabase = await createServerClient()

  const page = parseInt(params.page ?? '1')
  const pageSize = 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .range(offset, offset + pageSize - 1)

  // Apply filters
  if (params.search) {
    query = query.ilike('name', `%${params.search}%`)
  }
  if (params.emdn) {
    query = query.eq('emdn_code', params.emdn)
  }

  // Apply sorting
  if (params.sort) {
    query = query.order(params.sort, {
      ascending: params.order !== 'desc'
    })
  }

  const { data: products, count } = await query

  return (
    <ProductTable
      products={products ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      pageSize={pageSize}
    />
  )
}
```

### Pattern 4: Separate Supabase Clients

**What:** Use different Supabase client factories for browser vs server contexts.
**When to use:** Always. This is required for proper auth handling in App Router.
**Trade-offs:** More setup, but prevents auth/security issues.

**Example:**
```typescript
// lib/supabase/server.ts
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}

// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## Data Flow

### File Upload and Extraction Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. USER UPLOADS FILE                                                      │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ FileDropzone (Client Component)                                           │
│   - Accepts .txt/.md files                                                │
│   - Reads file content client-side (small files)                          │
│   - Displays upload progress                                              │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼ POST /api/extract { content, filename }
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. SERVER EXTRACTS PRODUCTS                                               │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Route Handler: /api/extract/route.ts                                      │
│   - Receives file content                                                 │
│   - Calls GeminiService.extractProducts()                                 │
│   - Returns structured JSON array of products                             │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼ Response: { products: [...] }
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. USER REVIEWS EXTRACTION                                                │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ExtractionPreview (Client Component)                                      │
│   - Displays extracted products in editable form                          │
│   - User can edit, delete, or add products                                │
│   - EMDN classification can be triggered per-product                      │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼ Server Action: saveProducts(products[])
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. SAVE APPROVED PRODUCTS                                                 │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Server Action: app/actions/products.ts                                    │
│   - Validates all products with Zod                                       │
│   - Bulk inserts to Supabase                                              │
│   - Revalidates catalog page cache                                        │
│   - Returns success/error status                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Catalog Table Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ URL: /?page=2&sort=name&order=asc&search=bandage                          │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Server Component: app/(catalog)/page.tsx                                  │
│   - Parses searchParams                                                   │
│   - Builds Supabase query with filters/sort/pagination                    │
│   - Fetches data server-side (no loading state needed)                    │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ProductTable Component (receives products as props)                       │
│   - Renders table rows                                                    │
│   - Filter/sort controls update URL via useRouter                         │
│   - Pagination links update URL (page param)                              │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼ User clicks filter/sort
┌──────────────────────────────────────────────────────────────────────────┐
│ URL updates → Server Component re-renders with new data                   │
│ (No client-side data fetching, no loading spinners for SSR content)       │
└──────────────────────────────────────────────────────────────────────────┘
```

### EMDN Classification Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ProductForm: User clicks "Auto-classify EMDN"                             │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼ POST /api/classify { productName, description }
┌──────────────────────────────────────────────────────────────────────────┐
│ Route Handler: /api/classify/route.ts                                     │
│   - Calls Gemini with product info + EMDN context                         │
│   - Returns suggested EMDN code + confidence score                        │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼ Response: { emdn_code: "W0101", confidence: 0.92 }
┌──────────────────────────────────────────────────────────────────────────┐
│ EMDNSelector Component                                                    │
│   - Shows AI suggestion with confidence                                   │
│   - User can accept or search for different code                          │
│   - Manual search queries EMDN reference table in Supabase                │
└──────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  model_number TEXT,
  emdn_code TEXT REFERENCES emdn_codes(code),
  emdn_confidence REAL, -- AI classification confidence (0-1)
  attributes JSONB DEFAULT '{}', -- Flexible additional fields
  source_file TEXT, -- Original filename for traceability
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMDN reference codes (imported from EC Excel)
CREATE TABLE emdn_codes (
  code TEXT PRIMARY KEY, -- e.g., "W0101"
  category TEXT NOT NULL, -- Level 1 letter
  group_code TEXT, -- Level 2 numbers
  type_code TEXT, -- Level 3+ numbers
  name_en TEXT NOT NULL,
  description_en TEXT,
  parent_code TEXT REFERENCES emdn_codes(code)
);

-- Extraction jobs (for tracking/debugging)
CREATE TABLE extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  extracted_count INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_products_emdn ON products(emdn_code);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_emdn_name ON emdn_codes USING gin(to_tsvector('english', name_en));
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k products | Current architecture is sufficient. Single Supabase instance handles everything. |
| 1k-100k products | Add full-text search indexes. Consider caching EMDN codes in memory. Implement cursor-based pagination for deep pages. |
| 100k+ products | Add read replicas. Move to cursor pagination. Consider ElasticSearch for complex search. Cache Gemini responses for repeated classifications. |

### Scaling Priorities

1. **First bottleneck: EMDN code search** - Full-text search on EMDN table can slow down. Solution: GIN index + in-memory caching of code tree.
2. **Second bottleneck: Catalog page queries** - Deep pagination is slow with offset. Solution: Cursor-based pagination using `id` or `created_at`.
3. **Third bottleneck: Gemini API rate limits** - Solution: Queue extractions, batch where possible, cache repeated classifications.

## Anti-Patterns

### Anti-Pattern 1: Gemini API Key in Client Code

**What people do:** Import `@google/generative-ai` directly in Client Components or expose key via `NEXT_PUBLIC_` env var.
**Why it's wrong:** API key is exposed to users, can be stolen/abused, costs money.
**Do this instead:** Always call Gemini from Route Handlers or Server Actions. Never prefix Gemini key with `NEXT_PUBLIC_`.

### Anti-Pattern 2: useEffect for Initial Data Fetch

**What people do:** Use Client Component with `useEffect` to fetch catalog data on mount.
**Why it's wrong:** Causes loading spinners, worse SEO, double data fetching, waterfall requests.
**Do this instead:** Fetch data in Server Components. Pass as props to Client Components for interactivity.

### Anti-Pattern 3: Single Supabase Client

**What people do:** Create one Supabase client and use everywhere.
**Why it's wrong:** Auth cookies don't work correctly. Server Components can't access browser cookies. Security issues.
**Do this instead:** Use `createBrowserClient()` for Client Components, `createServerClient()` for Server Components/Actions.

### Anti-Pattern 4: Storing All State in React State

**What people do:** Keep pagination, filters, sort in `useState` for the catalog table.
**Why it's wrong:** URL isn't shareable, back button doesn't work, page refresh loses state.
**Do this instead:** Store table state in URL search params. Use `useSearchParams` and `useRouter` to update.

### Anti-Pattern 5: Raw LLM Output Without Validation

**What people do:** Trust Gemini's JSON output directly without validation.
**Why it's wrong:** LLMs hallucinate, return malformed JSON, miss required fields.
**Do this instead:** Always validate LLM output with Zod schema. Implement retry logic for malformed responses.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Gemini API | Route Handlers only | Never expose API key. Use `gemini-3-flash-preview` for speed. Consider streaming for large extractions. |
| Supabase Database | @supabase/ssr clients | Separate browser/server clients. Use RLS for reads, service role for admin ops. |
| Supabase Storage | Optional for file archival | If storing original files, use signed URLs. Consider 1MB Server Action limit. |
| EMDN Reference | Local table + periodic import | Download Excel from EC website, import to `emdn_codes` table. No public API available. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI Components ↔ Server Actions | FormData / Return values | Type-safe with Zod. Use `useActionState` for pending states. |
| UI Components ↔ Route Handlers | fetch() / JSON | Used for Gemini calls. Client fetches, server processes. |
| Services ↔ Supabase | Supabase client methods | Services receive client as parameter or create internally. |
| Route Handlers ↔ Gemini | @google/generative-ai SDK | Handle rate limits, timeouts, malformed responses. |

## Build Order Implications

Based on component dependencies, suggested build order:

1. **Foundation (Phase 1)**
   - Supabase project setup + database schema
   - Supabase client utilities (`/lib/supabase/`)
   - Basic layout components

2. **Data Layer (Phase 2)**
   - Zod validation schemas
   - Product service (CRUD operations)
   - Server actions for products

3. **Catalog MVP (Phase 3)**
   - Catalog page (Server Component)
   - ProductTable with basic display
   - Pagination (URL-based)

4. **AI Extraction (Phase 4)**
   - Gemini service + prompt templates
   - `/api/extract` route handler
   - File upload component
   - Extraction preview/review UI

5. **EMDN Integration (Phase 5)**
   - EMDN codes table + import script
   - EMDN service (search/lookup)
   - `/api/classify` route handler
   - EMDNSelector component

6. **Polish (Phase 6)**
   - Advanced filters/sorting
   - Error handling improvements
   - Loading states
   - Mobile responsiveness

## Sources

### Official Documentation (HIGH confidence)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [European Medical Device Nomenclature (EMDN)](https://webgate.ec.europa.eu/dyna2/emdn/)

### Architecture Patterns (MEDIUM confidence)
- [Building a Production-Ready Next.js App Router Architecture](https://dev.to/yukionishi1129/building-a-production-ready-nextjs-app-router-architecture-a-complete-playbook-3f3h)
- [Next.js Architecture in 2026](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router)
- [Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)
- [Supabase + Next.js Guide](https://medium.com/@iamqitmeeer/supabase-next-js-guide-the-real-way-01a7f2bd140c)
- [Next.js + Supabase in Production](https://catjam.fi/articles/next-supabase-what-do-differently)

### LLM Integration (MEDIUM confidence)
- [Designing an LLM-Based Document Extraction System](https://medium.com/@dikshithraj03/turning-messy-documents-into-structured-data-with-llms-d8a6242a31cc)
- [Gemini AI with Next.js 15](https://dev.to/shubhamtiwari909/gemini-ai-next-js-15-tailwind-1247)
- [Gemini API with Next.js Streaming](https://ppaanngggg.medium.com/how-to-use-google-gemini-for-next-js-with-streaming-output-195c9c423761)

### Data Table Patterns (MEDIUM confidence)
- [Next.js Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)
- [Shadcn Table with Server-Side Features](https://github.com/sadmann7/shadcn-table)

---
*Architecture research for: Medical Product Catalog with AI Classification*
*Researched: 2026-02-02*
