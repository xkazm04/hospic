'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import type { SimilarProduct } from '@/lib/actions/similarity'

interface SimilarProductsWarningProps {
  products: SimilarProduct[]
  isLoading: boolean
}

export function SimilarProductsWarning({
  products,
  isLoading,
}: SimilarProductsWarningProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking for similar products...</span>
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-amber-800">Similar products found</h4>
          <p className="text-sm text-amber-700 mt-1">
            This product may already exist in the catalog. Review before saving.
          </p>
          <ul className="mt-3 space-y-2">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between text-sm gap-2"
              >
                <span className="text-amber-900 truncate">
                  {product.name}
                  {product.vendor_name && (
                    <span className="text-amber-700"> ({product.vendor_name})</span>
                  )}
                </span>
                <span className="text-amber-600 font-mono text-xs flex-shrink-0">
                  {Math.round(product.name_similarity * 100)}% match
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
