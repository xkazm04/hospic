"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, ArrowUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ProductWithRelations } from "@/lib/types";

export const columns: ColumnDef<ProductWithRelations>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 font-medium text-muted-foreground uppercase text-xs tracking-wide hover:text-foreground transition-colors"
      >
        Product
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => (
      <div className="min-w-[200px]">
        <div className="font-medium text-foreground">{row.original.name}</div>
        <div className="text-sm text-muted-foreground">{row.original.sku}</div>
      </div>
    ),
  },
  {
    accessorKey: "vendor",
    header: () => (
      <span className="font-medium text-muted-foreground uppercase text-xs tracking-wide">
        Vendor
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.vendor?.name || "-"}</span>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 font-medium text-muted-foreground uppercase text-xs tracking-wide hover:text-foreground transition-colors ml-auto"
      >
        Price
        <ArrowUpDown className="h-3 w-3" />
      </button>
    ),
    cell: ({ row }) => {
      const price = row.original.price;
      if (price === null || price === undefined) {
        return <span className="text-sm text-muted-foreground text-right block">-</span>;
      }
      const formatted = new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
      return (
        <span className="text-sm font-medium tabular-nums text-right block">
          {formatted}
        </span>
      );
    },
  },
  {
    accessorKey: "emdn_category",
    header: () => (
      <span className="font-medium text-muted-foreground uppercase text-xs tracking-wide">
        Category
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.emdn_category?.name || "-"}</span>
    ),
  },
  {
    id: "actions",
    header: () => null,
    cell: () => (
      <DropdownMenu
        trigger={<MoreVertical className="h-4 w-4 text-muted-foreground" />}
        align="right"
      >
        <DropdownMenuItem disabled>View details</DropdownMenuItem>
      </DropdownMenu>
    ),
    size: 40,
  },
];
