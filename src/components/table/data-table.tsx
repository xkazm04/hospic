"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { PackageX } from "lucide-react";
import { TablePagination } from "./table-pagination";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  pageCount: number;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export function DataTable<TData>({
  columns,
  data,
  pageCount,
  totalCount,
  currentPage,
  pageSize,
}: DataTableProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
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
          page: "1", // Reset to first page on sort change
        });
      }
    },
  });

  const handlePageChange = (newPage: number) => {
    updateURL({ page: String(newPage) });
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No products found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-table-header border-b border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <motion.tr
                key={row.id}
                initial={index < 15 ? { opacity: 0, y: -10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: index < 15 ? index * 0.02 : 0,
                  ease: "easeOut",
                }}
                className={`group border-b border-border last:border-b-0 transition-colors hover:bg-table-row-hover ${
                  index % 2 === 1 ? "bg-table-row-alt" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        currentPage={currentPage}
        totalPages={pageCount}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
