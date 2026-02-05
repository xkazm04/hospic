"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  Row,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useState, useCallback, useRef, useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
// Removed motion for performance - row animations caused jank with virtual scrolling
import { PackageX } from "lucide-react";
import { TablePagination } from "./table-pagination";
import {
  ColumnVisibilityToggle,
  useColumnVisibility,
  type ColumnVisibility,
} from "./column-visibility-toggle";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  pageCount: number;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
}

// Row height for virtual scrolling calculations
const ROW_HEIGHT = 52;

export function DataTable<TData>({
  columns,
  data,
  pageCount,
  totalCount,
  currentPage,
  pageSize,
  columnVisibility,
  onColumnVisibilityChange,
}: DataTableProps<TData>) {
  const t = useTranslations("table");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Derive sorting state from URL
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = searchParams.get("sortOrder") || "asc";
  const [sorting, setSorting] = useState<SortingState>([
    { id: sortBy, desc: sortOrder === "desc" },
  ]);

  const updateURL = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      // Use startTransition to keep UI responsive during navigation
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: {
      sorting,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
      if (newSorting.length > 0) {
        updateURL({
          sortBy: newSorting[0].id,
          sortOrder: newSorting[0].desc ? "desc" : "asc",
          page: "1",
        });
      }
    },
  });

  const { rows } = table.getRowModel();

  // Virtual scrolling for performance with large datasets
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12, // Render 12 extra rows above/below viewport for smoother scrolling
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Calculate padding for virtual scroll
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateURL({ page: String(newPage) });
      // Scroll to top when page changes
      tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateURL]
  );

  if (data.length === 0) {
    return (
      <div className="space-y-3">
        {/* Header with column toggle */}
        <div className="flex justify-end">
          <ColumnVisibilityToggle
            visibility={columnVisibility}
            onChange={onColumnVisibilityChange}
          />
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center bg-background border border-border rounded-lg">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <PackageX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("noProductsFound")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t("adjustFilters")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with total count and column toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("showingTotal", { count: data.length, total: totalCount.toLocaleString() })}
        </div>
        <ColumnVisibilityToggle
          visibility={columnVisibility}
          onChange={onColumnVisibilityChange}
        />
      </div>

      {/* Table container */}
      <div className="flex flex-col bg-background border border-border/60 rounded-lg shadow-md overflow-hidden ring-1 ring-green-border/20">
        {/* Scrollable table area with virtual scrolling */}
        <div
          ref={tableContainerRef}
          className="overflow-auto"
          style={{ maxHeight: "calc(100vh - 320px)", minHeight: "400px" }}
        >
          <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10 bg-table-header border-b-2 border-green-border shadow-md backdrop-blur-none">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as { width?: string } | undefined;
                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left first:pl-4 last:pr-4"
                        style={{
                          width: meta?.width,
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {/* Top padding for virtual scroll */}
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
                </tr>
              )}

              {/* Virtualized rows - no animation for performance */}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index] as Row<TData>;

                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    className="group transition-colors duration-150 hover:bg-green-light/20"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 first:pl-4 last:pr-4 align-top"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Bottom padding for virtual scroll */}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pageCount}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}

// Export hook for external use
export { useColumnVisibility };
