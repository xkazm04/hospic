"use client";

import { useMemo, useCallback, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import { toTitleCase, simplifyChildName } from "@/lib/utils/format-category";
import { getLocalizedCategoryName } from "@/lib/utils/use-localized-category";
import type { EMDNCategory } from "@/lib/types";

interface ExpandableCategoryProps {
  category: EMDNCategory | null;
  allCategories: EMDNCategory[];
}

interface CategoryLevel {
  id: string;
  name: string;
  displayName: string;
  code: string;
  depth: number;
}

export const ExpandableCategory = memo(function ExpandableCategory({
  category,
  allCategories,
}: ExpandableCategoryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const currentFilter = searchParams.get("category");

  // Build the full path of categories from root to current with localized names
  const categoryPath = useMemo((): CategoryLevel[] => {
    if (!category) return [];

    const categoryMap = new Map<string, EMDNCategory>();
    allCategories.forEach((cat) => categoryMap.set(cat.id, cat));

    const tempPath: CategoryLevel[] = [];
    let current: EMDNCategory | undefined = category;

    while (current) {
      // Get localized name based on locale
      const localizedName = getLocalizedCategoryName(current, locale);

      tempPath.unshift({
        id: current.id,
        name: localizedName,
        displayName: toTitleCase(localizedName),
        code: current.code,
        depth: 0,
      });

      if (current.parent_id) {
        current = categoryMap.get(current.parent_id);
      } else {
        current = undefined;
      }
    }

    // Add depth and simplify names
    for (let i = 0; i < tempPath.length; i++) {
      tempPath[i].depth = i;
      if (i > 0) {
        tempPath[i].displayName = simplifyChildName(
          tempPath[i].name,
          tempPath[i - 1].name
        );
      }
    }

    return tempPath;
  }, [category, allCategories, locale]);

  const handleCategoryClick = useCallback(
    (categoryId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const params = new URLSearchParams(searchParams.toString());

      if (currentFilter === categoryId) {
        params.delete("category");
      } else {
        params.set("category", categoryId);
      }

      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [currentFilter, router, searchParams]
  );

  if (!category || categoryPath.length === 0) {
    return <span className="text-muted-foreground/40 text-sm transition-colors">—</span>;
  }

  // Last level (most specific) for first row
  const lastLevel = categoryPath[categoryPath.length - 1];
  // Predecessor levels for second row
  const predecessors = categoryPath.slice(0, -1);
  const isLastFiltered = currentFilter === lastLevel.id;

  return (
    <div className="min-w-0">
      {/* First row: Last level (most specific category) */}
      <button
        onClick={(e) => handleCategoryClick(lastLevel.id, e)}
        className={`
          text-sm font-medium transition-all duration-150 text-left truncate block max-w-full
          rounded px-1 -mx-1 py-0.5 -my-0.5
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1
          ${isLastFiltered ? "text-accent" : "text-foreground hover:text-accent hover:bg-accent/5 active:scale-[0.98]"}
        `}
        title={lastLevel.displayName}
      >
        {lastLevel.displayName}
      </button>

      {/* Second row: Predecessor levels */}
      {predecessors.length > 0 && (
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground min-w-0 overflow-hidden">
          {predecessors.map((level, index) => {
            const isFiltered = currentFilter === level.id;

            return (
              <span key={level.id} className="flex items-center min-w-0">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground/40 shrink-0 transition-opacity" />
                )}
                <button
                  onClick={(e) => handleCategoryClick(level.id, e)}
                  className={`
                    truncate transition-all duration-150 text-left rounded px-1 -mx-1 py-0.5 -my-0.5
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1
                    ${isFiltered ? "text-accent font-medium" : "hover:text-accent hover:bg-accent/5 active:scale-[0.98]"}
                  `}
                  title={level.displayName}
                >
                  {level.displayName}
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});
