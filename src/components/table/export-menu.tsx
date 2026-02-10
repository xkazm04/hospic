"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Database, Filter, CheckSquare, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { productsToXLSX, downloadXLSX, getExportFilename } from "@/lib/utils/xlsx-export";
import { getProductsForExport, type ExportFilters } from "@/lib/actions/export";
import type { ProductWithRelations } from "@/lib/types";
import type { ColumnVisibility } from "./column-visibility-toggle";

interface ExportMenuProps {
  products: ProductWithRelations[];
  selectedProducts: ProductWithRelations[];
  columnVisibility: ColumnVisibility;
  totalCount: number;
  filteredCount: number;
  filters: ExportFilters;
  hasActiveFilters: boolean;
}

type ExportingState = "all" | "filtered" | "selected" | null;

export function ExportMenu({
  selectedProducts,
  columnVisibility,
  totalCount,
  filteredCount,
  filters,
  hasActiveFilters,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportingState>(null);
  const t = useTranslations("export");

  const handleExport = useCallback(async (scope: "all" | "filtered" | "selected") => {
    setExporting(scope);
    try {
      let products: ProductWithRelations[];
      let filename: string;

      if (scope === "selected") {
        products = selectedProducts;
        filename = getExportFilename("selected");
      } else if (scope === "filtered") {
        products = await getProductsForExport(filters);
        filename = getExportFilename("filtered");
      } else {
        products = await getProductsForExport();
        filename = getExportFilename();
      }

      const blob = productsToXLSX(products, columnVisibility);
      downloadXLSX(blob, filename);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  }, [selectedProducts, filters, columnVisibility]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
        aria-label={t("export")}
      >
        <Download className="h-3.5 w-3.5" />
        <span>{t("export")}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[240px]"
            >
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border mb-1">
                {t("exportData")}
              </div>

              {/* All catalog */}
              <button
                onClick={() => handleExport("all")}
                disabled={exporting !== null}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
              >
                {exporting === "all" ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <Database className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <div>{t("exportAll")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("exportAllDesc", { count: totalCount })}
                  </div>
                </div>
              </button>

              {/* Filtered results — only show when filters are active */}
              {hasActiveFilters && (
                <button
                  onClick={() => handleExport("filtered")}
                  disabled={exporting !== null}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {exporting === "filtered" ? (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Filter className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div>{t("exportFiltered")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("exportFilteredDesc", { count: filteredCount })}
                    </div>
                  </div>
                </button>
              )}

              {/* Selected rows — only show when rows are selected */}
              {selectedProducts.length > 0 && (
                <button
                  onClick={() => handleExport("selected")}
                  disabled={exporting !== null}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {exporting === "selected" ? (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  ) : (
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div>{t("exportSelected")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("exportSelectedDesc", { count: selectedProducts.length })}
                    </div>
                  </div>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
