'use client'

import { ChevronRight } from 'lucide-react'

interface EMDNBreadcrumbProps {
  path: string | null  // e.g., "P/P09/P0901/P090101"
  categoryName: string
}

const levelDescriptions: Record<number, string> = {
  0: 'Category',
  1: 'Group',
  2: 'Type Level 1',
  3: 'Type Level 2',
  4: 'Type Level 3',
  5: 'Type Level 4',
  6: 'Type Level 5',
}

export function EMDNBreadcrumb({ path, categoryName }: EMDNBreadcrumbProps) {
  if (!path) {
    return <span className="text-muted-foreground">Not classified</span>
  }

  // Parse path into segments
  const segments = path.split('/').filter(Boolean)

  return (
    <div className="space-y-2">
      <div className="flex items-center flex-wrap gap-1 text-sm">
        {segments.map((segment, index) => (
          <span key={segment} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" />
            )}
            <span
              className={
                index === segments.length - 1
                  ? 'font-medium text-accent'
                  : 'text-muted-foreground'
              }
            >
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
