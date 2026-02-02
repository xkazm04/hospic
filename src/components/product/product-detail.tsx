'use client'

import { ProductWithRelations } from '@/lib/types'
import { EMDNBreadcrumb } from './emdn-breadcrumb'
import { RegulatoryInfo } from './regulatory-info'

interface ProductDetailProps {
  product: ProductWithRelations
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <div className="space-y-6 px-6 py-4 overflow-y-auto">
      {/* Section 1: Basic Info */}
      <div className="pb-6 border-b border-border">
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <p className="text-muted-foreground">{product.sku}</p>
        {product.description && (
          <p className="mt-3 text-base">{product.description}</p>
        )}
      </div>

      {/* Section 2: Vendor & Pricing */}
      <div className="pb-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Vendor
            </p>
            <p className="text-base mt-1">
              {product.vendor?.name || 'No vendor'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Price
            </p>
            <p className="text-base mt-1">
              {product.price !== null
                ? `${product.price.toLocaleString('cs-CZ')} CZK`
                : 'Price not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Material */}
      <div className="pb-6 border-b border-border">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Material
        </p>
        <p className="text-base mt-1">
          {product.material?.name || 'Not specified'}
        </p>
      </div>

      {/* Section 4: EMDN Classification */}
      <div className="pb-6 border-b border-border">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          EMDN Classification
        </p>
        <EMDNBreadcrumb
          path={product.emdn_category?.path ?? null}
          categoryName={product.emdn_category?.name || 'Unknown'}
        />
      </div>

      {/* Section 5: Regulatory Information */}
      <div>
        <RegulatoryInfo
          udiDi={product.udi_di ?? null}
          ceMarked={product.ce_marked ?? false}
          mdrClass={product.mdr_class ?? null}
        />
      </div>
    </div>
  )
}
