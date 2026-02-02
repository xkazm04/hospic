"use client";

import { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

interface FilterSidebarProps {
  children: ReactNode;
}

export function FilterSidebar({ children }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasActiveFilters =
    searchParams.has("search") ||
    searchParams.has("vendor") ||
    searchParams.has("category") ||
    searchParams.has("material") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice");

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    // Keep only sort params
    if (searchParams.has("sortBy")) {
      params.set("sortBy", searchParams.get("sortBy")!);
    }
    if (searchParams.has("sortOrder")) {
      params.set("sortOrder", searchParams.get("sortOrder")!);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <aside className="w-[280px] shrink-0 border-r border-border bg-background overflow-y-auto h-[calc(100vh-1px)]">
      <div className="p-4 space-y-6">
        {children}

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
            Clear all filters
          </button>
        )}
      </div>
    </aside>
  );
}

interface FilterSectionProps {
  title: string;
  children: ReactNode;
}

export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
