"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Vendor } from "@/lib/types";

interface VendorFilterProps {
  vendors: Vendor[];
}

export function VendorFilter({ vendors }: VendorFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedVendors = searchParams.get("vendor")?.split(",").filter(Boolean) || [];

  const handleChange = (vendorId: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    let newSelected: string[];

    if (checked) {
      newSelected = [...selectedVendors, vendorId];
    } else {
      newSelected = selectedVendors.filter((id) => id !== vendorId);
    }

    if (newSelected.length > 0) {
      params.set("vendor", newSelected.join(","));
    } else {
      params.delete("vendor");
    }
    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`);
  };

  if (vendors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No vendors available</p>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {vendors.map((vendor) => (
        <label
          key={vendor.id}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selectedVendors.includes(vendor.id)}
            onChange={(e) => handleChange(vendor.id, e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
          />
          <span className="text-sm text-foreground group-hover:text-accent transition-colors">
            {vendor.name}
          </span>
        </label>
      ))}
    </div>
  );
}
