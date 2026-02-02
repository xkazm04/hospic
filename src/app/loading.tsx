export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar skeleton */}
        <div className="w-[280px] shrink-0 border-r border-border p-4">
          {/* Search skeleton */}
          <div className="mb-6">
            <div className="h-10 bg-muted rounded-md animate-pulse" />
          </div>

          {/* Categories skeleton */}
          <div className="mb-6">
            <div className="h-4 w-24 bg-muted rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          </div>

          {/* Vendors skeleton */}
          <div className="mb-6">
            <div className="h-4 w-20 bg-muted rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Materials skeleton */}
          <div className="mb-6">
            <div className="h-4 w-24 bg-muted rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Price range skeleton */}
          <div>
            <div className="h-4 w-28 bg-muted rounded mb-3 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
              <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="flex-1 p-6">
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            {/* Header skeleton */}
            <div className="bg-table-header border-b border-border px-3 py-3">
              <div className="flex gap-4">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </div>
            </div>

            {/* Rows skeleton */}
            <div className="divide-y divide-border">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={`px-3 py-3 flex gap-4 ${i % 2 === 1 ? "bg-table-row-alt" : ""}`}>
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-3 w-1/4 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-6 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Pagination skeleton */}
            <div className="border-t border-border px-4 py-3 flex justify-between">
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
