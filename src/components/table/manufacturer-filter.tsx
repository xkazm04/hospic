"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { Check, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUrlFilterMulti } from "@/lib/hooks/use-url-filter";
import { DropdownFilter } from "@/components/filters/dropdown-filter";

interface ManufacturerFilterProps {
  manufacturers: string[];
  className?: string;
}

export const ManufacturerFilter = memo(function ManufacturerFilter({
  manufacturers,
  className = "",
}: ManufacturerFilterProps) {
  const t = useTranslations("filters");
  const tc = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    values: selectedManufacturers,
    toggleValue,
    clearValues,
  } = useUrlFilterMulti("manufacturer", { encode: true });

  const hasFilters = selectedManufacturers.length > 0;

  // Filter manufacturers by search query
  const filteredManufacturers = useMemo(() => {
    if (!searchQuery) return manufacturers;
    const query = searchQuery.toLowerCase();
    return manufacturers.filter((m) => m.toLowerCase().includes(query));
  }, [manufacturers, searchQuery]);

  const toggleManufacturer = useCallback(
    (manufacturer: string) => {
      const isSelected = selectedManufacturers.includes(manufacturer);
      toggleValue(manufacturer, !isSelected);
    },
    [selectedManufacturers, toggleValue]
  );

  const clearFilters = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clearValues();
    },
    [clearValues]
  );

  return (
    <DropdownFilter
      label={t("manufacturer")}
      hasFilters={hasFilters}
      onClear={clearFilters}
      clearTitle={t("clearManufacturer")}
      className={className}
      minWidth="220px"
      maxWidth="300px"
    >
              {/* Search input */}
              {manufacturers.length > 5 && (
                <div className="px-3 py-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("search")}
                      className="w-full pl-7 pr-2 py-1 text-sm border border-border rounded bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}

              {/* Selection summary */}
              {selectedManufacturers.length > 0 && (
                <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border flex items-center justify-between">
                  <span>{t("selected", { count: selectedManufacturers.length })}</span>
                  <button
                    onClick={clearFilters}
                    className="text-accent hover:underline"
                  >
                    {tc("clear")}
                  </button>
                </div>
              )}

              {/* Manufacturer list */}
              <div className="max-h-[240px] overflow-y-auto">
                {filteredManufacturers.map((manufacturer) => {
                  const isSelected = selectedManufacturers.includes(manufacturer);
                  return (
                    <button
                      key={manufacturer}
                      onClick={() => toggleManufacturer(manufacturer)}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-normal text-left hover:bg-muted transition-colors"
                    >
                      <div
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0
                          ${isSelected ? "bg-accent border-accent" : "border-border"}
                        `}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-accent-foreground" />
                        )}
                      </div>
                      <span className="truncate font-normal text-foreground">{manufacturer}</span>
                    </button>
                  );
                })}

                {filteredManufacturers.length === 0 && searchQuery && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    {tc("noMatch", { query: searchQuery })}
                  </p>
                )}

                {manufacturers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    {t("noManufacturers")}
                  </p>
                )}
              </div>
    </DropdownFilter>
  );
});
