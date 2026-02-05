'use client'

import { useState, useCallback, useDeferredValue } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Loader2 } from 'lucide-react'
import { DataTable, useColumnVisibility } from './table/data-table'
import { useColumns } from './table/columns'
import { ProductSheet } from './product/product-sheet'
import { ExtractionSheet } from './extraction/extraction-sheet'
import { ActiveFilters } from './filters/active-filters'
import type { ProductWithRelations, Vendor, EMDNCategory } from '@/lib/types'
import type { CategoryNode } from '@/lib/queries'

interface CatalogClientProps {
  products: ProductWithRelations[]
  vendors: Vendor[]
  emdnCategories: EMDNCategory[]
  categories: CategoryNode[]
  manufacturers: string[]
  pageCount: number
  totalCount: number
  currentPage: number
  pageSize: number
}

export function CatalogClient({
  products,
  vendors,
  emdnCategories,
  categories,
  manufacturers,
  pageCount,
  totalCount,
  currentPage,
  pageSize,
}: CatalogClientProps) {
  const t = useTranslations()
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [extractionSheetOpen, setExtractionSheetOpen] = useState(false)
  const searchParams = useSearchParams()

  // Column visibility state with localStorage persistence
  const { visibility: columnVisibility, setVisibility: setColumnVisibility } = useColumnVisibility()

  // Use deferred value for smooth transitions - shows stale data while loading
  const deferredProducts = useDeferredValue(products)
  const isTransitioning = deferredProducts !== products

  // Memoized callback for opening product sheet (handles view, edit, and delete)
  const handleOpenProduct = useCallback((product: ProductWithRelations) => {
    setSelectedProduct(product)
    setSheetOpen(true)
  }, [])

  // Use memoized columns hook
  const columns = useColumns(
    handleOpenProduct,
    handleOpenProduct,
    handleOpenProduct,
    emdnCategories,
    columnVisibility,
    manufacturers
  )

  return (
    <>
      {/* Header with title and add button */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('catalog.products')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('catalog.productsFound', { count: totalCount })}
          </p>
        </div>
        <button
          onClick={() => setExtractionSheetOpen(true)}
          className="flex items-center gap-2 bg-button text-button-foreground py-2 px-4 rounded-md font-medium hover:bg-button-hover transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {t('catalog.addProduct')}
        </button>
      </div>

      {/* Active filters bar */}
      <ActiveFilters
        vendors={vendors}
        categories={categories}
      />

      {/* Data table with loading overlay - uses CSS instead of motion for better performance */}
      <div className="relative">
        <div
          className="transition-opacity duration-150"
          style={{ opacity: isTransitioning ? 0.6 : 1 }}
        >
          <DataTable
            columns={columns}
            data={deferredProducts}
            pageCount={pageCount}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
        </div>
        {isTransitioning && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-lg pointer-events-none">
            <div className="flex items-center gap-2 text-muted-foreground bg-background/90 px-4 py-2 rounded-md shadow-lg border border-border/60">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span className="text-sm font-medium">{t('common.loading')}</span>
            </div>
          </div>
        )}
      </div>
      <ProductSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vendors={vendors}
        emdnCategories={emdnCategories}
      />
      <ExtractionSheet
        open={extractionSheetOpen}
        onOpenChange={setExtractionSheetOpen}
        vendors={vendors}
        emdnCategories={emdnCategories}
      />
    </>
  )
}
