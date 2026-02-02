'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2, Eye } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ProductDetail } from './product-detail'
import { ProductForm } from './product-form'
import { DeleteDialog } from './delete-dialog'
import type { ProductWithRelations, Vendor, Material, EMDNCategory } from '@/lib/types'

interface ProductSheetProps {
  product: ProductWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  vendors: Vendor[]
  materials: Material[]
  emdnCategories: EMDNCategory[]
}

export function ProductSheet({
  product,
  open,
  onOpenChange,
  vendors,
  materials,
  emdnCategories,
}: ProductSheetProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Reset mode to 'view' when sheet opens
  useEffect(() => {
    if (open) {
      setMode('view')
    }
  }, [open])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <div className="flex items-start justify-between pr-8">
              <SheetTitle className="text-lg font-semibold">
                {product?.name || 'Product'}
              </SheetTitle>
              <div className="flex items-center gap-2">
                {mode === 'edit' && (
                  <button
                    onClick={() => setMode('view')}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    title="View mode"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {mode === 'view' && (
                  <button
                    onClick={() => setMode('edit')}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    title="Edit mode"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="p-2 rounded-md hover:bg-muted transition-colors text-red-600"
                  title="Delete product"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Content area */}
          {!product ? (
            <div className="px-6 py-4 text-muted-foreground">
              No product selected
            </div>
          ) : mode === 'view' ? (
            <ProductDetail product={product} />
          ) : (
            <ProductForm
              product={product}
              vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
              materials={materials.map((m) => ({ id: m.id, name: m.name }))}
              emdnCategories={emdnCategories.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
              }))}
              onSuccess={() => {
                setMode('view')
                // Sheet stays open, data revalidates automatically via revalidatePath
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <DeleteDialog
        productId={product?.id || ''}
        productName={product?.name || ''}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => {
          onOpenChange(false) // Close sheet after delete
        }}
      />
    </>
  )
}
