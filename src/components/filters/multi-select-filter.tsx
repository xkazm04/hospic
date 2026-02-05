"use client";

import { useState, useMemo, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { useUrlFilterMulti } from "@/lib/hooks/use-url-filter";

interface MultiSelectItem {
  id: string;
  name: string;
  code?: string | null;
}

interface MultiSelectFilterProps<T extends MultiSelectItem> {
  items: T[];
  paramKey: string;
  searchPlaceholder: string;
  emptyMessage: string;
  EmptyIcon: React.ComponentType<{ className?: string }>;
  selectedStyle?: string;
  hoverStyle?: string;
  useTransitions?: boolean;
}

export function MultiSelectFilter<T extends MultiSelectItem>({
  items,
  paramKey,
  searchPlaceholder,
  emptyMessage,
  EmptyIcon,
  selectedStyle = "bg-accent/10",
  hoverStyle = "hover:bg-muted",
  useTransitions = false,
}: MultiSelectFilterProps<T>) {
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const { values: selectedItems, toggleValue, clearValues } = useUrlFilterMulti(paramKey);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.code?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleChange = (itemId: string, checked: boolean) => {
    if (useTransitions) {
      startTransition(() => {
        toggleValue(itemId, checked);
      });
    } else {
      toggleValue(itemId, checked);
    }
  };

  const clearSelection = () => {
    if (useTransitions) {
      startTransition(() => {
        clearValues();
      });
    } else {
      clearValues();
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <EmptyIcon className="h-6 w-6 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search input (show only if many items) */}
      {items.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors shadow-sm focus:shadow-md"
          />
        </div>
      )}

      {/* Selection summary */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {useTransitions && isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {tCommon('selected', { count: selectedItems.length })}
          </span>
          <button
            onClick={clearSelection}
            className="text-accent hover:underline font-medium transition-colors duration-150"
            disabled={useTransitions && isPending}
          >
            {tCommon('clear')}
          </button>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
        {filteredItems.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          return (
            <label
              key={item.id}
              className={`
                flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer
                transition-all duration-150
                ${isSelected ? selectedStyle : hoverStyle}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleChange(item.id, e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
              />
              <span className={`text-sm flex-1 truncate ${isSelected ? "text-accent font-medium" : "text-foreground"}`}>
                {item.name}
              </span>
              {item.code && (
                <span className="text-xs text-muted-foreground font-mono">
                  {item.code}
                </span>
              )}
            </label>
          );
        })}

        {filteredItems.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {tCommon('noMatch', { query: searchQuery })}
          </p>
        )}
      </div>
    </div>
  );
}
