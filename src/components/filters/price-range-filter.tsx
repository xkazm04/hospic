"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounceValue } from "usehooks-ts";

export function PriceRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");

  const [debouncedMin] = useDebounceValue(minPrice, 500);
  const [debouncedMax] = useDebounceValue(maxPrice, 500);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedMin) {
      params.set("minPrice", debouncedMin);
    } else {
      params.delete("minPrice");
    }

    if (debouncedMax) {
      params.set("maxPrice", debouncedMax);
    } else {
      params.delete("maxPrice");
    }

    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`);
  }, [debouncedMin, debouncedMax, router, searchParams]);

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Min"
          min="0"
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
        />
      </div>
      <div className="flex items-center text-muted-foreground">-</div>
      <div className="flex-1">
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Max"
          min="0"
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
        />
      </div>
    </div>
  );
}
